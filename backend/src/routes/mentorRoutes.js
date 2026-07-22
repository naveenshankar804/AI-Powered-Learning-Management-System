const express = require('express');
const router = express.Router();
const { getPerformance, getDailyPlan, getRecommendations, mentorChat } = require('../controllers/mentorController');

router.get('/performance/:studentId', getPerformance);
router.post('/daily-plan', getDailyPlan);
router.get('/recommendations/:studentId', getRecommendations);
router.post('/chat', mentorChat);

module.exports = router;
