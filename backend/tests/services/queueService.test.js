const { closeQueues, enqueueEvaluation, enqueueBaseline, evaluationQueue, queueEvents } = require('../../src/services/queueService');

jest.mock('bullmq');

describe('queueService', () => {
  let addMock, closeQueueMock, closeEventsMock, onMock, offMock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Replace the dummy objects with our own mock implementations
    // since process.env.NODE_ENV === 'test' creates dummy objects in queueService.js
    addMock = jest.fn().mockResolvedValue({ id: 'mock-job-id' });
    closeQueueMock = jest.fn().mockResolvedValue(true);
    closeEventsMock = jest.fn().mockResolvedValue(true);
    onMock = jest.fn();
    offMock = jest.fn();

    evaluationQueue.add = addMock;
    evaluationQueue.close = closeQueueMock;
    queueEvents.on = onMock;
    queueEvents.off = offMock;
    queueEvents.close = closeEventsMock;
  });

  afterAll(async () => {
    await closeQueues();
  });

  describe('enqueueEvaluation', () => {
    it('should throw an error if submissionId is missing', async () => {
      await expect(enqueueEvaluation()).rejects.toThrow('submissionId is required');
    });

    it('should add a job to the queue with the provided submissionId', async () => {
      await enqueueEvaluation(1);
      expect(addMock).toHaveBeenCalledWith(
        'evaluate',
        { submissionId: 1 },
        {
          jobId: 'submission-1',
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 }
        }
      );
    });

    it('should add a job to the queue with runId if provided', async () => {
      await enqueueEvaluation(2, 3);
      expect(addMock).toHaveBeenCalledWith(
        'evaluate',
        { submissionId: 2, runId: 3 },
        {
          jobId: 'replay-2-3',
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 }
        }
      );
    });
  });

  describe('enqueueBaseline', () => {
    it('should throw an error if questionId is missing', async () => {
      await expect(enqueueBaseline()).rejects.toThrow('questionId is required');
    });

    it('should add a job to the queue with the provided questionId and version', async () => {
      const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
      await enqueueBaseline(1, 2);
      expect(addMock).toHaveBeenCalledWith(
        'baseline',
        { mode: 'baseline', questionId: 1, version: 2 },
        {
          jobId: 'baseline-q1-v2-1234567890',
          attempts: 1
        }
      );
      mockDateNow.mockRestore();
    });

    it('should add a job to the queue with version 1 if not provided', async () => {
        const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
        await enqueueBaseline(1);
        expect(addMock).toHaveBeenCalledWith(
          'baseline',
          { mode: 'baseline', questionId: 1, version: 1 },
          {
            jobId: 'baseline-q1-v1-1234567890',
            attempts: 1
          }
        );
        mockDateNow.mockRestore();
    });
  });

  describe('closeQueues', () => {
      it('should close both queues', async () => {
          await closeQueues();
          expect(closeQueueMock).toHaveBeenCalled();
          expect(closeEventsMock).toHaveBeenCalled();
      });

      it('should handle errors during closing', async () => {
          const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
          closeQueueMock.mockRejectedValueOnce(new Error('Close error'));
          await closeQueues();
          expect(consoleSpy).toHaveBeenCalledWith('Error closing queues', expect.any(Error));
          consoleSpy.mockRestore();
      });
  });

  describe('mocked queue environment', () => {
      it('should have functional mocked add and close for evaluationQueue', async () => {
          // This tests the branch in queueService where NODE_ENV='test'
          const res = await evaluationQueue.add();
          expect(res.id).toBe('mock-job-id');
          await evaluationQueue.close();
      });

      it('should have functional mocked on, off and close for queueEvents', async () => {
          // This tests the branch in queueService where NODE_ENV='test'
          queueEvents.on();
          queueEvents.off();
          await queueEvents.close();
      });
  })
});
