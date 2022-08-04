const connection = require('../submodules/db-connection');
const crypto = require('crypto');
const util = require('../submodules/util');
const logger = require('../submodules/logger').systemLogger;

/**
* パスワードのSHA256ハッシュ値を求め、BASE64ダイジェスト値を返す。
* @param password パスワード平文
* @return ダイジェスト値
*/
const hash = function(password) {
  return crypto.createHash('sha256').update(password).digest('base64');
};

/**
* ログイン認証
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
*/
exports.auth = function(req, res, callback) {
  const name = req.body.name;
  const password = req.body.password;
  const sql = "SELECT * FROM users WHERE name = ? AND password = ? ;";
  const values = [name, hash(password)];
  logger.debug('execute auth query');
  connection.query(sql, values, function(err, rows) {
    callback(err, req, res, rows);
  });
};

/**
* パスワードの更新
* @param req リクエスト
* @param res レスポンス
* @param callback パスワード更新SQL実行後に呼び出されるコールバック
*/
exports.updatePassword = function(req, res, callback) {
  const userId = req.session.user_id;
  const currentPass = req.body.currentPass;
  const newPass = req.body.newPass;
  const sql = `
  UPDATE users
  SET password = ?, last_password_updated_date = ?
  WHERE id = ? AND password = ? ;
  `;
  const currentDate = util.getCurrentDate();
  const values = [hash(newPass), currentDate, userId, hash(currentPass)];
  logger.debug('execute updatePassword query');
  connection.query(sql, values, function(err, result) {
    callback(err, req, res, result, currentDate);
  });
}
