const request = require('supertest');
const app = require('../../app');

const { sequelize } = require('../../src/models');
const { closeQueues } = require('../../src/services/queueService');

describe('Healthcheck Endpoint', () => {
  afterAll(async () => {
    await sequelize.close();
    await closeQueues();
  });

  it('should return 200 and a status message', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      message: 'Assessment Engine API is running'
    });
  });
});
