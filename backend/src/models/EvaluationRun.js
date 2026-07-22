const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EvaluationRun = sequelize.define('EvaluationRun', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  submission_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    // NOTE: Not unique. FR-8 requires replaying evaluation on the same submission,
    // which creates additional EvaluationRun rows for the same submission_id.
  },
  html_score: { type: DataTypes.FLOAT, defaultValue: 0 },
  css_score: { type: DataTypes.FLOAT, defaultValue: 0 },
  js_score: { type: DataTypes.FLOAT, defaultValue: 0 },
  visual_score: { type: DataTypes.FLOAT, defaultValue: 0 },
  quality_score: { type: DataTypes.FLOAT, defaultValue: 0 },
  console_errors: {
    type: DataTypes.JSONB,
    defaultValue: [] 
  },
  execution_timings: {
    type: DataTypes.JSONB,
    allowNull: true
    /* 
      { "static_validation": "120ms", "puppeteer_eval": "2400ms" }
    */
  },
  ai_feedback: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  failed_tests: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  visual_artifacts: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  a11y_score: { type: DataTypes.FLOAT, defaultValue: 0 },
  a11y_violations: {
    type: DataTypes.JSONB,
    defaultValue: []
  }
}, {
  tableName: 'evaluation_runs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = EvaluationRun;
