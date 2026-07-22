const { updateStreak } = require('../../src/utils/streakManager');
const { User } = require('../../src/models');

jest.mock('../../src/models', () => ({
  User: {
    findByPk: jest.fn()
  }
}));

describe('streakManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize streak to 1 if no previous activity', async () => {
    const mockUser = {
      update: jest.fn()
    };
    User.findByPk.mockResolvedValue(mockUser);

    await updateStreak('user1');

    expect(User.findByPk).toHaveBeenCalledWith('user1');
    expect(mockUser.update).toHaveBeenCalledWith(expect.objectContaining({
      current_streak: 1,
      last_activity_date: expect.any(Date)
    }));
  });

  it('should increment streak if active consecutively', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const mockUser = {
      last_activity_date: yesterday,
      current_streak: 2,
      highest_streak: 2,
      update: jest.fn()
    };
    User.findByPk.mockResolvedValue(mockUser);

    await updateStreak('user1');

    expect(mockUser.update).toHaveBeenCalledWith(expect.objectContaining({
      current_streak: 3,
      highest_streak: 3,
      last_activity_date: expect.any(Date)
    }));
  });
});
