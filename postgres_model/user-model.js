const connection = require('../submodules/postgres');
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

exports.auth = (req, res, callback) => {

  const name = req.body.name;
  const password = req.body.password;
  const sql = "SELECT * FROM users WHERE name = $1 AND password = $2 ;";
  const values = [name, hash(password)];
  logger.debug('execute auth query');
  connection.queryCallBack(sql, values, function(err, rows) {
    callback(err, req, res, rows);
  });
  
};


/**
* パスワードの更新
* @param req リクエスト
* @param res レスポンス
* @param callback パスワード更新SQL実行後に呼び出されるコールバック
*/
exports.updatePassword = async(req, res, session, callback)=> {

  const userId = session[0].user_id;
  const currentPass = req.body.currentPass;
  const newPass = req.body.newPass;
  const sql = `
  UPDATE users
  SET password = $1, last_password_updated_date = $2
  WHERE id = $3 AND password = $4 ;
  `;
  const currentDate = util.getCurrentDate();
  const values = [hash(newPass), currentDate, userId, hash(currentPass)];
  logger.debug('execute updatePassword query');
  connection.queryResCallBack(sql, values, function(err, row) {
    let result = {};
    result.ok = row.rowCount > 0;
    callback(err, req, res, result, currentDate);
  });
}
