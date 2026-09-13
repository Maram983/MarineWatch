const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const reportModel = require('../models/reportModel');
const userModel = require('../models/userModel');
const activityModel = require('../models/activityModel');

router.get('/reports', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const reports = await reportModel.getAllReports();
    res.json(reports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load reports' });
  }
});

router.get('/reports/approved', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const reports = await reportModel.getApprovedReports();
    res.json(reports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load approved reports' });
  }
});

router.put('/reports/:id/approve', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    await reportModel.updateReportStatus(req.params.id, 'approved');
    res.json({ message: 'Report approved' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not approve report' });
  }
});

router.put('/reports/:id/reject', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    await reportModel.updateReportStatus(req.params.id, 'rejected');
    res.json({ message: 'Report rejected' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not reject report' });
  }
});

router.put('/reports/:id/severity', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const { severity } = req.body;
    const allowedSeverities = ['low', 'medium', 'high'];
    if (!severity || !allowedSeverities.includes(severity)) {
      return res.status(400).json({ message: 'Invalid severity value' });
    }
    const report = await reportModel.updateReportSeverity(req.params.id, severity);
    res.json({ message: 'Severity updated', report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not update severity' });
  }
});

router.put('/reports/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['pending', 'approved', 'rejected', 'investigating', 'resolved'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    await reportModel.updateReportStatus(req.params.id, status);
    res.json({ message: 'Report updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not update report' });
  }
});

router.get('/activities', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const activities = await activityModel.getAllActivities();
    const activitiesWithCounts = await Promise.all(
      activities.map(async (activity) => {
        const registeredUsers = await activityModel.getParticipantCount(activity.id);
        return {
          ...activity,
          filled: registeredUsers,
          registered_users: registeredUsers,
          participant_count: registeredUsers
        };
      })
    );
    res.json(activitiesWithCounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load activities' });
  }
});

router.post('/activities', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.report_id) {
      const report = await reportModel.getReportById(payload.report_id);
      if (report) {
        payload.title = payload.title || report.title;
        payload.description = payload.description || report.description;
        payload.category = payload.category || report.type;
        payload.location = payload.location || report.location;
        payload.latitude = payload.latitude ?? report.latitude;
        payload.longitude = payload.longitude ?? report.longitude;
        payload.date = payload.date || report.observed_date || report.created_at;
        payload.severity = payload.severity || report.severity;
      }
    }
    const activity = await activityModel.createActivity(payload);
    res.status(201).json(activity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not create activity' });
  }
});

router.put('/activities/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const activity = await activityModel.updateActivity(req.params.id, req.body);
    res.json(activity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not update activity' });
  }
});

router.delete('/activities/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    await activityModel.deleteActivity(req.params.id);
    res.json({ message: 'Activity deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not delete activity' });
  }
});

router.get('/activities/:id/participants', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const participants = await activityModel.getActivityParticipants(req.params.id);
    res.json(participants);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load activity participants' });
  }
});

router.get('/users', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const users = await userModel.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load users' });
  }
});

router.get('/stats', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const users = await userModel.getDashboardStats();
    const reports = await reportModel.getReportCounts();
    const activities = await activityModel.getActivityStats();
    res.json({ users, reports, activities });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load admin stats' });
  }
});

module.exports = router;
