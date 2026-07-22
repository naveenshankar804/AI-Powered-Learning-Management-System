const express = require('express');
const router = express.Router();
const { getTopics, generateQuestionsHandler, generateAndSave, getQuestionBank, getAIStatus } = require('../controllers/aiQuestionController');

router.get('/status', getAIStatus);
router.get('/topics', getTopics);
router.post('/generate-questions', generateQuestionsHandler);
router.post('/generate-and-save', generateAndSave);
router.get('/question-bank', getQuestionBank);

module.exports = router;
