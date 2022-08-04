const util = require('../submodules/util');
const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');

const connection = require('../submodules/postgres');
const model_name = "tairu-model";

/**
* タイル一覧に表示する情報を全件取得する。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
*/
exports.getItems = async () => {
  const sql = `
    SELECT
      *
    FROM tairu_info
    ORDER BY coordinate,priority
    `;
  logger.debug('execute ' + model_name + ' getItems query');
  let rows = await connection.query(sql,[]);
  return rows
};

exports.getItemById = async (id) => {
  logger.debug('execute ' + model_name + 'getItemById query');
  let sql = `
    SELECT * FROM tairu_info WHERE id = $1;
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
exports.createItemCallBack = async (req, res, session, callback, imagePath) => {
 
  logger.debug('execute ' + model_name +  ' createItem query');
  let sql = `
  INSERT INTO public.tairu_info
  (  
    title, 
    sub_title, 
    image_path, 
    link, 
    priority, 
    coordinate, 
    last_updated_user_id, 
    user_name, 
    last_updated_date)
  VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9);
  `
  let values = [
    req.body.title,
    req.body.subTitle,
    imagePath,
    req.body.link,
    req.body.priority,
    req.body.coordinate,
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
 exports.deleteItem = async (id) => {
  var sql = ` delete from tairu_info where id = $1; `
  return await connection.queryCount(sql,[id]);

}

/**
* 情報を更新する
* @param req バナー情報を格納したリクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
* @param imagePath 画像ファイルの格納パス。省略時は画像ファイルの更新は行わない。パスには静的フォルダまでのパスは不要。
*/
exports.updateItemCallback = async (req, res, session, callback, imagePath = null) => {
  const tairuId = req.body.tairuId;
  let err = null;
  let infoSql = ` SELECT * FROM tairu_info WHERE id = $1; `;
  var item = await connection.query(infoSql, [tairuId]);

  if (null == imagePath || '' == imagePath) {
    imagePath = item[0].image_path;
  }

  let sql = `
    UPDATE tairu_info
    SET 
        title=$1,
        sub_title=$2,
        image_path=$3,
        link=$4,
        priority=$5,
        coordinate=$6,
        last_updated_user_id=$7, 
        user_name=$8, 
        last_updated_date=$9
        
    WHERE id=$10;
    `
  var values = [
    req.body.title,
    req.body.subTitle,
    imagePath,
    req.body.link,
    req.body.priority,
    req.body.coordinate,
    session[0].user_id,
    session[0].user_name,
    util.getCurrentDate(),
    tairuId
  ]

  let result = await connection.queryCount(sql, values);
  callback(err, req, res, session, result, imagePath);


};