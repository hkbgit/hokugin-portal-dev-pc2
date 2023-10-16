const connection = require('../submodules/postgres');
const util = require('../submodules/util');
const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');


/**
* TOP画面バナー一覧に表示する情報を全件取得する。
* 契約者通番をgetパラメータにセットしている場合は取り出して、契約者通番に紐づくTOP画面バナーを取得する。
* その際、デフォルトTOPバナーは取得しない。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
*/
exports.getAllTopBanners = async (req, res, session, callback) => {
  const contractNumber = req.query.contract_no;
  logger.debug(`contract_no is ${contractNumber}`);
  let join = (!contractNumber)
    ? ``
    : `
      INNER JOIN top_banner_display_inventory
      ON top_banner_display_inventory.top_banner_id = top_banners.id
      AND top_banner_display_inventory.contract_no = $1
      AND top_banners.is_default = 0
    `
  let sql = `
    SELECT
      top_banners.*,
      top_banner_attributes.name as top_banner_attribute_name
    FROM top_banners
    ${join}
    INNER JOIN top_banner_attributes ON top_banners.top_banner_attribute_id = top_banner_attributes.id
  `;
  logger.debug('execute getAllTopBanners query');
  if (!contractNumber) {
    connection.queryCallBack(sql, [], function (err, rows) {
      callback(err, req, res, session, rows);
    });
  } else {
    connection.queryCallBack(sql, [contractNumber], function (err, rows) {
      callback(err, req, res, session, rows);
    });
  }

};

/**
 * 引数で指定したTOPバナー属性IDを取得する。
 * @param attributeId top_banner_attributesテーブルの主キーを指定
 * @param callback SQL実行後に呼ばれるコールバック
 */
exports.getTopBannerAttribute = async (attributeId, callback) => {

  const sql = ` SELECT top_banner_attributes.name FROM top_banner_attributes WHERE top_banner_attributes.id = $1 `;
  logger.debug('execute getTopBannerAttribute query');
  connection.queryCallBack(sql, attributeId, function (err, rows) {
    callback(err, rows);
  });
}

/**
 * 引数で指定したにバナー配置場所ID対応するバナー配置場所を取得する。
 * @param positionId banner_positionテーブルの主キーを指定
 * @param callback SQL実行後に呼ばれるコールバック
 */
