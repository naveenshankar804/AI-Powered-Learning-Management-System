const {
  submitCode, listSubmissions, getSubmissionStatus,
  replaySubmissionEvaluation, getSubmissionProgress,
  getSubmissionResult, getSubmissionArtifact
} = require('../../src/controllers/submissionController');
const { Submission, Question, EvaluationRun, Artifact, User, TestSpec } = require('../../src/models');
const staticValidationService = require('../../src/services/staticValidationService');
const { enqueueEvaluation, queueEvents } = require('../../src/services/queueService');
const { updateStreak } = require('../../src/utils/streakManager');
const path = require('path');
const fs = require('fs');

jest.mock('../../src/models', () => ({
  Submission: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn()
  },
  Question: {
    findByPk: jest.fn()
  },
  EvaluationRun: {
    create: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn()
  },
  Artifact: {
    findOne: jest.fn()
  },
  User: {
    findByPk: jest.fn()
  },
  TestSpec: {
    findOne: jest.fn()
  }
}));

jest.mock('../../src/services/staticValidationService', () => ({
  validateSetup: jest.fn()
}));

jest.mock('../../src/services/queueService', () => ({
  enqueueEvaluation: jest.fn(),
  queueEvents: {
    on: jest.fn(),
    off: jest.fn()
  }
}));

jest.mock('../../src/utils/streakManager', () => ({
  updateStreak: jest.fn().mockResolvedValue()
}));

jest.mock('fs');
jest.mock('path');

