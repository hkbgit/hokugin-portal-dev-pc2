const connection = require('../submodules/db-connection');
const util = require('../submodules/util');
const fs = require('fs');
const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');

/**
* バナー一覧に表示する情報を全件取得する。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
*/
exports.getAllBanners = function(req, res, callback) {
  const sql = `
  SELECT
    banners.id AS id,
    banners.title AS title,
    banner_position.name AS position_name,
    banners.image_path AS image_path,
    banners.link AS link,
    banners.publish_datetime_start AS publish_datetime_start,
    banners.publish_datetime_end AS publish_datetime_end,
    banners.priority AS priority,
    banners.comment AS comment,
    users.name AS user_name,
    banners.last_updated_date AS last_updated_date
  FROM banners
  INNER JOIN users ON banners.last_updated_user_id = users.id
  INNER JOIN banner_position ON banners.banner_position_id = banner_position.id
  WHERE banners.banner_position_id not in('7');
  `;
  logger.debug('execute getAllBanners query');
  connection.query(sql, function(err, rows) {
    callback(err, req, res, rows);
  });
};

/**
 * 引数で指定したバナー配置場所IDに対応するバナー配置場所を取得する。
 * @param positionId banner_positionテーブルの主キーを指定
 * @param callback SQL実行後に呼ばれるコールバック
 我注释的
exports.getBannerPosition = function(positionId, callback) {
  const sql = `
  SELECT
    banner_position.max_displayable_number
  FROM
    banner_position
  WHERE
    banner_position.id = ?
  `;
  logger.debug('execute getBannerPosition query');
  connection.query(sql, positionId, function(err, rows) {
    callback(err, rows);
  });
}
*/
exports.getBannerPosition = async (positionId, callback)=> {
  if(positionId.indexOf("banner_position") === -1){
    positionId = 'banner_position:'+positionId;
  }
  let params = {
    "selector":{
      "_id":positionId
    },
    "fields": ['max_displayable_number']
  };
  logger.debug('execute getBannerPosition query');
  await db.partitionedFind('banner_position', params,(err, body) => {
    callback(err,body.docs);//body.docs:[{'max_displayable_number':10}]
    });
}
/**
 * 引数で指定したバナー配置場所に対応した、公開可能バナー情報を取得する。
 * 取得するバナー情報は以下の条件
 * ・公開中であること
 * ・表示優先順位の昇順であること（nullは末尾とする）
 * ・表示優先順位が重複した場合はIDの昇順であること
 * ・配置場所の表示件数まで取得すること
 * @param positionId banner_positionテーブルの主キーを指定
 * @param maxDisplayableNumber banner_positionテーブルの最大表示可能バナー件数を指定
 * @param callback SQL実行後に呼ばれるコールバック
我注释的
exports.getPublishBanners = function(positionId, maxDisplayableNumber, callback) {
  const currentDateTime = util.getCurrentDateTime();
  const sql = `
  SELECT
    id,
    banner_position_id,
    image_path,
    link,
    priority
  FROM banners
  WHERE
    banner_position_id = ?
    AND
    (
      ((publish_datetime_start = '' OR publish_datetime_start IS NULL)
        AND (publish_datetime_end = '' OR publish_datetime_end IS NULL))
      OR
      (publish_datetime_start <= ? AND ? <= publish_datetime_end)
      OR
      ((publish_datetime_start = '' OR publish_datetime_start IS NULL)
        AND ? <= publish_datetime_end)
      OR
      (publish_dateTime_start <= ?
        AND (publish_datetime_end = '' OR publish_datetime_end IS NULL))
    )
  ORDER BY
    priority IS NULL ASC,
    priority ASC,
    id ASC
  LIMIT
    ? ;
  `;
  const values = [
    positionId,
    currentDateTime,
    currentDateTime,
    currentDateTime,
    currentDateTime,
    maxDisplayableNumber
  ];
  logger.debug('execute getPublishBanners query');
  connection.query(sql, values, function(err, rows) {
    callback(err, rows);
  });
}
 */
exports.getPublishBanners = async (positionId, maxDisplayableNumber, callback) => {
  const currentDateTime = util.getCurrentDateTime();
  if(positionId.indexOf('banner_position') === -1){
    positionId = 'banner_position:'+positionId;
  }
  const params = {
    "selector":{
          "banner_position_id":positionId,
          "$or":[
            {
              "publish_datetime_start":""
            },
            {
              "publish_datetime_start":null
            },
            {
              "publish_datetime_start":{
                "$lte":currentDateTime
              }
            }
          ],
          "$or":[
            {
              "publish_datetime_end":""
            },
            {
              "publish_datetime_end":null
            },
            {
              "publish_datetime_end":{
                "$gte":currentDateTime
              }
            }
          ],
        },
    "fields":[
        "id",
        "banner_position_id",
        "image_path",
	      "link",
	      "priority"
    ],
    "sort":[
      {"priority":"asc"},
      {"_id":"asc"}
    ]
};
  logger.debug('execute getPublishBanners query');
  await db.partitionedFind('banners', params,(err, body) => {
    let is_null = [];
    let not_null = [];
    for(let i = 0;i<body.docs.length;i++){
      if(isNull(body.docs[i].priority)){
        is_null.push(body.docs[i]);
      }else{
        not_null.push(body.docs[i]);
      }
    }
    let rows = not_null.concat(is_null);
    if(rows.length>maxDisplayableNumber){
      let limit_rows = [];
      for(let i = 0;i<maxDisplayableNumber;i++){
        limit_rows.push(rows[i]);
      }
      callback(err,limit_rows);
    }else{
      callback(err, rows);
    }
});
}
/**
* バナーを新規登録する。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
* @param imagePath 画像ファイルの格納パス
*/
exports.createBanner = function(req, res, callback, imagePath) {
  const priority = (isNaN(parseInt(req.body.priority, 10)) ? null : parseInt(req.body.priority, 10));
  const bannerPositionId = (isNaN(parseInt(req.body.bannerPosition, 10)) ? null : parseInt(req.body.bannerPosition, 10));
  const sql = `
  INSERT INTO banners
    (title,
    banner_position_id,
    image_path,
    link,
    publish_datetime_start,
    publish_datetime_end,
    priority,
    comment,
    last_updated_user_id,
    last_updated_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ? ,?);
  `;
  const values = [
    req.body.title,
    bannerPositionId,
    imagePath,
    req.body.link,
    req.body.publish_datetime_start,
    req.body.publish_datetime_end,
    priority,
    req.body.comment,
    req.session.user_id,
    util.getCurrentDate()
  ];
  logger.debug('execute createBanner query');
  connection.query(sql, values, function(err, result) {
    callback(err, req, res, result, imagePath);
  });
};

