const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/whitelist', adminController.getWhitelist);
router.post('/whitelist', adminController.addWhitelist);
router.delete('/whitelist/:id', adminController.removeWhitelist);

router.post('/evaluation_runs/:id/replay', adminController.replayEvaluation);
router.get('/evaluation_runs/:id', adminController.getEvaluationRunDetails);
router.get('/logs', adminController.getLogs);

module.exports = router;
