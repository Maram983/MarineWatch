const activityModel = require('../models/activityModel');
const reportModel = require('../models/reportModel');
const { calculateAvailability } = require('../utils/activityCapacity');

function buildActivityPayload(activity, registeredUsers) {
  const { availableSpots, filled } = calculateAvailability(activity.slots, registeredUsers);

  return {
    ...activity,
    filled,
    registered_users: filled,
    available_spots: availableSpots
  };
}

async function getActivities(req, res) {
  try {
    const activities = await activityModel.getAllActivities();

    const activitiesWithFilled = await Promise.all(activities.map(async (activity) => {
      const registeredUsers = await activityModel.getParticipantCount(activity.id);
      return {
        ...buildActivityPayload(activity, registeredUsers),
        participant_count: registeredUsers
      };
    }));

    res.json(activitiesWithFilled);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load activities' });
  }
}

async function getActivityDetails(req, res) {
  try {
    const activity = await activityModel.getActivityById(req.params.id);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    const registeredUsers = await activityModel.getParticipantCount(activity.id);
    res.json(buildActivityPayload(activity, registeredUsers));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load activity' });
  }
}

async function getActivitiesMap(req, res) {
  try {
    const [activities, approvedReports] = await Promise.all([
      activityModel.getAllActivities(),
      reportModel.getApprovedReports()
    ]);

    const mappedActivities = activities.map((activity) => ({
      id: activity.id,
      title: activity.title,
      type: activity.type,
      location: activity.city,
      description: activity.description,
      date: activity.activity_date,
      status: activity.status,
      severity: activity.severity || activity.report_severity || 'medium',
      latitude: activity.latitude,
      longitude: activity.longitude,
      lat: activity.latitude,
      lng: activity.longitude,
      isActivity: true,
      report_id: activity.report_id || null,
      approval_source: activity.approval_source || null,
      related_activity: activity.report_id ? { id: activity.id, title: activity.title } : null
    }));

    const mappedReports = approvedReports.map((report) => ({
      id: report.id,
      title: report.title,
      type: report.type,
      location: report.location,
      description: report.description,
      date: report.observed_date || report.created_at,
      severity: report.severity,
      status: report.status,
      latitude: report.latitude,
      longitude: report.longitude,
      lat: report.latitude,
      lng: report.longitude,
      isActivity: false,
      report_id: report.id,
      approval_source: 'report',
      related_activity: null
    }));

    res.json([...mappedActivities, ...mappedReports]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load map activities' });
  }
}

async function joinActivity(req, res) {
  try {
    const role = String(req.user.role || '').toLowerCase();
    if (!['diver', 'volunteer'].includes(role)) {
      return res.status(403).json({ message: 'Only divers and volunteers can join activities' });
    }

    const result = await activityModel.joinActivity(req.params.id, req.user.id, role);
    res.status(201).json({ message: 'Activity joined successfully', activity: result });
  } catch (error) {
    console.error(error);
    if (error.message === 'Activity is full') {
      return res.status(409).json({ message: 'Activity is full' });
    }
    if (error.message === 'Activity closed') {
      return res.status(409).json({ message: 'Activity is closed' });
    }
    if (error.message === 'You already joined this activity') {
      return res.status(409).json({ message: 'You already joined this activity' });
    }
    if (error.message === 'Activity not found') {
      return res.status(404).json({ message: 'Activity not found' });
    }
    res.status(500).json({ message: 'Could not join activity' });
  }
}

async function leaveActivity(req, res) {
  try {
    await activityModel.leaveActivity(req.params.id, req.user.id);
    res.json({ message: 'Activity left successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not leave activity' });
  }
}

async function getJoinedActivities(req, res) {
  try {
    const activities = await activityModel.getJoinedActivities(req.user.id);
    res.json(activities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load joined activities' });
  }
}

module.exports = {
  getActivities,
  getActivityDetails,
  getActivitiesMap,
  joinActivity,
  leaveActivity,
  getJoinedActivities
};
