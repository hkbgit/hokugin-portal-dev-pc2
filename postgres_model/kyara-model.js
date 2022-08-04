const util = require('../submodules/util');
const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');

const connection = require('../submodules/postgres');
const model_name = "kyara-model";

/**
* コメント一覧に表示する情報を全件取得する。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
*/
exports.getAll = async (req, res, session, callback) => {
  const sql = `
    SELECT
      *
    FROM kyara_attr
    `;
  logger.debug('execute ' + model_name + ' getAll query');
  try {
    connection.queryCallBack(sql, [], function (err, rows) {
      callback(err, req, res, session, rows);
    });
  } catch (error) {
    err = error;
    callback(err, req, res, session);
  }
};

/**
* コメント一覧に表示する情報を全件取得する。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
*/
exports.getItemsAsync = async () => {
  const sql = `
    SELECT
      *
    FROM kyara_attr
    `;
  logger.debug('execute ' + model_name + ' getItemsAsync query');
  let rows = await connection.query(sql,[]);
  return rows
};

exports.getItemById = async (id) => {
  logger.debug('execute ' + model_name + 'getItemById query');
  let sql = `
    SELECT * FROM kyara_attr WHERE id = $1;
    `;
  let values = [id]
  let rows = await connection.query(sql,values);
  return rows;
}

/**
 * 新規登録する。
 * @param connection
 * @param req
 * @param imagePath イメージパス
 */
exports.createItem = async (req, res, session, callback, imagePath) => {
 
  logger.debug('execute ' + model_name +  ' createItem query');
  let sql = `
  INSERT INTO public.kyara_attr
  (  
    kyara_name, 
    image_path, 
    last_updated_user_id, 
    user_name, 
    last_updated_date)
  VALUES($1, $2, $3, $4, $5);
  `
  let values = [
    req.body.name,
    imagePath,
    session[0].user_id,
    session[0].user_name,
    util.getCurrentDate()
  ];

  await connection.queryCallBack(sql, values, function (err, rows) {
    callback(err, req, res, rows);
  });

}

/**
 * キャラ情報を削除する
 */
 exports.deleteItem = async (kyaraId) => {

  var sql = `
  delete from kyara_attr where id = $1;
  `
  let values = [kyaraId];
  
  let result = {};
  let successNum = 0;
  let errorNum = 0;

  var count = await connection.queryCount(sql,values);

  if (count > 0) {
    successNum++;
    result.successNum = successNum;
  } else {
    errorNum++;
    result.errorNum = errorNum;
    result.errId = kyaraId;
  }
  return result;

}

/**
* 情報を更新する
* @param req バナー情報を格納したリクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
* @param imagePath 画像ファイルの格納パス。省略時は画像ファイルの更新は行わない。パスには静的フォルダまでのパスは不要。
*/
exports.updateItemCallback = async (req, res, session, callback, imagePath = null) => {
  const targetId = req.body.kyaraId;
  let err = null;
  try {
    let infoSql = `
      SELECT * FROM kyara_attr WHERE id = $1;
      `;
    let infoValues = [targetId]
    var item = await connection.query(infoSql, infoValues);


    if (null == imagePath || '' == imagePath) {
      imagePath = item[0].image_path;
    }

    let sql = `
      UPDATE kyara_attr
      SET kyara_name=$1,
          image_path=$2,
          last_updated_user_id=$3, 
          user_name=$4, 
          last_updated_date=$5
          
      WHERE id=$6;
      `
    var values = [
      req.body.name,
      imagePath,
      session[0].user_id,
      session[0].user_name,
      util.getCurrentDate(),
      targetId
    ]


    let result = await connection.queryCount(sql, values);
    callback(err, req, res, session, result, imagePath);

  } catch (error) {
    err = error;
    callback(err, req, res, session, [], imagePath);
  }

};