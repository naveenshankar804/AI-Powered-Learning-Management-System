const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');

router.post('/', submissionController.submitCode);
router.get('/', submissionController.listSubmissions);
router.get('/:id', submissionController.getSubmissionStatus);
router.post('/:id/replay', submissionController.replaySubmissionEvaluation);
router.get('/:id/progress', submissionController.getSubmissionProgress);
router.get('/:id/result', submissionController.getSubmissionResult);
router.get('/:id/artifacts/:filename', submissionController.getSubmissionArtifact);

module.exports = router;
