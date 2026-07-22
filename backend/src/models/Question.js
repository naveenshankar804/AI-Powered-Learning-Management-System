const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  allowed_libraries: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [] // Array of CDN URLs or library IDs
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  order_index: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  constraints: {
    type: DataTypes.JSONB,
    defaultValue: [] 
  },
  starter_code: {
    type: DataTypes.JSONB,
    allowNull: true
    /* { html: "...", css: "...", js: "..." } */
  }
}, {
  tableName: 'questions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Question;
