const { User } = require('../models');

/**
 * Updates the user's streak based on their last activity.
 * @param {string} userId - The user's ID.
 */
async function updateStreak(userId) {
  const user = await User.findByPk(userId);
  if (!user) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActivity = user.last_activity_date ? new Date(user.last_activity_date) : null;
  if (lastActivity) {
    lastActivity.setHours(0, 0, 0, 0);
  }

  // If already active today, just update last_activity_date (refresh timestamp)
  if (lastActivity && lastActivity.getTime() === today.getTime()) {
    await user.update({ last_activity_date: new Date() });
    return user;
  }

  // Check if it's a consecutive day
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (lastActivity && lastActivity.getTime() === yesterday.getTime()) {
    // Consecutive day!
    const newStreak = user.current_streak + 1;
    await user.update({
      current_streak: newStreak,
      highest_streak: Math.max(newStreak, user.highest_streak),
      last_activity_date: new Date()
    });
  } else {
    // Strak broken or first time
    await user.update({
      current_streak: 1,
      last_activity_date: new Date()
    });
  }

  return user;
}

module.exports = { updateStreak };
