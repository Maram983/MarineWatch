const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/map', activityController.getActivitiesMap);
router.get('/joined', authMiddleware, activityController.getJoinedActivities);
router.get('/', activityController.getActivities);
router.get('/:id', activityController.getActivityDetails);
router.post('/:id/join', authMiddleware, activityController.joinActivity);
router.delete('/:id/leave', authMiddleware, activityController.leaveActivity);

module.exports = router;