/**
* バナー情報を更新する
* @param req バナー情報を格納したリクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
* @param imagePath 画像ファイルの格納パス。省略時は画像ファイルの更新は行わない。パスには静的フォルダまでのパスは不要。
*/
exports.updateBanner = function(req, res, callback, imagePath = null) {
  const targetBannerId = (isNaN(parseInt(req.body.bannerId, 10)) ? null :  parseInt(req.body.bannerId));
  const priority = (isNaN(parseInt(req.body.priority, 10)) ? null :  parseInt(req.body.priority, 10));
  const bannerPositionId = (isNaN(parseInt(req.body.bannerPosition, 10)) ? null :  parseInt(req.body.bannerPosition, 10));
  let sql = "UPDATE banners";
  let values = undefined;
  if (null != imagePath) {
    sql += " SET title = ?, banner_position_id = ?, image_path = ?, link = ?, publish_datetime_start = ?, publish_datetime_end = ?, priority = ?, comment = ?, last_updated_user_id = ?, last_updated_date = ?";
    values = [
      req.body.title,
      bannerPositionId,
      imagePath,
      req.body.link,
      req.body.publish_datetime_start,
      req.body.publish_datetime_end,
      priority,
      req.body.comment,
      req.session.user_id,
      util.getCurrentDate(),
      targetBannerId
    ];
  } else {
    // 画像ファイル未設定の場合は更新しない
    sql += " SET title = ?, banner_position_id = ?, link = ?, publish_datetime_start = ?, publish_datetime_end = ?, priority = ?, comment = ?, last_updated_user_id = ?, last_updated_date = ?";
    values = [
      req.body.title,
      bannerPositionId,
      req.body.link,
      req.body.publish_datetime_start,
      req.body.publish_datetime_end,
      priority,
      req.body.comment,
      req.session.user_id,
      util.getCurrentDate(),
      targetBannerId
    ];
  }
  sql += " WHERE id = ? ;"

  logger.debug('execute updateBanner query');
  connection.query(sql, values, function(err, result) {
    callback(err, req, res, result, imagePath);
  });
}

/**
* 指定したバナーIDのバナー情報を取得する。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
* @param bannerId バナーID
*/
exports.getBannerInfo = function(req, res, callback, bannerId) {
  const sql = `
  SELECT
    banners.id AS id,
    banners.title AS title,
    banner_position.name AS position_name,
    banners.image_path AS image_path,
    banners.link AS link,
    banners.publish_datetime_start AS publish_datetime_start,
    banners.publish_datetime_end AS publish_datetime_end,
    banners.priority AS priority,
    banners.comment AS comment
  FROM banners
  INNER JOIN banner_position ON banners.banner_position_id = banner_position.id
  WHERE banners.id = ?;
  `;
  const values = [parseInt(bannerId, 10)];
  logger.debug('execute getBannerInfo query');
  connection.query(sql, values, function(err, rows) {
    callback(err, req, res, rows);
  });
}

/**
* 指定したバナーIDのバナー情報を取得する。
*/
exports.getBannerInfoSync = async function(connection, bannerId) {
  const sql = `
  SELECT
    banners.id AS id,
    banners.title AS title,
    banner_position.name AS position_name,
    banners.image_path AS image_path,
    banners.link AS link,
    banners.publish_datetime_start AS publish_datetime_start,
    banners.publish_datetime_end AS publish_datetime_end,
    banners.priority AS priority,
    banners.comment AS comment
  FROM banners
  INNER JOIN banner_position ON banners.banner_position_id = banner_position.id
  WHERE banners.id = ?;
  `;
  const values = [parseInt(bannerId, 10)];
  logger.debug('execute getBannerInfoSync query');
  return await connection.query(sql, values);
}
/**
 * バナー情報を削除する
 * @param req リクエスト
 * @param res レスポンス
 * @param callback SQL実行後に呼ばれるコールバック
 */
exports.deleteBanner = function(req, res, callback) {
  const BANNER_ID = parseInt(req.body.targetId, 10);
  const sql = "DELETE FROM banners WHERE id = ?;";
  const values = [BANNER_ID];
  logger.debug('execute deleteBanner query');
  connection.query(sql, values, function(err, result) {
    callback(err, req, res, result);
  });
}
