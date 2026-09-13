const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/', authMiddleware, upload.fields([{ name: 'images', maxCount: 3 }, { name: 'image', maxCount: 3 }]), reportController.createReport);
router.get('/', authMiddleware, reportController.getReports);
router.get('/map', reportController.getMapReports);
router.get('/:id', authMiddleware, reportController.getReportDetails);
router.put('/:id', authMiddleware, reportController.updateReport);
router.delete('/:id', authMiddleware, reportController.deleteReport);

module.exports = router;
