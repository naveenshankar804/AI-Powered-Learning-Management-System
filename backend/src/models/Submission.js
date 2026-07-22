const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Submission = sequelize.define('Submission', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  question_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  student_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  html_content: { type: DataTypes.TEXT, allowNull: true },
  css_content: { type: DataTypes.TEXT, allowNull: true },
  js_content: { type: DataTypes.TEXT, allowNull: true },
  total_score: {
    type: DataTypes.FLOAT,
    defaultValue: null
  },
  status: {
    type: DataTypes.ENUM('pending', 'running', 'completed', 'failed'),
    defaultValue: 'pending',
  },
  static_validation_results: {
    type: DataTypes.JSONB,
    allowNull: true,
  }
}, {
  tableName: 'submissions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Submission;
