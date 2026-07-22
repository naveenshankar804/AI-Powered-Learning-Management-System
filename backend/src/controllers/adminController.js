const { WhitelistDomain, Submission, EvaluationRun, Artifact } = require('../models');
const { enqueueEvaluation } = require('../services/queueService');

const getWhitelist = async (req, res) => {
  try {
    const domains = await WhitelistDomain.findAll();
    res.json(domains);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addWhitelist = async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'domain required' });

    // Validate domain format to prevent injection/invalid entries
    const DOMAIN_REGEX = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!DOMAIN_REGEX.test(domain)) {
      return res.status(400).json({ error: 'invalid domain format' });
    }

    const newDomain = await WhitelistDomain.create({ domain });
    res.status(201).json(newDomain);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const removeWhitelist = async (req, res) => {
  try {
    const { id } = req.params;
    await WhitelistDomain.destroy({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const replayEvaluation = async (req, res) => {
  try {
    const { id } = req.params; // EvaluationRun id
    const run = await EvaluationRun.findByPk(id);
    if (!run) return res.status(404).json({ error: 'Evaluation Run not found' });
    
    // Create a new run and replay the same submission.
    const replayRun = await EvaluationRun.create({
      submission_id: run.submission_id,
      html_score: 0,
      css_score: 0,
      js_score: 0,
      visual_score: 0,
      quality_score: 0,
      a11y_score: 0,
      console_errors: [],
      execution_timings: {},
      ai_feedback: { summary: 'Replay queued...', suggestions: [] },
      failed_tests: [],
      visual_artifacts: [],
      a11y_violations: []
    });

    // Re-enqueue the submission using the original code, targeting this new run id.
    await enqueueEvaluation(run.submission_id, replayRun.id);
    
    // Set submission status back to pending
    await Submission.update({ status: 'pending' }, { where: { id: run.submission_id }});
    
    res.json({ message: 'Replay successfully queued', submission_id: run.submission_id, run_id: replayRun.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getLogs = async (req, res) => {
  // Mock endpoint to fetch logs for Admin Dashboard
  try {
    const runs = await EvaluationRun.findAll({
      order: [['created_at', 'DESC']],
      limit: 100
    });
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Spec: GET /admin/evaluation_runs/{id}
const getEvaluationRunDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const run = await EvaluationRun.findByPk(id, {
      include: [
        { model: Submission },
        { model: Artifact }
      ]
    });
    if (!run) return res.status(404).json({ error: 'Evaluation Run not found' });

    return res.json({
      run,
      submission: run.Submission || null,
      artifacts: Array.isArray(run.Artifacts) ? run.Artifacts : []
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

module.exports = {
  getWhitelist,
  addWhitelist,
  removeWhitelist,
  replayEvaluation,
  getLogs,
  getEvaluationRunDetails
};
