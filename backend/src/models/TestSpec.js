const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TestSpec = sequelize.define('TestSpec', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  question_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  spec_json: {
    type: DataTypes.JSONB,
    allowNull: false,
    /*
      {
        "viewports": ["desktop", "mobile"],
        "rubric": { "html": 20, "css": 35, "js": 35, "visual": 10 },
        "tests": {
          "dom": [...],
          "css": [...],
          "interactions": [...]
        }
      }
    */
  }
}, {
  tableName: 'test_specs',
  timestamps: false
});

module.exports = TestSpec;
