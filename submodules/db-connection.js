const mysql = require('mysql');
const constants = require('../constants');

// mysqlの接続設定
const pool = mysql.createPool({
  host: process.env.DB_HOST || constants.DB.CONFIG.DEBUG.HOST,
  user: process.env.DB_USER || constants.DB.CONFIG.DEBUG.USER,
  password: process.env.DB_PASS || constants.DB.CONFIG.DEBUG.PASSWORD,
  database: process.env.DB_NANE || constants.DB.CONFIG.DEBUG.DATABASE
});

module.exports = pool;
