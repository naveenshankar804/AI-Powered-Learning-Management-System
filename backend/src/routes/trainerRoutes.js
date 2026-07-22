const express = require('express');
const router = express.Router();
const trainerController = require('../controllers/trainerController');

router.get('/analytics/questions/:questionId', trainerController.getQuestionAnalytics);
router.post('/questions', trainerController.createQuestion);
router.get('/questions/:questionId/draft', trainerController.getQuestionDraft);
router.put('/questions/:questionId/draft', trainerController.saveQuestionDraft);

module.exports = router;
