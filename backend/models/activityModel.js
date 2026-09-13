const { supabaseAdmin } = require('../config/supabaseClient');
const { calculateAvailability } = require('../utils/activityCapacity');

// Maps a DB row (canonical columns) to the response shape the frontend
// expects, including the old alias field names (category/location/date/...)
// so existing frontend JS keeps working without changes.
function normalizeActivityRow(row) {
  if (!row) return null;
  const maxParticipants = Number(row.slots || 20);

  return {
    id: row.id,
    report_id: row.report_id || null,
    title: row.title,
    description: row.description,
    type: row.type,
    category: row.type,
    city: row.city,
    location: row.city,
    latitude: row.latitude,
    longitude: row.longitude,
    activity_date: row.activity_date,
    date: row.activity_date,
    activity_time: row.activity_time,
    start_time: row.activity_time,
    slots: maxParticipants,
    max_participants: maxParticipants,
    status: row.status,
    severity: row.severity || 'medium',
    created_by: row.created_by || null,
    created_at: row.created_at,
    approval_source: row.report_id ? 'report' : null
  };
}

function buildDbPayload(data) {
  return {
    title: data.title || 'New activity',
    description: data.description || 'Marine activity.',
    type: data.type || data.category || 'General',
    city: data.city || data.location || 'Unknown',
    latitude: String(data.latitude ?? '0'),
    longitude: String(data.longitude ?? '0'),
    activity_date: data.activity_date || data.date || new Date().toISOString().slice(0, 10),
    activity_time: data.activity_time || data.start_time || 'TBD',
    slots: Number(data.slots || data.max_participants || 20),
    status: data.status || 'open',
    report_id: data.report_id || null,
    created_by: data.created_by || null,
    severity: data.severity || 'medium'
  };
}