exports.getBannerPosition = async (positionId, callback) => {

  const sql = ` SELECT banner_position.max_displayable_number FROM banner_position WHERE banner_position.id = $1 `;
  logger.debug('execute getBannerPosition query');
  connection.queryCallBack(sql, positionId, function (err, rows) {
    callback(err, rows);
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
 */
exports.getPublishBanners = function (positionId, maxDisplayableNumber, callback) {
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
  connection.queryCallBack(sql, values, function (err, rows) {
    callback(err, rows);
  });
}

/**
 * TOP画面バナー(一般バナーと同じ情報)を新規登録する。
 * @param connection
 * @param req
 * @param imagePath イメージパス
 */
exports.createBanner = async (req, imagePath, session) => {
  const priority = (isNaN(parseInt(req.body.priority, 10)) ? 99999 : parseInt(req.body.priority, 10));
  // const bannerPositionId = (isNaN(parseInt(req.body.bannerPosition, 10)) ? null : parseInt(req.body.bannerPosition, 10));
  let bannerPositionId = req.body.bannerPosition;
  // if(req.body.bannerPosition.indexOf('banner_position')=== -1){
  //   bannerPositionId = 'banner_position:'+req.body.bannerPosition;
  // }else{
  //   bannerPositionId = req.body.bannerPosition;
  // }

  const positionSql = "select * from banner_position where id = $1;";
  const positionValue = [bannerPositionId];
  var position = await connection.query(positionSql, positionValue);

  const sql = `
    INSERT INTO banners
      (title,
      banner_position_id,
      position_name,
      image_path,
      link,
      publish_datetime_start,
      publish_datetime_end,
      priority,
      comment,
      last_updated_user_id,
      user_name,
      last_updated_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
    RETURNING id;
  `;
  const values = [
    req.body.title,
    bannerPositionId,
    position[0].name,
    imagePath,
    req.body.link,
    req.body.publish_datetime_start,
    req.body.publish_datetime_end,
    priority,
    req.body.comment,
    session[0].user_id,
    session[0].user_name,
    util.getCurrentDate()
  ];

  logger.debug('execute createBanner query');
  return await connection.query(sql, values);
}

/**
 * TOP画面バナー(TOPバナーのunique情報)を新規登録する。
 */
exports.createTopBanner = async function (isDefault, topBannerAttributeId, insertId, csvFileName = null) {
  logger.debug('get bannerID : ' + insertId);

  logger.debug('execute createTopBanner query');

  const selectSql = "select * from banners where id = $1"
  const selectValues = [insertId]

  var banner = await connection.query(selectSql, selectValues);

  const sql = `
    INSERT INTO top_banners
      (
      banner_id,
      title,
      position_name,
      image_path,
      link,
      publish_datetime_start,
      publish_datetime_end,
      priority,
      comment,
      user_name,
      last_updated_date,
      is_default,
      top_banner_attribute_id,
      connected_csv,
      process_start_datetime
      )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
    RETURNING id;
  `;
  const values = [
    insertId,
    banner[0].title,
    banner[0].position_name,
    banner[0].image_path,
    banner[0].link,
    banner[0].publish_datetime_start,
    banner[0].publish_datetime_end,
    banner[0].priority,
    banner[0].comment,
    banner[0].user_name,
    banner[0].last_updated_date,
    isDefault ? 1 : 0,
    topBannerAttributeId,
    csvFileName,
    util.getCurrentDate()
  ];


  logger.debug('execute createBanner query');
  return await connection.query(sql, values);
}

/**
 * TOP画面バナー(一般バナーと同じ情報)を更新する
 * @param connection
 * @param req
 * @param targetTopBannerId
 * @param imagePath
 * @param csvFileName
 */
exports.updateTopBanner = async function (req, session, targetTopBannerId, imagePath = null, csvFileName = null) {


  const priority = (isNaN(parseInt(req.body.priority, 10)) ? 99999 : parseInt(req.body.priority, 10));

  let bannerPositionId = req.body.bannerPosition;
  let topBannerAttributeId = req.body.topBannerAttribute;

  let topBanner = await searchTopBannerInfo(targetTopBannerId);
  let banner = await searchBannerInfo(topBanner.banner_id);


  let bannerPosition = await getBannerPosition(bannerPositionId)

  topBanner.is_default = parseInt(req.body.is_default);
  topBanner.top_banner_attribute_id = topBannerAttributeId;
  //topBanner.top_banner_attribute_name = top_banner_attribute.docs[0].name;
  topBanner.title = req.body.title;
  topBanner.banner_position_id = bannerPositionId;
  topBanner.position_name = bannerPosition.name;
  topBanner.link = req.body.link;
  topBanner.publish_datetime_start = req.body.publish_datetime_start;
  topBanner.publish_datetime_end = req.body.publish_datetime_end;
  topBanner.priority = priority;
  topBanner.comment = req.body.comment;
  topBanner.last_updated_user_id = session[0].user_id;
  topBanner.user_name = session[0].user_name;
  topBanner.last_updated_date = util.getCurrentDateTimeWithSeconds();

  banner.title = req.body.title;
  banner.banner_position_id = bannerPositionId;
  banner.position_name = bannerPosition.name;
  banner.link = req.body.link;
  banner.publish_datetime_start = req.body.publish_datetime_start;
  banner.publish_datetime_end = req.body.publish_datetime_end;
  banner.priority = priority;
  banner.comment = req.body.comment;
  banner.last_updated_user_id = session[0].user_id;
  banner.user_name = session[0].user_name;
  banner.last_updated_date = util.getCurrentDateTimeWithSeconds();

  if (imagePath && csvFileName) {
    //バナーイメージとcsvファイルの両方更新
    logger.debug('csv_updated is true image_updated is true : ' +targetTopBannerId);
    banner.image_path = imagePath;
    topBanner.image_path = imagePath;
    topBanner.connected_csv = csvFileName;
  } else if (csvFileName && !imagePath) {
    //csvファイル更新
    logger.debug('csv_updated is true image_updated is false : ' +targetTopBannerId);
    topBanner.connected_csv = csvFileName;
  } else if (!csvFileName && imagePath) {
    //バナーイメージ更新
    logger.debug('csv_updated is false image_updated is true : ' + targetTopBannerId);
    banner.image_path = imagePath;
    topBanner.image_path = imagePath;
  } else {
    // csvファイル、バナーイメージを更新しない場合
    logger.debug('csv_updated is false image_updated is false : ' + targetTopBannerId);
  }

  await updateTopBanner(topBanner)

  return await updateBanner(banner)

}

async function getBannerPosition(bannerPositionId){
  const positionSql = "select * from banner_position where id = $1;";
  const positionValue = [bannerPositionId];
  var position = await connection.query(positionSql, positionValue);
  return position[0];
}

async function updateTopBanner(topBanner) {

  const sql = `
    UPDATE top_banners
    SET 
      title=$1, 
      position_name=$2, 
      image_path=$3, 
      link=$4, 
      publish_datetime_start=$5, 
      publish_datetime_end=$6, 
      priority=$7, 
      comment=$8, 
      user_name=$9, 
      last_updated_date=$10, 
      is_default=$11, 
      top_banner_attribute_id=$12, 
      connected_csv=$13, 
      process_start_datetime=$14
    WHERE id=$15;
  `
  var values = [
    topBanner.title,
    topBanner.position_name,
    topBanner.image_path,
    topBanner.link,
    topBanner.publish_datetime_start,
    topBanner.publish_datetime_end,
    topBanner.priority,
    topBanner.comment,
    topBanner.user_name,
    topBanner.last_updated_date,
    topBanner.is_default,
    topBanner.top_banner_attribute_id,
    topBanner.connected_csv,
    topBanner.process_start_datetime,
    topBanner.id
  ]

  logger.debug('execute session update query');
  return await connection.query(sql, values);
}

async function updateBanner(banner) {
  const sql = `
    UPDATE banners
    SET 
    title=$1, 
    banner_position_id=$2, 
    position_name=$3, 
    image_path=$4, 
    link=$5, 
    publish_datetime_start=$6, 
    publish_datetime_end=$7, 
    priority=$8, 
    comment=$9, 
    last_updated_user_id=$10, 
    user_name=$11, 
    last_updated_date=$12
    WHERE id=$13;
  `
  var values = [
    banner.title,
    banner.banner_position_id,
    banner.position_name,
    banner.image_path,
    banner.link,
    banner.publish_datetime_start,
    banner.publish_datetime_end,
    banner.priority,
    banner.comment,
    banner.last_updated_user_id,
    banner.user_name,
    banner.last_updated_date,
    banner.id
  ]

  logger.debug('execute session update query');
  return await connection.query(sql, values);
}

async function searchTopBannerInfo(topBannerId) {
  const sql = "SELECT * FROM top_banners WHERE id = $1 ;";
  const values = [topBannerId];
  logger.debug('execute auth query');
  var rows =  await connection.query(sql, values);
  return rows[0];
}

async function searchBannerInfo(bannerId) {
  const sql = "SELECT * FROM banners WHERE id = $1 ;";
  const values = [bannerId];
  logger.debug('execute auth query')
  var rows = await connection.query(sql, values);
  return rows[0];
}

async function searchTopBannerDisplayInventory(topBannerId) {
  const sql = "SELECT * FROM top_banner_display_inventory WHERE top_banner_id = $1 ;";
  const values = [topBannerId];
  logger.debug('execute auth query')
  var rows = await connection.query(sql, values);
  return rows[0];
}

/**
* 指定したTOP画面バナーIDのTOP画面バナー情報を取得する。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
* @param topbannerId TOP画面バナーID
*/
exports.getTopBannerInfo = async (req, res, session, callback, topBannerId) => {
  const sql = "SELECT * FROM top_banners WHERE id = $1 ;";
  const values = [topBannerId];
  logger.debug('execute auth query');
  connection.queryCallBack(sql, values, function(err, rows) {
    callback(err, req, res,session, rows);
  });
  
}

/**
* 指定したTOP画面バナーIDのTOP画面バナー情報を取得する。
* @param req リクエスト
* @param topbannerId TOP画面バナーID
*/
exports.getTopBannerInfoSync = async function (topBannerId) {
  logger.debug('execute getTopBannerInfoSync query');
  return searchTopBannerInfo(topBannerId);
}

/**
 * Top画面バナー情報を削除する
 */
exports.deleteTopBanner = async (topBannerId) => {

  let result = {};
  let successNum = 0;
  let errorNum = 0;

  var displaySql = `
      delete from top_banner_display_inventory using top_banners 
      where top_banner_id = $1 and top_banners.id = top_banner_display_inventory.top_banner_id;
      `
  var bannerSql = `
    delete from banners using top_banners 
    where top_banners.id = $1  and top_banners.banner_id = banners.id;
    `
  var topBannerSql = `
    delete from top_banners where id = $1;
    `
  var values = [topBannerId]

  var count = await connection.queryCount(displaySql,values);
  // if (count > 0) {
  //   successNum++;
  //   result.successNum = successNum;
  // } else {
  //   errorNum++;
  //   result.errorNum = errorNum;
  //   result.errId = topBannerId;
  // }

  var bannerCount = await connection.queryCount(bannerSql,values);

  if (bannerCount > 0) {
    successNum++;
    result.successNum = successNum;
  } else {
    errorNum++;
    result.errorNum = errorNum;
    result.errId = topBannerId;
  }

  var topBannerCount = await connection.queryCount(topBannerSql,values);

  if (topBannerCount > 0) {
    successNum++;
    result.successNum = successNum;
  } else {
    errorNum++;
    result.errorNum = errorNum;
    result.errId = topBannerId;
  }


  return result;

}

exports.findNotBannerId = async function(contractNumber){
  logger.debug('execute findNotBannerId query');
  const sql = `
    SELECT
      ID
    FROM
      TOP_BANNERS TB
    WHERE
      TB.IS_DEFAULT = '1'
      AND TB.ID NOT IN (
      SELECT
        TOP_BANNER_ID
      FROM
        TOP_BANNER_DISPLAY_INVENTORY TBDI
      WHERE
        TBDI.CONTRACT_NO = $1)
  `;
  const values = [
    contractNumber
  ];
  logger.debug('execute findNotBannerId query');
  let rows = await connection.query(sql, values)

  return rows;

}

/**
 * デフォルトバナーを取得する（新規契約者通番ユーザー or 契約者通番なしユーザーに表示）
 */
exports.findDefaultBanner = async function () {
  logger.debug('execute findDefaultBanner query');
  const currentDateTime = util.getCurrentDateTime();

  const sql = `
  SELECT
    id,
    is_default,
    top_banner_attribute_id,
    priority,
    image_path,
    link,
    title,
    last_updated_date
  FROM top_banners
  WHERE
    is_default = 1
    AND
    (
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
    )
  ORDER BY
    priority IS NULL ASC,
    priority ASC,
    last_updated_date
  `;
  const values = [
    currentDateTime
  ];
  logger.debug('execute getPublishBanners query');
  let rows = await connection.query(sql, values)

  var datas = { "datas": rows };
  return datas;
  
}

/**
 * TOPバナーの処理開始時刻を更新する
 * @param isProcessing: true => 現在の日時をセット, false => 処理開始時刻を初期化(空文字をセット)
 */
const updateProcessStartDatetime = async (topBannerId, isProcessing = false) => {

  const sql = `
    UPDATE top_banners
    SET
      process_start_datetime = $1
    WHERE
      id = $2
    ;
  `;
  const values = [isProcessing ? util.getCurrentDateTime() : '', topBannerId];
  logger.debug('execute updateProcessStartDatetime query: ' + isProcessing ? 'process start' : 'process end');
  logger.debug('processing topBannerId => ' + topBannerId)
  return await connection.query(sql, values);

}

exports.updateProcessStartDatetime = updateProcessStartDatetime;

/**
 * 登録/編集処理中のTOPバナーを取得する
 */
const selectProcessingTopBanner = async () => {

  const sql = `
    SELECT *
    FROM top_banners
    WHERE process_start_datetime != ''
    ;
  `;
  logger.debug('execute selectProcessingTopBanner query');
  return await connection.query(sql);

}

/**
 * 処理中プロセスの有無チェックを行う
 * 処理中プロセスがある場合はtrueを返し、処理中プロセスがない場合はfalseを返す
 * 処理中プロセスでも指定時間経過している場合は強制的に処理中フラグをリセットしてfalseを返す
 * 処理中プロセスが複数ある場合は例外とするが、指定時間経過していたら強制的に処理中フラグをリセットする
 */
exports.hasProccessingRecord = async () => {
  logger.info('hasProcessingRecord() called');
  let isLocking = true;
  const procesingBanners = await selectProcessingTopBanner();
  if (1 === procesingBanners.length) {
    const processingBanner = procesingBanners[0];
    const startTime = processingBanner.process_start_datetime;
    const PATTERN_DATETIME = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/;
    if (!startTime.match(PATTERN_DATETIME)) {
      throw Error('datetime pattern not matched to process_start_datetime');
    }
    if (0 <= util.compareDateTimeWhetherSpentMinutes(startTime, constants.FORCE_FREE_PROCESS_MINUTES)) {
      // 強制リセット時間が経過した場合は処理中フラグをリセットする
      let _ = await updateProcessStartDatetime(processingBanner.id, false);
      logger.info('force free processing top banner records has done. top_banners.id => ' + processingBanner.id);
      isLocking = false;
    }
  } else if (1 < procesingBanners.length) {
    //処理中レコードが2個以上ある場合、例外投げる前に強制ロック解除時間をチェックする
    for (const processingBanner of procesingBanners) {
      const startTime = processingBanner.process_start_datetime;
      const PATTERN_DATETIME = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/;
      if (!startTime.match(PATTERN_DATETIME)) {
        throw Error('datetime pattern not matched to process_start_datetime');
      }
      if (0 <= util.compareDateTimeWhetherSpentMinutes(startTime, constants.FORCE_FREE_PROCESS_MINUTES)) {
        // 強制リセット時間が経過した場合は処理中フラグをリセットする
        let _ = await updateProcessStartDatetime(processingBanner.id, false);
      }
    }
    throw Error('multiple processing records detected');
  } else {
    // 処理中レコードが0件の場合
    isLocking = false;
  }
  return isLocking;
}
