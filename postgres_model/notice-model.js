const util = require('../submodules/util');
const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');

const connection = require('../submodules/postgres');

const model_name = "notice_model";

/**
* お知らせ一覧に表示する情報を全件取得する。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
*/
exports.getTopItems = async () => {
  logger.debug('execute ' + model_name + ' getTopItems query');

  const currentDateTime = util.getCurrentDateTime();

  const sql = `
    SELECT
      T1.*
    FROM
      NOTICE_INFO T1
    WHERE
      publish_datetime_start <= $1 AND 
      $1 <= publish_datetime_end
    `;

    let values = [currentDateTime]
    let rows = await connection.query(sql,values);

    if (rows.length > 0) {
      var index =  parseInt(rows.length * Math.random());
      return rows[index];
    }

    return null;

  };

/**
* お知らせ一覧に表示する情報を全件取得する。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
*/
exports.getItems = async (req, res, session, callback) => {
  logger.debug('execute ' + model_name + ' getItems query');
    const sql = `
    SELECT
      T1.*,
      T2.name AS user_name
    FROM
      NOTICE_INFO T1
    INNER JOIN USERS T2 ON
      T1.last_updated_user_id = T2.id
    `;

    let values = []
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
      NOTICE_INFO T1
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
  INSERT INTO public.NOTICE_INFO
  (  
    notice_title,
    link, 
    publish_datetime_start,
    publish_datetime_end,
    last_updated_user_id,
    last_updated_date)
  VALUES($1, $2, $3, $4, $5, $6);
  `
  let values = [
    req.body.notice,
    req.body.link,
    req.body.publish_datetime_start,
    req.body.publish_datetime_end,
    session[0].user_id,
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
      UPDATE NOTICE_INFO
      SET notice_title=$1,
          link=$2, 
          publish_datetime_start=$3, 
          publish_datetime_end=$4,
          last_updated_user_id=$5, 
          last_updated_date=$6
      WHERE id=$7;
      `
      let values = [
        req.body.notice,
        req.body.link,
        req.body.publish_datetime_start,
        req.body.publish_datetime_end,
        session[0].user_id,
        util.getCurrentDate(),
        req.body.noticeId
      ];

  return await connection.queryCount(sql,values);

}

/**
 * 削除する
 */
 exports.deleteItem = async (id) => {

  var sql = `
  delete from NOTICE_INFO where id = $1;
  `
  let values = [id];
  
  return await connection.queryCount(sql,values);

}