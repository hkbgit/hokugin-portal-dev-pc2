const util = require('../submodules/util');
const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');

const connection = require('../submodules/postgres');

const model_name = "comment_model";

/**
* コメント一覧に表示する情報を全件取得する。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
*/
exports.getTopItems = async () => {
  logger.debug('execute ' + model_name + ' getTopItems query');

  const currentDateTime = util.getCurrentDateTime();

  const sql = `
    SELECT
      T1.*,
      T2.ID AS KYARA_ID ,
      T2.KYARA_NAME ,
      T2.IMAGE_PATH
    FROM
      COMMENT_INFO T1
    INNER JOIN KYARA_ATTR T2 ON
      T1.KYARA_ID = T2.ID
    WHERE
      ((publish_datetime_start = '' OR publish_datetime_start IS NULL)
        AND (publish_datetime_end = '' OR publish_datetime_end IS NULL))
      OR
      (publish_datetime_start <= $1 AND $1 <= publish_datetime_end)
      OR
      ((publish_datetime_start = '' OR publish_datetime_start IS NULL)
        AND $1 <= publish_datetime_end)
      OR
      (publish_dateTime_start <= $1
        AND (publish_datetime_end = '' OR publish_datetime_end IS NULL))
    
    `;

    logger.debug('execute getAllComment query');

    let values = [currentDateTime]
    let rows = await connection.query(sql,values);

    if (rows.length > 0) {
      var index =  parseInt(rows.length * Math.random());
      return rows[index];
    }

    return null;

  };

/**
* コメント一覧に表示する情報を全件取得する。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
*/
exports.getItems = async (req, res, session, callback) => {
  logger.debug('execute ' + model_name + ' getItems query');
    const sql = `
    SELECT
      T1.*,
      T2.ID AS KYARA_ID ,
      T2.KYARA_NAME ,
      T2.IMAGE_PATH
    FROM
      COMMENT_INFO T1
    INNER JOIN KYARA_ATTR T2 ON
      T1.KYARA_ID = T2.ID
    `;

    logger.debug('execute getAllComment query');

    let values = []
    let rows = await connection.query(sql,values);
    return rows;

  };

/**
* キャラIdによりアイテムを取得。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
*/
exports.getItemsByKaraId = async (kyaraId) => {
  logger.debug('execute ' + model_name + 'getItemsByKaraId query');
  let sql = `
    SELECT * FROM COMMENT_INFO WHERE kyara_id = $1;
    `;
  let values = [kyaraId]
  let rows = await connection.query(sql,values);
  return rows;
};

/**
* IDからアイテムを取得
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
*/
exports.getItemById = async (id) => {
  logger.debug('execute ' + model_name + ' getItemById query');
  let sql = `
    SELECT
      T1.*
    FROM
      COMMENT_INFO T1
    WHERE T1.ID = $1;
    `;
  let values = [id]
  let rows = await connection.query(sql,values);
  return rows;
};

/**
 * 新規登録する。
 * @param connection
 * @param req
 * @param imagePath イメージパス
 */
 exports.createItemAsync = async (req,session) => {
 
  logger.debug('execute ' + model_name +  ' createItem query');
  let sql = `
  INSERT INTO public.comment_info
  (  
    comment,
    kyara_id,
    link, 
    publish_datetime_start,
    publish_datetime_end,
    last_updated_user_id,
    user_name,
    last_updated_date)
  VALUES($1, $2, $3, $4, $5, $6, $7, $8);
  `
  let values = [
    req.body.comment,
    req.body.kyaraAttrId,
    req.body.link,
    req.body.publish_datetime_start,
    req.body.publish_datetime_end,
    session[0].user_id,
    session[0].user_name,
    util.getCurrentDate()
  ];

  return await connection.queryCount(sql,values);

}

/**
 * 更新する。
 * @param connection
 * @param req
 * @param imagePath イメージパス
 */
 exports.updateItem = async (req,session) => {
 
  logger.debug('execute ' + model_name +  ' updateItem query');
  let sql = `
      UPDATE comment_info
      SET comment=$1,
          kyara_id=$2,
          link=$3, 
          publish_datetime_start=$4, 
          publish_datetime_end=$5,
          last_updated_user_id=$6, 
          user_name=$7, 
          last_updated_date=$8
          
      WHERE id=$9;
      `
      let values = [
        req.body.comment,
        req.body.kyaraAttrId,
        req.body.link,
        req.body.publish_datetime_start,
        req.body.publish_datetime_end,
        session[0].user_id,
        session[0].user_name,
        util.getCurrentDate(),
        req.body.commentId
      ];

  return await connection.queryCount(sql,values);

}

/**
 * キャラ情報を削除する
 */
 exports.deleteItem = async (id) => {

  var sql = `
  delete from comment_info where id = $1;
  `
  let values = [id];
  
  return await connection.queryCount(sql,values);

}