async function getAllActivities() {
  const { data, error } = await supabaseAdmin.from('activities').select('*').order('activity_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data.map(normalizeActivityRow);
}

async function getActivityById(id) {
  const { data, error } = await supabaseAdmin.from('activities').select('*').eq('id', id).single();
  if (error || !data) return null;
  return normalizeActivityRow(data);
}

async function getActivityByReportId(reportId, fallbackId = null) {
  const { data } = await supabaseAdmin.from('activities').select('*').eq('report_id', reportId).order('id', { ascending: false }).limit(1).single();
  if (data) return normalizeActivityRow(data);
  if (fallbackId) return getActivityById(fallbackId);
  return null;
}

async function getJoinedActivities(user_id) {
  const { data, error } = await supabaseAdmin
    .from('activity_participants')
    .select('status, activities(*)')
    .eq('user_id', user_id);
  if (error) throw new Error(error.message);
  return data.map((row) => ({ ...normalizeActivityRow(row.activities), participant_status: row.status }));
}

async function createActivity(data) {
  const payload = buildDbPayload(data);
  const { data: inserted, error } = await supabaseAdmin.from('activities').insert(payload).select('id').single();
  if (error) throw new Error(error.message);
  return getActivityById(inserted.id);
}

async function updateActivity(id, data) {
  const payload = buildDbPayload(data);
  const { error } = await supabaseAdmin.from('activities').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
  return getActivityById(id);
}

async function deleteActivity(id) {
  await supabaseAdmin.from('activity_participants').delete().eq('activity_id', id);
  await supabaseAdmin.from('activities').delete().eq('id', id);
}

async function syncActivityFromReport(report) {
  if (!report || !report.id) return null;

  const normalizedStatus = String(report.status || 'pending').toLowerCase();
  if (normalizedStatus !== 'approved') {
    await supabaseAdmin.from('activities').delete().eq('report_id', report.id);
    return null;
  }

  const payload = buildDbPayload({
    title: report.title,
    type: report.type,
    city: report.location,
    latitude: report.latitude,
    longitude: report.longitude,
    activity_date: report.observed_date,
    activity_time: 'TBD',
    slots: 20,
    status: 'open',
    description: report.description,
    report_id: report.id,
    severity: report.severity
  });

  const { data: existing } = await supabaseAdmin.from('activities').select('id').eq('report_id', report.id).maybeSingle();

  if (existing) {
    await supabaseAdmin.from('activities').update(payload).eq('report_id', report.id);
    return getActivityByReportId(report.id);
  }

  const { data: inserted, error } = await supabaseAdmin.from('activities').insert(payload).select('id').single();
  if (error) throw new Error(error.message);
  return getActivityByReportId(report.id, inserted.id);
}

async function deleteActivityByReportId(reportId) {
  await supabaseAdmin.from('activities').delete().eq('report_id', reportId);
}

async function joinActivity(activity_id, user_id, role) {
  const { data: activity, error: fetchError } = await supabaseAdmin.from('activities').select('*').eq('id', activity_id).single();
  if (fetchError || !activity) throw new Error('Activity not found');
  if ((activity.status || '').toLowerCase() === 'closed') throw new Error('Activity closed');

  const { data: existing } = await supabaseAdmin
    .from('activity_participants')
    .select('id')
    .eq('activity_id', activity_id)
    .eq('user_id', user_id)
    .maybeSingle();
  if (existing) throw new Error('You already joined this activity');

  const maxParticipants = Number(activity.slots || 20);
  const { count } = await supabaseAdmin
    .from('activity_participants')
    .select('*', { count: 'exact', head: true })
    .eq('activity_id', activity_id);
  const participantCount = count || 0;
  if (participantCount >= maxParticipants) throw new Error('Activity is full');

  const { error: insertError } = await supabaseAdmin
    .from('activity_participants')
    .insert({ activity_id, user_id, role, status: 'confirmed' });
  if (insertError) {
    if (insertError.code === '23505') throw new Error('You already joined this activity');
    throw new Error(insertError.message);
  }

  const nextCount = participantCount + 1;
  const nextStatus = nextCount >= maxParticipants ? 'closed' : 'open';
  await supabaseAdmin.from('activities').update({ status: nextStatus }).eq('id', activity_id);

  return {
    id: activity_id,
    available_spots: Math.max(0, maxParticipants - nextCount),
    registered_users: nextCount
  };
}

async function leaveActivity(activity_id, user_id) {
  await supabaseAdmin.from('activity_participants').delete().eq('activity_id', activity_id).eq('user_id', user_id);

  const { data: activity } = await supabaseAdmin.from('activities').select('status, slots').eq('id', activity_id).single();
  if (activity && (activity.status || '').toLowerCase() === 'closed') {
    const { count } = await supabaseAdmin
      .from('activity_participants')
      .select('*', { count: 'exact', head: true })
      .eq('activity_id', activity_id);
    if ((count || 0) < Number(activity.slots || 20)) {
      await supabaseAdmin.from('activities').update({ status: 'open' }).eq('id', activity_id);
    }
  }
}

async function getParticipantCount(activity_id) {
  const { count } = await supabaseAdmin
    .from('activity_participants')
    .select('*', { count: 'exact', head: true })
    .eq('activity_id', activity_id);
  return count || 0;
}

async function getActivityParticipants(activity_id) {
  const { data, error } = await supabaseAdmin
    .from('activity_participants')
    .select('user_id, role, status, joined_at')
    .eq('activity_id', activity_id)
    .order('joined_at', { ascending: true });
  if (error) throw new Error(error.message);

  const ids = data.map((r) => r.user_id);
  const { data: profiles } = ids.length
    ? await supabaseAdmin.from('profiles').select('id, full_name, email, role').in('id', ids)
    : { data: [] };
  const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

  return data.map((row) => ({
    id: row.user_id,
    name: byId[row.user_id]?.full_name || `User ${row.user_id}`,
    email: byId[row.user_id]?.email || '',
    role: row.role || byId[row.user_id]?.role || 'volunteer',
    status: row.status || 'confirmed',
    joined_at: row.joined_at || null
  }));
}

async function getActivityStats() {
  const { count } = await supabaseAdmin.from('activities').select('*', { count: 'exact', head: true });
  return { totalActivities: count || 0 };
}

module.exports = {
  getAllActivities,
  getActivityById,
  getJoinedActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  syncActivityFromReport,
  deleteActivityByReportId,
  joinActivity,
  leaveActivity,
  getParticipantCount,
  getActivityParticipants,
  getActivityStats
};
