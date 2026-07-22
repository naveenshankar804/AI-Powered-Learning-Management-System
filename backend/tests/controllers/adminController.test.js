const {
  getWhitelist,
  addWhitelist,
  removeWhitelist,
  replayEvaluation,
  getLogs,
  getEvaluationRunDetails
} = require('../../src/controllers/adminController');
const { WhitelistDomain, Submission, EvaluationRun, Artifact } = require('../../src/models');
const { enqueueEvaluation } = require('../../src/services/queueService');

jest.mock('../../src/models', () => ({
  WhitelistDomain: {
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn()
  },
  Submission: {
    update: jest.fn()
  },
  EvaluationRun: {
    findByPk: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn()
  },
  Artifact: {}
}));

jest.mock('../../src/services/queueService', () => ({
  enqueueEvaluation: jest.fn()
}));

describe('adminController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {}
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('getWhitelist', () => {
    it('should return domains on success', async () => {
      const mockDomains = [{ id: 1, domain: 'example.com' }];
      WhitelistDomain.findAll.mockResolvedValue(mockDomains);

      await getWhitelist(req, res);

      expect(WhitelistDomain.findAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockDomains);
    });

    it('should return 500 on error', async () => {
      WhitelistDomain.findAll.mockRejectedValue(new Error('DB error'));

      await getWhitelist(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
    });
  });

  describe('addWhitelist', () => {
    it('should return 400 if domain is missing', async () => {
      await addWhitelist(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'domain required' });
    });

    it('should return 400 if domain format is invalid', async () => {
      req.body = { domain: 'invalid_domain' };
      await addWhitelist(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'invalid domain format' });
    });

    it('should return 201 on successful creation', async () => {
      req.body = { domain: 'newdomain.com' };
      const newDomain = { id: 2, domain: 'newdomain.com' };
      WhitelistDomain.create.mockResolvedValue(newDomain);

      await addWhitelist(req, res);

      expect(WhitelistDomain.create).toHaveBeenCalledWith({ domain: 'newdomain.com' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newDomain);
    });

    it('should return 500 on error', async () => {
      req.body = { domain: 'error.com' };
      WhitelistDomain.create.mockRejectedValue(new Error('Create error'));

      await addWhitelist(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Create error' });
    });
  });

  describe('removeWhitelist', () => {
    it('should delete domain and return success', async () => {
      req.params = { id: 1 };
      WhitelistDomain.destroy.mockResolvedValue(1);

      await removeWhitelist(req, res);

      expect(WhitelistDomain.destroy).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('should return 500 on error', async () => {
      req.params = { id: 1 };
      WhitelistDomain.destroy.mockRejectedValue(new Error('Delete error'));

      await removeWhitelist(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Delete error' });
    });
  });

  describe('replayEvaluation', () => {
    it('should return 404 if evaluation run not found', async () => {
      req.params = { id: 999 };
      EvaluationRun.findByPk.mockResolvedValue(null);

      await replayEvaluation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Evaluation Run not found' });
    });

    it('should replay successfully', async () => {
      req.params = { id: 1 };
      const mockRun = { id: 1, submission_id: 10 };
      const mockReplayRun = { id: 2 };

      EvaluationRun.findByPk.mockResolvedValue(mockRun);
      EvaluationRun.create.mockResolvedValue(mockReplayRun);
      enqueueEvaluation.mockResolvedValue();
      Submission.update.mockResolvedValue([1]);

      await replayEvaluation(req, res);

      expect(EvaluationRun.create).toHaveBeenCalledWith(expect.objectContaining({ submission_id: 10 }));
      expect(enqueueEvaluation).toHaveBeenCalledWith(10, 2);
      expect(Submission.update).toHaveBeenCalledWith({ status: 'pending' }, { where: { id: 10 } });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Replay successfully queued',
        submission_id: 10,
        run_id: 2
      });
    });

    it('should return 500 on error', async () => {
      req.params = { id: 1 };
      EvaluationRun.findByPk.mockRejectedValue(new Error('Replay error'));

      await replayEvaluation(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Replay error' });
    });
  });

  describe('getLogs', () => {
    it('should return logs successfully', async () => {
      const mockLogs = [{ id: 1 }, { id: 2 }];
      EvaluationRun.findAll.mockResolvedValue(mockLogs);

      await getLogs(req, res);

      expect(EvaluationRun.findAll).toHaveBeenCalledWith({
        order: [['created_at', 'DESC']],
        limit: 100
      });
      expect(res.json).toHaveBeenCalledWith(mockLogs);
    });

    it('should return 500 on error', async () => {
      EvaluationRun.findAll.mockRejectedValue(new Error('Find error'));

      await getLogs(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Find error' });
    });
  });

  describe('getEvaluationRunDetails', () => {
    it('should return 404 if evaluation run not found', async () => {
      req.params = { id: 999 };
      EvaluationRun.findByPk.mockResolvedValue(null);

      await getEvaluationRunDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Evaluation Run not found' });
    });

    it('should return details successfully', async () => {
      req.params = { id: 1 };
      const mockRun = {
        id: 1,
        Submission: { id: 10 },
        Artifacts: [{ id: 100 }]
      };
      EvaluationRun.findByPk.mockResolvedValue(mockRun);

      await getEvaluationRunDetails(req, res);

      expect(EvaluationRun.findByPk).toHaveBeenCalledWith(1, {
        include: [
          { model: Submission },
          { model: Artifact }
        ]
      });
      expect(res.json).toHaveBeenCalledWith({
        run: mockRun,
        submission: mockRun.Submission,
        artifacts: mockRun.Artifacts
      });
    });

    it('should return 500 on error', async () => {
      req.params = { id: 1 };
      EvaluationRun.findByPk.mockRejectedValue(new Error('Details error'));

      await getEvaluationRunDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Details error' });
    });
  });
});