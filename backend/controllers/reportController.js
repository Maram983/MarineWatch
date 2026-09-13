const reportModel = require('../models/reportModel');
const upload = require('../middleware/uploadMiddleware');
const { supabaseAdmin } = require('../config/supabaseClient');
const { calculateESI, ALLOWED_AREAS } = require('../utils/esiCalculator');

async function uploadImageToStorage(file, reportId) {
  const uniqueName = `${reportId}/${Date.now()}-${Math.round(Math.random() * 1e9)}${require('path').extname(file.originalname)}`;
  const { error } = await supabaseAdmin.storage
    .from('report-images')
    .upload(uniqueName, file.buffer, { contentType: file.mimetype });

  if (error) throw new Error(error.message);

  const { data } = supabaseAdmin.storage.from('report-images').getPublicUrl(uniqueName);
  return data.publicUrl;
}

async function createReport(req, res) {
  try {
    const {
      title, type, pollution_type, description, observed_date, date,
      affected_area, latitude, longitude, location
    } = req.body;

    const reportType = type || pollution_type || 'General';
    const reportDate = observed_date || date || null;
    const reportAffectedArea = (affected_area || 'small').toLowerCase();

    if (!title || !description || !latitude || !longitude) {
      return res.status(400).json({ message: 'Please complete the required fields' });
    }
    if (!ALLOWED_AREAS.includes(reportAffectedArea)) {
      return res.status(400).json({ message: 'Invalid affected area value' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // Severity is never trusted from the client — it's computed from the
    // pollution type (environmental impact) and affected area via the ESI model.
    const { esi_score, severity: computedSeverity } = calculateESI({
      type: reportType,
      affected_area: reportAffectedArea
    });

    const reportId = await reportModel.createReport({
      user_id: req.user.id,
      title: String(title).trim(),
      type: String(reportType).trim(),
      description: String(description).trim(),
      observed_date: reportDate || null,
      severity: computedSeverity,
      affected_area: reportAffectedArea,
      esi_score,
      latitude: lat.toString(),
      longitude: lng.toString(),
      location: location ? String(location).trim() : null,
      status: 'pending'
    });

    const uploadedFiles = [];
    if (req.files) {
      if (Array.isArray(req.files.images)) uploadedFiles.push(...req.files.images);
      if (Array.isArray(req.files.image)) uploadedFiles.push(...req.files.image);
    }

    const imagesToSave = uploadedFiles.slice(0, 3);
    if (imagesToSave.length === 0) {
      return res.status(400).json({ message: 'Please upload 1 to 3 images' });
    }

    for (const file of imagesToSave) {
      const publicUrl = await uploadImageToStorage(file, reportId);
      await reportModel.createImage(reportId, publicUrl);
    }

    res.status(201).json({
      message: 'Report submitted successfully',
      reportId,
      esi_score,
      severity: computedSeverity
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Report submission failed' });
  }
}

async function getReports(req, res) {
  try {
    const reports = req.user.role === 'admin'
      ? await reportModel.getAllReports()
      : await reportModel.getReportsByUser(req.user.id);
    res.json(reports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load reports' });
  }
}

async function getReportDetails(req, res) {
  try {
    const report = await reportModel.getReportById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (req.user.role !== 'admin' && report.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const images = await reportModel.getImagesForReport(report.id);
    const reporter = await reportModel.getReportReporter(req.params.id);
    res.json({ report, images, reporter });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load report' });
  }
}

async function getMapReports(req, res) {
  try {
    const reports = await reportModel.getApprovedReports();
    res.json(reports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load map reports' });
  }
}

async function updateReport(req, res) {
  try {
    const report = await reportModel.getReportById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    const allowedStatuses = ['pending', 'approved', 'rejected', 'investigating', 'resolved'];
    const { status } = req.body;
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can change report status' });
    }

    const updatedReport = await reportModel.updateReportStatus(req.params.id, status);
    res.json({ message: 'Report updated', report: updatedReport });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not update report' });
  }
}

async function deleteReport(req, res) {
  try {
    const report = await reportModel.getReportById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (report.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await reportModel.deleteReport(req.params.id);
    res.json({ message: 'Report deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not delete report' });
  }
}

module.exports = {
  createReport,
  getReports,
  getReportDetails,
  getMapReports,
  updateReport,
  deleteReport,
  upload
};
