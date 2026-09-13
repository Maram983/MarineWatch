function buildActivityDataFromReport(report) {
  const reportId = report?.id ?? report?.report_id ?? null;
  const title = String(report?.title || 'Approved report activity').trim();
  const type = String(report?.type || 'General').trim();
  const location = String(report?.location || 'Unknown location').trim();
  const description = String(report?.description || 'Marine report activity created from an approved report.').trim();
  const latitude = report?.latitude ?? report?.lat ?? null;
  const longitude = report?.longitude ?? report?.lng ?? null;
  const activityDate = report?.observed_date || report?.activity_date || report?.date || new Date().toISOString().slice(0, 10);
  const activityTime = report?.activity_time || 'TBD';

  return {
    title,
    type,
    city: location,
    latitude,
    longitude,
    activity_date: activityDate,
    activity_time: activityTime,
    slots: Number(report?.slots || 20),
    status: 'open',
    description,
    report_id: reportId,
    approval_source: 'report',
    report_status: 'approved'
  };
}

module.exports = {
  buildActivityDataFromReport
};
