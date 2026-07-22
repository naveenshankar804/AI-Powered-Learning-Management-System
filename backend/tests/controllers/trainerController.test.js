const {
  getQuestionAnalytics,
  createQuestion,
  getQuestionDraft,
  saveQuestionDraft
} = require('../../src/controllers/trainerController');
const { Submission, EvaluationRun, Question, TestSpec, QuestionFile } = require('../../src/models');
const { enqueueBaseline } = require('../../src/services/queueService');
const {
  prepareAutoBaselineSpec,
  resolveCurrentBaselineVersion
} = require('../../src/services/baselineGenerationService');

jest.mock('../../src/models', () => ({
  Submission: {
    findAll: jest.fn()
  },
  EvaluationRun: {},
  Question: {
    create: jest.fn(),
    findByPk: jest.fn()
  },
  TestSpec: {
    create: jest.fn(),
    findOne: jest.fn()
  },
  QuestionFile: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn()
  }
}));

jest.mock('../../src/services/queueService', () => ({
  enqueueBaseline: jest.fn()
}));

jest.mock('../../src/services/baselineGenerationService', () => ({
  prepareAutoBaselineSpec: jest.fn(),
  resolveCurrentBaselineVersion: jest.fn()
}));

describe('trainerController', () => {
  let req, res;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
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

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('getQuestionAnalytics', () => {
    it('should return default analytics if no submissions', async () => {
      req.params = { questionId: 1 };
      Submission.findAll.mockResolvedValue([]);

      await getQuestionAnalytics(req, res);

      expect(Submission.findAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'No data',
        avgScore: 0,
        scoreHistogram: [0, 0, 0, 0, 0],
        failedTestsFrequency: {},
        visualDiffDist: { '0-1%': 0, '1-3%': 0, '3-6%': 0, '>6%': 0 },
        avgExecutionTimeMs: 0
      });
    });

    it('should calculate analytics successfully', async () => {
      req.params = { questionId: 1 };
      const mockSubmissions = [
        {
          total_score: 10,
          EvaluationRuns: [{ id: 2, failed_tests: [{ testId: 't1' }], visual_artifacts: [{ diffPercent: 0.5 }], execution_timings: { puppeteer_eval: '100ms' } }]
        },
        {
          total_score: 50,
          EvaluationRuns: [{ id: 3, failed_tests: [{ selector: '.btn' }], visual_artifacts: [{ diffPercentage: 2 }], execution_timings: { puppeteer_eval: '200ms' } }]
        },
        {
          total_score: 90,
          EvaluationRuns: [{ id: 4, visual_artifacts: [{ diffPercent: 4 }, { diffPercent: 7 }] }]
        }
      ];
      Submission.findAll.mockResolvedValue(mockSubmissions);

      await getQuestionAnalytics(req, res);

      expect(res.json).toHaveBeenCalledWith({
        avgScore: '50.00',
        scoreHistogram: [1, 0, 1, 0, 1], // 10, 50, 90
        failedTestsFrequency: { 't1': 1, '.btn': 1 },
        visualDiffDist: { '0-1%': 1, '1-3%': 1, '3-6%': 1, '>6%': 1 },
        avgExecutionTimeMs: 150
      });
    });

    it('should return 500 on error', async () => {
      req.params = { questionId: 1 };
      Submission.findAll.mockRejectedValue(new Error('DB error'));

      await getQuestionAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
    });
  });

  describe('createQuestion', () => {
    it('should return 400 if title is missing', async () => {
      await createQuestion(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'title is required' });
    });

    it('should create question and related data successfully', async () => {
      req.body = { title: 'New Question', description: 'Description' };
      const mockQuestion = { id: 1, title: 'New Question' };
      Question.create.mockResolvedValue(mockQuestion);

      await createQuestion(req, res);

      expect(Question.create).toHaveBeenCalledWith({
        title: 'New Question',
        description: 'Description',
        allowed_libraries: []
      });
      expect(TestSpec.create).toHaveBeenCalled();
      expect(QuestionFile.create).toHaveBeenCalledTimes(3);
      expect(res.json).toHaveBeenCalledWith({
        question: mockQuestion,
        baseline: {
          queued: false,
          version: null,
          job_id: null,
          auto_filled: false
        }
      });
    });

    it('should return 500 on error', async () => {
      req.body = { title: 'Q1' };
      Question.create.mockRejectedValue(new Error('Create error'));

      await createQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Create error' });
    });

    it('should return 500 with details on validation error', async () => {
      req.body = { title: 'Q1' };
      const err = new Error('Create error');
      err.errors = [{ message: 'Validation error' }];
      Question.create.mockRejectedValue(err);

      await createQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Create error', details: ['Validation error'] });
    });
  });

  describe('getQuestionDraft', () => {
    it('should return 404 if question not found', async () => {
      req.params = { questionId: 999 };
      Question.findByPk.mockResolvedValue(null);

      await getQuestionDraft(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Question not found' });
    });

    it('should return draft successfully', async () => {
      req.params = { questionId: 1 };
      const mockQuestion = { id: 1, title: 'Q1' };
      const mockSpec = { spec_json: { version: '1.0' } };
      const mockFiles = [{ id: 1, type: 'html' }];

      Question.findByPk.mockResolvedValue(mockQuestion);
      TestSpec.findOne.mockResolvedValue(mockSpec);
      QuestionFile.findAll.mockResolvedValue(mockFiles);

      await getQuestionDraft(req, res);

      expect(res.json).toHaveBeenCalledWith({
        question: mockQuestion,
        testSpec: mockSpec.spec_json,
        files: mockFiles
      });
    });

    it('should return draft with null testSpec if not found', async () => {
      req.params = { questionId: 1 };
      const mockQuestion = { id: 1, title: 'Q1' };

      Question.findByPk.mockResolvedValue(mockQuestion);
      TestSpec.findOne.mockResolvedValue(null);
      QuestionFile.findAll.mockResolvedValue([]);

      await getQuestionDraft(req, res);

      expect(res.json).toHaveBeenCalledWith({
        question: mockQuestion,
        testSpec: null,
        files: []
      });
    });

    it('should return 500 on error', async () => {
      req.params = { questionId: 1 };
      Question.findByPk.mockRejectedValue(new Error('Draft error'));

      await getQuestionDraft(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Draft error' });
    });
  });

  describe('saveQuestionDraft', () => {
    it('should return 404 if question not found', async () => {
      req.params = { questionId: 999 };
      Question.findByPk.mockResolvedValue(null);

      await saveQuestionDraft(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Question not found' });
    });

    it('should update draft successfully and queue baseline', async () => {
      req.params = { questionId: 1 };
      req.body = {
        title: 'Updated Draft',
        description: 'Desc',
        allowed_libraries: [],
        starter_html: '<html></html>',
        spec_json: { version: '2.0' }
      };

      const mockQuestion = { id: 1, update: jest.fn() };
      Question.findByPk.mockResolvedValue(mockQuestion);
      QuestionFile.findOne.mockResolvedValue(null);
      const mockSpec = { update: jest.fn() };
      TestSpec.findOne.mockResolvedValue(mockSpec);

      prepareAutoBaselineSpec.mockReturnValue({
        ready: true,
        spec: { version: '2.0' },
        autoFilled: true
      });
      resolveCurrentBaselineVersion.mockResolvedValue(0);
      enqueueBaseline.mockResolvedValue({ id: 105 });

      await saveQuestionDraft(req, res);

      expect(mockQuestion.update).toHaveBeenCalledWith({
        title: 'Updated Draft',
        description: 'Desc',
        allowed_libraries: []
      });
      expect(QuestionFile.create).toHaveBeenCalledWith({ question_id: 1, type: 'html', filename: 'index.html', content: '<html></html>' });
      expect(mockSpec.update).toHaveBeenCalledWith({ spec_json: { version: '2.0' } });
      expect(enqueueBaseline).toHaveBeenCalledWith(1, 1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        baseline: {
          queued: true,
          version: 1,
          job_id: 105,
          auto_filled: true
        }
      });
    });

    it('should update draft successfully but not queue baseline if current version > 0', async () => {
      req.params = { questionId: 1 };
      req.body = { spec_json: { version: '2.0' } };

      const mockQuestion = { id: 1, update: jest.fn() };
      Question.findByPk.mockResolvedValue(mockQuestion);
      QuestionFile.findOne.mockResolvedValue(null);
      TestSpec.findOne.mockResolvedValue(null);

      prepareAutoBaselineSpec.mockReturnValue({
        ready: true,
        spec: { version: '2.0' },
        autoFilled: false
      });
      resolveCurrentBaselineVersion.mockResolvedValue(1);

      await saveQuestionDraft(req, res);

      expect(TestSpec.create).toHaveBeenCalledWith({ question_id: 1, spec_json: { version: '2.0' } });
      expect(enqueueBaseline).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        baseline: {
          queued: false,
          version: 1,
          job_id: null,
          auto_filled: false
        }
      });
    });

    it('should update draft successfully and update existing files and spec', async () => {
      req.params = { questionId: 1 };
      req.body = { starter_html: '<div></div>', spec_json: { version: '3.0' } };

      const mockQuestion = { id: 1, update: jest.fn() };
      Question.findByPk.mockResolvedValue(mockQuestion);

      const mockFile = { update: jest.fn() };
      QuestionFile.findOne.mockResolvedValue(mockFile);

      const mockSpec = { update: jest.fn() };
      TestSpec.findOne.mockResolvedValue(mockSpec);

      prepareAutoBaselineSpec.mockReturnValue({
        ready: true,
        spec: { version: '3.0' },
        autoFilled: true
      });
      resolveCurrentBaselineVersion.mockResolvedValue(0);
      enqueueBaseline.mockResolvedValue({ id: 106 });

      await saveQuestionDraft(req, res);

      expect(mockFile.update).toHaveBeenCalledWith({ filename: 'index.html', content: '<div></div>' });
      expect(mockSpec.update).toHaveBeenCalledWith({ spec_json: { version: '3.0' } });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        baseline: {
          queued: true,
          version: 1,
          job_id: 106,
          auto_filled: true
        }
      });
    });

    it('should return 500 on error', async () => {
      req.params = { questionId: 1 };
      Question.findByPk.mockRejectedValue(new Error('Save error'));

      await saveQuestionDraft(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Save error' });
    });
  });
});
