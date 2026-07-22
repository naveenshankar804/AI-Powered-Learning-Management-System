const {
  listQuestions,
  getQuestionDetails,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  generateBaseline
} = require('../../src/controllers/questionController');
const { Question, TestSpec, QuestionFile, Baseline } = require('../../src/models');
const { enqueueBaseline } = require('../../src/services/queueService');
const {
  prepareAutoBaselineSpec,
  resolveCurrentBaselineVersion,
  resolveNextBaselineVersion
} = require('../../src/services/baselineGenerationService');

jest.mock('../../src/models', () => ({
  Question: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  },
  TestSpec: {
    findOne: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn()
  },
  QuestionFile: {
    findOne: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn()
  },
  Baseline: {
    destroy: jest.fn()
  }
}));

jest.mock('../../src/services/queueService', () => ({
  enqueueBaseline: jest.fn()
}));

jest.mock('../../src/services/baselineGenerationService', () => ({
  prepareAutoBaselineSpec: jest.fn(),
  resolveCurrentBaselineVersion: jest.fn(),
  resolveNextBaselineVersion: jest.fn()
}));

describe('questionController', () => {
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

  describe('listQuestions', () => {
    it('should return questions on success', async () => {
      const mockQuestions = [{ id: 1, title: 'Q1' }];
      Question.findAll.mockResolvedValue(mockQuestions);

      await listQuestions(req, res);

      expect(Question.findAll).toHaveBeenCalledWith({
        order: [['id', 'ASC']],
        attributes: ['id', 'title', 'description', 'allowed_libraries', 'created_at', 'updated_at']
      });
      expect(res.json).toHaveBeenCalledWith({ questions: mockQuestions });
    });

    it('should return 500 on error', async () => {
      Question.findAll.mockRejectedValue(new Error('DB error'));

      await listQuestions(req, res);

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

    it('should create question and baseline successfully', async () => {
      req.body = {
        title: 'New Question',
        description: 'Description',
        spec_json: { version: '1.0' }
      };

      const mockQuestion = { id: 1, title: 'New Question' };
      Question.create.mockResolvedValue(mockQuestion);
      prepareAutoBaselineSpec.mockReturnValue({
        ready: true,
        spec: { version: '1.0' },
        autoFilled: true
      });
      resolveCurrentBaselineVersion.mockResolvedValue(0);
      enqueueBaseline.mockResolvedValue({ id: 100 });

      await createQuestion(req, res);

      expect(Question.create).toHaveBeenCalledWith({
        title: 'New Question',
        description: 'Description',
        allowed_libraries: [],
        starter_code: null
      });
      expect(QuestionFile.create).toHaveBeenCalledTimes(3); // html, css, js defaults
      expect(TestSpec.create).toHaveBeenCalledWith({
        question_id: 1,
        spec_json: { version: '1.0' }
      });
      expect(enqueueBaseline).toHaveBeenCalledWith(1, 1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        question: mockQuestion,
        baseline: {
          queued: true,
          version: 1,
          job_id: 100,
          auto_filled: true
        }
      });
    });

    it('should handle missing enqueue job ID', async () => {
      req.body = {
        title: 'New Question',
        description: 'Description',
        spec_json: { version: '1.0' }
      };

      const mockQuestion = { id: 1, title: 'New Question' };
      Question.create.mockResolvedValue(mockQuestion);
      prepareAutoBaselineSpec.mockReturnValue({
        ready: true,
        spec: { version: '1.0' },
        autoFilled: false
      });
      resolveCurrentBaselineVersion.mockResolvedValue(0);
      enqueueBaseline.mockResolvedValue(null);

      await createQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        question: mockQuestion,
        baseline: {
          queued: true,
          version: 1,
          job_id: null,
          auto_filled: false
        }
      });
    });

    it('should handle current version > 0', async () => {
      req.body = {
        title: 'New Question',
        description: 'Description',
        spec_json: { version: '1.0' }
      };

      const mockQuestion = { id: 1, title: 'New Question' };
      Question.create.mockResolvedValue(mockQuestion);
      prepareAutoBaselineSpec.mockReturnValue({
        ready: true,
        spec: { version: '1.0' },
        autoFilled: false
      });
      resolveCurrentBaselineVersion.mockResolvedValue(1);

      await createQuestion(req, res);

      expect(enqueueBaseline).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
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
      err.errors = [{ message: 'Validation message' }];
      Question.create.mockRejectedValue(err);

      await createQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Create error', details: ['Validation message'] });
    });
  });

  describe('updateQuestion', () => {
    it('should return 400 if invalid question id', async () => {
      req.params = { id: 'invalid' };
      await updateQuestion(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid question id' });
    });

    it('should return 404 if question not found', async () => {
      req.params = { id: 999 };
      Question.findByPk.mockResolvedValue(null);
      await updateQuestion(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Question not found' });
    });

    it('should update question successfully and queue baseline if spec_json provided', async () => {
      req.params = { id: 1 };
      req.body = {
        title: 'Updated Question',
        description: 'New Description',
        allowed_libraries: ['react'],
        starter_code: { html: '<div></div>' },
        spec_json: { version: '2.0' }
      };

      const mockQuestion = { id: 1, update: jest.fn() };
      Question.findByPk.mockResolvedValue(mockQuestion);

      const mockSpec = { update: jest.fn() };
      TestSpec.findOne.mockResolvedValue(mockSpec);

      QuestionFile.findOne.mockResolvedValue(null);

      prepareAutoBaselineSpec.mockReturnValue({
        ready: true,
        spec: { version: '2.0' },
        autoFilled: true
      });
      resolveCurrentBaselineVersion.mockResolvedValue(0);
      enqueueBaseline.mockResolvedValue({ id: 101 });

      await updateQuestion(req, res);

      expect(mockQuestion.update).toHaveBeenCalledWith({
        title: 'Updated Question',
        description: 'New Description',
        allowed_libraries: ['react'],
        starter_code: { html: '<div></div>' }
      });
      expect(mockSpec.update).toHaveBeenCalledWith({ spec_json: { version: '2.0' } });
      expect(enqueueBaseline).toHaveBeenCalledWith(1, 1);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        baseline: {
          queued: true,
          version: 1,
          job_id: 101,
          auto_filled: true
        }
      });
    });

    it('should update question successfully but not queue baseline if spec_json missing', async () => {
      req.params = { id: 1 };
      req.body = { title: 'Updated Question' };

      const mockQuestion = { id: 1, update: jest.fn() };
      Question.findByPk.mockResolvedValue(mockQuestion);

      await updateQuestion(req, res);

      expect(mockQuestion.update).toHaveBeenCalledWith({ title: 'Updated Question' });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        baseline: {
          queued: false,
          version: null,
          job_id: null,
          auto_filled: false
        }
      });
    });

    it('should update question and handle existing file update', async () => {
      req.params = { id: 1 };
      req.body = {
        title: 'Updated Question',
        starter_code: { html: '<div></div>' },
        spec_json: { version: '2.0' }
      };

      const mockQuestion = { id: 1, update: jest.fn() };
      Question.findByPk.mockResolvedValue(mockQuestion);

      const mockExistingFile = { update: jest.fn() };
      QuestionFile.findOne.mockResolvedValue(mockExistingFile); // Found existing file

      TestSpec.findOne.mockResolvedValue(null);

      prepareAutoBaselineSpec.mockReturnValue({
        ready: false, // Not ready to queue
        spec: { version: '2.0' },
        autoFilled: false
      });
      resolveCurrentBaselineVersion.mockResolvedValue(2);

      await updateQuestion(req, res);

      expect(mockExistingFile.update).toHaveBeenCalledWith({ filename: 'index.html', content: '<div></div>' });
      expect(TestSpec.create).toHaveBeenCalledWith({ question_id: 1, spec_json: { version: '2.0' } });

      expect(enqueueBaseline).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        baseline: {
          queued: false,
          version: 2,
          job_id: null,
          auto_filled: false
        }
      });
    });

    it('should return 500 on error', async () => {
      req.params = { id: 1 };
      req.body = { title: 'Updated Question' };
      Question.findByPk.mockRejectedValue(new Error('Update error'));

      await updateQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Update error' });
    });
  });

  describe('getQuestionDetails', () => {
    it('should return 404 if question not found', async () => {
      req.params = { id: 999 };
      Question.findByPk.mockResolvedValue(null);

      await getQuestionDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Question not found' });
    });

    it('should return question details successfully', async () => {
      req.params = { id: 1 };
      const mockQuestion = { id: 1, title: 'Q1' };
      const mockSpec = { spec_json: { test: 'test' } };
      const mockFiles = [{ id: 1, filename: 'index.html' }];

      Question.findByPk.mockResolvedValue(mockQuestion);
      TestSpec.findOne.mockResolvedValue(mockSpec);
      QuestionFile.findAll.mockResolvedValue(mockFiles);

      await getQuestionDetails(req, res);

      expect(Question.findByPk).toHaveBeenCalledWith(1);
      expect(TestSpec.findOne).toHaveBeenCalledWith({ where: { question_id: 1 } });
      expect(QuestionFile.findAll).toHaveBeenCalledWith({ where: { question_id: 1 } });
      expect(res.json).toHaveBeenCalledWith({
        question: mockQuestion,
        testSpec: mockSpec.spec_json,
        files: mockFiles
      });
    });

    it('should return question details with null testSpec if not found', async () => {
      req.params = { id: 1 };
      const mockQuestion = { id: 1, title: 'Q1' };
      const mockFiles = [{ id: 1, filename: 'index.html' }];

      Question.findByPk.mockResolvedValue(mockQuestion);
      TestSpec.findOne.mockResolvedValue(null);
      QuestionFile.findAll.mockResolvedValue(mockFiles);

      await getQuestionDetails(req, res);

      expect(res.json).toHaveBeenCalledWith({
        question: mockQuestion,
        testSpec: null,
        files: mockFiles
      });
    });

    it('should return 500 on error', async () => {
      req.params = { id: 1 };
      Question.findByPk.mockRejectedValue(new Error('Find error'));

      await getQuestionDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Find error' });
    });
  });

  describe('deleteQuestion', () => {
    it('should return 400 if invalid question id', async () => {
      req.params = { id: 'invalid' };
      await deleteQuestion(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid question id' });
    });

    it('should return 404 if question not found', async () => {
      req.params = { id: 999 };
      Question.findByPk.mockResolvedValue(null);
      await deleteQuestion(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Question not found' });
    });

    it('should delete question and related data successfully', async () => {
      req.params = { id: 1 };
      const mockQuestion = { id: 1, destroy: jest.fn() };
      Question.findByPk.mockResolvedValue(mockQuestion);

      await deleteQuestion(req, res);

      expect(QuestionFile.destroy).toHaveBeenCalledWith({ where: { question_id: 1 } });
      expect(TestSpec.destroy).toHaveBeenCalledWith({ where: { question_id: 1 } });
      expect(Baseline.destroy).toHaveBeenCalledWith({ where: { question_id: 1 } });
      expect(mockQuestion.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('should return 500 on error', async () => {
      req.params = { id: 1 };
      Question.findByPk.mockRejectedValue(new Error('Delete error'));
      await deleteQuestion(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Delete error' });
    });
  });

  describe('generateBaseline', () => {
    it('should return 400 if invalid question id', async () => {
      req.params = { id: 'invalid' };
      await generateBaseline(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid question id' });
    });

    it('should return 404 if question not found', async () => {
      req.params = { id: 999 };
      Question.findByPk.mockResolvedValue(null);
      await generateBaseline(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Question not found' });
    });

    it('should return 400 if test spec is not configured', async () => {
      req.params = { id: 1 };
      Question.findByPk.mockResolvedValue({ id: 1 });
      TestSpec.findOne.mockResolvedValue(null);

      await generateBaseline(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'TestSpec not configured' });
    });

    it('should return 400 if reference solution is missing', async () => {
      req.params = { id: 1 };
      Question.findByPk.mockResolvedValue({ id: 1 });
      TestSpec.findOne.mockResolvedValue({ spec_json: { baseline: {} } }); // No html, css, or js

      await generateBaseline(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Reference solution (testSpec.baseline) is required to generate baseline' });
    });

    it('should enqueue baseline successfully', async () => {
      req.params = { id: 1 };
      Question.findByPk.mockResolvedValue({ id: 1 });
      TestSpec.findOne.mockResolvedValue({ spec_json: { baseline: { html: '<div></div>' } } });

      resolveNextBaselineVersion.mockResolvedValue(2);
      enqueueBaseline.mockResolvedValue({ id: 102 });

      await generateBaseline(req, res);

      expect(enqueueBaseline).toHaveBeenCalledWith(1, 2);
      expect(res.json).toHaveBeenCalledWith({
        status: 'queued',
        question_id: 1,
        version: 2,
        job_id: 102
      });
    });

    it('should enqueue baseline successfully with null job id', async () => {
      req.params = { id: 1 };
      Question.findByPk.mockResolvedValue({ id: 1 });
      TestSpec.findOne.mockResolvedValue({ spec_json: { baseline: { html: '<div></div>' } } });

      resolveNextBaselineVersion.mockResolvedValue(2);
      enqueueBaseline.mockResolvedValue(null); // No job id

      await generateBaseline(req, res);

      expect(enqueueBaseline).toHaveBeenCalledWith(1, 2);
      expect(res.json).toHaveBeenCalledWith({
        status: 'queued',
        question_id: 1,
        version: 2,
        job_id: null
      });
    });

    it('should return 500 on error', async () => {
      req.params = { id: 1 };
      Question.findByPk.mockRejectedValue(new Error('Generate error'));

      await generateBaseline(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Generate error' });
    });
  });
});