describe('SubmissionController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      sendFile: jest.fn(),
      writeHead: jest.fn(),
      send: jest.fn(),
      type: jest.fn()
    };
    req = {
      body: {},
      params: {},
      query: {},
      header: jest.fn(),
      on: jest.fn()
    };
    req.header.mockImplementation((key) => {
      if (key.toLowerCase() === 'x-user-id') return '1';
      return null;
    });
    User.findByPk.mockResolvedValue({ id: '1', role: 'student' });
    path.basename.mockImplementation((p) => p);
    path.resolve.mockImplementation((...args) => args.join('/'));
    path.join.mockImplementation((...args) => args.join('/'));
  });

  describe('submitCode', () => {
    it('should return 400 if missing inputs', async () => {
      req.body = {};
      await submitCode(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    });

    it('should return 404 if question not found', async () => {
      req.body = { question_id: 1, student_id: '1' };
      Question.findByPk.mockResolvedValue(null);
      await submitCode(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Question not found' });
    });

    it('should handle static validation failure', async () => {
      req.body = { question_id: 1, student_id: '1', html_content: 'bad html', css_content: '', js_content: '' };
      Question.findByPk.mockResolvedValue({ id: 1 });
      staticValidationService.validateSetup.mockResolvedValue({ isValid: false, summary: {} });

      const mockSub = { id: 10, save: jest.fn(), update: jest.fn(), status: 'failed' };
      Submission.create.mockResolvedValue(mockSub);

      await submitCode(req, res);

      expect(Submission.create).toHaveBeenCalledWith(expect.objectContaining({
        status: 'failed'
      }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
    });

    it('should create submission and enqueue evaluation', async () => {
      req.body = { question_id: 1, student_id: '1', html_content: '<html>', css_content: '', js_content: '' };
      Question.findByPk.mockResolvedValue({ id: 1 });
      staticValidationService.validateSetup.mockResolvedValue({ isValid: true, summary: {} });
      const mockSub = { id: 10, save: jest.fn(), update: jest.fn(), status: 'pending' };
      Submission.create.mockResolvedValue(mockSub);
      enqueueEvaluation.mockResolvedValue();

      await submitCode(req, res);

      expect(Submission.create).toHaveBeenCalledWith(expect.objectContaining({
        status: 'pending'
      }));
      expect(enqueueEvaluation).toHaveBeenCalledWith(10);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ submission_id: 10, status: 'pending' }));
    });
  });

  describe('listSubmissions', () => {
    it('should return submissions based on query', async () => {
      req.query = { student_id: '1' };
      Submission.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      await listSubmissions(req, res);
      expect(Submission.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { student_id: '1' }
      }));
      expect(res.json).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('getSubmissionStatus', () => {
    it('should return 404 if submission not found', async () => {
      req.params.id = '1';
      Submission.findByPk.mockResolvedValue(null);
      await getSubmissionStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return submission status', async () => {
      req.params.id = '1';
      Submission.findByPk.mockResolvedValue({ id: 1, status: 'completed' });
      await getSubmissionStatus(req, res);
      expect(res.json).toHaveBeenCalledWith({ id: 1, status: 'completed' });
    });
  });

  describe('replaySubmissionEvaluation', () => {
    it('should require admin', async () => {
      User.findByPk.mockResolvedValue({ role: 'student' });
      await replaySubmissionEvaluation(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 if submission not found', async () => {
      User.findByPk.mockResolvedValue({ role: 'admin' });
      req.params.id = '1';
      Submission.findByPk.mockResolvedValue(null);
      await replaySubmissionEvaluation(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should enqueue evaluation for replay', async () => {
      User.findByPk.mockResolvedValue({ role: 'admin' });
      req.params.id = '1';
      const mockSub = { id: 1, update: jest.fn() };
      Submission.findByPk.mockResolvedValue(mockSub);
      const mockRun = { id: 5 };
      EvaluationRun.create.mockResolvedValue(mockRun);
      enqueueEvaluation.mockResolvedValue();

      await replaySubmissionEvaluation(req, res);

      expect(mockSub.update).toHaveBeenCalledWith({ status: 'pending', total_score: null });
      expect(enqueueEvaluation).toHaveBeenCalledWith(1, 5);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Replay successfully queued' }));
    });
  });

  describe('getSubmissionProgress', () => {
    it('should return 404 if run not found', async () => {
      req.params.id = '1';
      Submission.findByPk.mockResolvedValue(null);

      jest.useFakeTimers();
      const promise = getSubmissionProgress(req, res);
      jest.advanceTimersByTime(1000);
      await promise;
      jest.useRealTimers();

      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('error'));
    });

    it('should send events via SSE', async () => {
      req.params.id = '1';
      Submission.findByPk.mockResolvedValue({ id: 1, status: 'completed' });

      jest.useFakeTimers();
      const promise = getSubmissionProgress(req, res);

      expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
        'Content-Type': 'text/event-stream'
      }));

      jest.advanceTimersByTime(1000);
      req.on.mock.calls.find(c => c[0] === 'close')[1](); // trigger cleanup
      await promise;
      jest.useRealTimers();

      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('status'));
    });
  });

  describe('getSubmissionResult', () => {
    it('should return 404 if submission not found', async () => {
      req.params.id = '1';
      Submission.findByPk.mockResolvedValue(null);
      await getSubmissionResult(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return run result', async () => {
      User.findByPk.mockResolvedValue({ id: '1', role: 'student' });
      req.params.id = '1';
      Submission.findByPk.mockResolvedValue({ id: 1, student_id: '1', status: 'completed' });
      EvaluationRun.findOne.mockResolvedValue({ id: 1, submission_id: 1, visual_artifacts: [] });
      await getSubmissionResult(req, res);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getSubmissionArtifact', () => {
    it('should return 404 if run not found', async () => {
      req.params.id = '1';
      req.params.filename = 'dom_snapshot.html';
      Submission.findByPk.mockResolvedValue({ id: 1 });
      EvaluationRun.findOne.mockResolvedValue(null);
      await getSubmissionArtifact(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if disallowed file type', async () => {
      req.params.id = '1';
      req.params.filename = 'notallowed.txt';
      Submission.findByPk.mockResolvedValue({ id: 1 });
      EvaluationRun.findOne.mockResolvedValue({ id: 1 });
      await getSubmissionArtifact(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 if file does not exist', async () => {
      req.params.id = '1';
      req.params.filename = 'diff_test.png';
      Submission.findByPk.mockResolvedValue({ id: 1 });
      EvaluationRun.findOne.mockResolvedValue({ id: 1 });
      fs.existsSync.mockReturnValue(false);
      await getSubmissionArtifact(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should send file if exists', async () => {
      req.params.id = '1';
      req.params.filename = 'diff_test.png';
      Submission.findByPk.mockResolvedValue({ id: 1 });
      EvaluationRun.findOne.mockResolvedValue({ id: 1 });
      fs.existsSync.mockReturnValue(true);

      // Override mock for this test so startsWith works
      const origResolve = path.resolve;
      path.resolve.mockImplementation((...args) => args.join('/'));
      // Hack to bypass startsWith check inside the mock or ensure it passes. The abs path string generated by path.resolve mock will be `${runDir}/${safeName}`.
      // So `abs.startsWith(runDir)` will be true.

      await getSubmissionArtifact(req, res);
      expect(res.sendFile).toHaveBeenCalledWith(expect.any(String));
    });
  });
});
