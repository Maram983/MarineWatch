const { supabaseAdmin } = require('../config/supabaseClient');
const activityModel = require('./activityModel');

// Attaches full_name/email from profiles onto each report row (mimics the
// old SQL JOIN, since Supabase's JS client doesn't join across auth.users).
async function attachReporterInfo(reports) {
  const list = Array.isArray(reports) ? reports : [reports];
  const ids = [...new Set(list.filter(Boolean).map((r) => r.user_id))];
  if (ids.length === 0) return reports;

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, phone, city, certification_number, account_status')
    .in('id', ids);

  const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
  const withReporter = list.map((r) => (r ? { ...r, ...(byId[r.user_id] ? {
    full_name: byId[r.user_id].full_name,
    email: byId[r.user_id].email
  } : {}) } : r));

  return Array.isArray(reports) ? withReporter : withReporter[0];
}

async function createReport(data) {
  const {
    user_id, title, type, description, observed_date, severity,
    affected_area, esi_score,
    latitude, longitude, location, status
  } = data;

  const { data: inserted, error } = await supabaseAdmin
    .from('reports')
    .insert({
      user_id, title, type, description,
      observed_date: observed_date || null,
      severity: severity || 'medium',
      affected_area: affected_area || null,
      esi_score: esi_score ?? null,
      latitude, longitude,
      location: location || null,
      status: status || 'pending'
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return inserted.id;
}

// image_path is now a Supabase Storage path (see uploadMiddleware usage in the controller).
async function createImage(report_id, image_path) {
  const { error } = await supabaseAdmin.from('report_images').insert({ report_id, image_path });
  if (error) throw new Error(error.message);
}

async function getAllReports() {
  const { data, error } = await supabaseAdmin.from('reports').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return attachReporterInfo(data);
}

async function getReportById(id) {
  const { data, error } = await supabaseAdmin.from('reports').select('*').eq('id', id).single();
  if (error || !data) return null;
  return attachReporterInfo(data);
}

async function getReportsByUser(user_id) {
  const { data, error } = await supabaseAdmin.from('reports').select('*').eq('user_id', user_id).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return attachReporterInfo(data);
}

async function getApprovedReports() {
  const { data, error } = await supabaseAdmin.from('reports').select('*').eq('status', 'approved').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return attachReporterInfo(data);
}

async function getReportReporter(report_id) {
  const report = await getReportById(report_id);
  if (!report) return null;
  const { data } = await supabaseAdmin.from('profiles').select('*').eq('id', report.user_id).single();
  return data || null;
}

async function updateReportStatus(id, status) {
  const { error } = await supabaseAdmin.from('reports').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
  const updatedReport = await getReportById(id);
  await activityModel.syncActivityFromReport(updatedReport);
  return updatedReport;
}

// Lets an admin override the computed severity level during review
// (the esi_score is left untouched as a record of the original calculation).
async function updateReportSeverity(id, severity) {
  const { error } = await supabaseAdmin.from('reports').update({ severity }).eq('id', id);
  if (error) throw new Error(error.message);
  return getReportById(id);
}

async function deleteReport(id) {
  await supabaseAdmin.from('reports').delete().eq('id', id);
  await activityModel.deleteActivityByReportId(id);
}

async function getImagesForReport(report_id) {
  const { data, error } = await supabaseAdmin.from('report_images').select('*').eq('report_id', report_id).order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

async function getReportCountByStatus(status) {
  const { count } = await supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('status', status);
  return count || 0;
}

async function getReportCount() {
  const { count } = await supabaseAdmin.from('reports').select('*', { count: 'exact', head: true });
  return count || 0;
}

async function getReportCounts() {
  const [totalReports, pendingReports, approvedReports, rejectedReports] = await Promise.all([
    getReportCount(),
    getReportCountByStatus('pending'),
    getReportCountByStatus('approved'),
    getReportCountByStatus('rejected')
  ]);
  return { totalReports, pendingReports, approvedReports, rejectedReports };
}

module.exports = {
  createReport,
  createImage,
  getAllReports,
  getReportById,
  getReportsByUser,
  getApprovedReports,
  updateReportStatus,
  updateReportSeverity,
  deleteReport,
  getImagesForReport,
  getReportCountByStatus,
  getReportCount,
  getReportCounts,
  getReportReporter
};
