const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WhitelistDomain = sequelize.define('WhitelistDomain', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  domain: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
}, {
  tableName: 'whitelist_domains',
  timestamps: false
});

module.exports = WhitelistDomain;
