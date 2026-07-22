const express = require('express');
const router = express.Router();

const questionController = require('../controllers/questionController');

router.get('/', questionController.listQuestions);
router.post('/', questionController.createQuestion);
router.get('/:id', questionController.getQuestionDetails);
router.put('/:id', questionController.updateQuestion);
router.delete('/:id', questionController.deleteQuestion);
router.post('/:id/baseline', questionController.generateBaseline);

module.exports = router;
