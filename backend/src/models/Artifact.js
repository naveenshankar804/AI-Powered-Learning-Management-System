const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Artifact = sequelize.define('Artifact', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  run_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  viewport: {
    type: DataTypes.STRING,
    allowNull: false, // 'desktop', 'mobile'
  },
  expected_image_path: { type: DataTypes.STRING, allowNull: true },
  actual_image_path: { type: DataTypes.STRING, allowNull: true },
  diff_image_path: { type: DataTypes.STRING, allowNull: true },
  dom_snapshot_path: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'artifacts',
  timestamps: false
});

module.exports = Artifact;
