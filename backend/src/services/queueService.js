const { Queue, QueueEvents } = require('bullmq');
const dotenv = require('dotenv');

dotenv.config();

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
};

// Prevent connecting if we're not running the server to avoid test hang-ups
// Use mocked queue in tests to prevent undefined errors when other routes enqueue jobs
let evaluationQueue;
let queueEvents;

if (process.env.NODE_ENV !== 'test') {
  evaluationQueue = new Queue('evaluation-queue', { connection });
  queueEvents = new QueueEvents('evaluation-queue', { connection });
} else {
  evaluationQueue = {
    add: async () => ({ id: 'mock-job-id' }),
    close: async () => {}
  };
  queueEvents = {
    on: () => {},
    off: () => {},
    close: async () => {}
  };
}

// Export the ability to close the queue connections
const closeQueues = async () => {
  try {
    if (evaluationQueue) {
      await evaluationQueue.close();
    }
    if (queueEvents) {
      await queueEvents.close();
    }
  } catch (e) {
    console.error('Error closing queues', e);
  }
};

const enqueueEvaluation = async (submissionId, runId = null) => {
  const sid = Number(submissionId);
  if (!sid) throw new Error('submissionId is required');

  const payload = { submissionId: sid };
  // If runId is provided, the worker will use that existing EvaluationRun record
  // instead of creating a new one (used for admin replay).
  if (runId != null) payload.runId = Number(runId);

  await evaluationQueue.add('evaluate', payload, {
    // BullMQ rejects purely-numeric custom job ids; prefix with a stable string.
    // Note: BullMQ also disallows ":" in custom ids.
    // For replays we must use a unique id (otherwise BullMQ de-dupes).
    jobId: runId != null ? `replay-${sid}-${runId}` : `submission-${sid}`,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  });
};

const enqueueBaseline = async (questionId, version) => {
  const qid = Number(questionId);
  if (!qid) throw new Error('questionId is required');
  const ver = Number(version) || 1;

  const job = await evaluationQueue.add('baseline', { mode: 'baseline', questionId: qid, version: ver }, {
    jobId: `baseline-q${qid}-v${ver}-${Date.now()}`,
    attempts: 1
  });
  return job;
};

module.exports = {
  evaluationQueue,
  queueEvents,
  closeQueues,
  enqueueEvaluation,
  enqueueBaseline
};
