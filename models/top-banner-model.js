const connection = require('../submodules/db-connection');
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
exports.getAllTopBanners = function(req, res, callback) {
  const contractNumber = req.query.contract_no;
  logger.debug(`contract_no is ${contractNumber}`);
  let join = (!contractNumber)
    ? `INNER JOIN top_banners ON top_banners.banner_id = banners.id`
    : `INNER JOIN (
      SELECT top_banners.* FROM top_banners
      INNER JOIN top_banner_display_inventory
      ON top_banner_display_inventory.top_banner_id = top_banners.id
      WHERE top_banner_display_inventory.contract_no = ?
      AND top_banners.is_default = 0
    ) AS top_banners ON top_banners.banner_id = banners.id`
  let sql = `
  SELECT
    top_banners.id AS id,
    banners.title AS title,
    top_banners.is_default AS is_default,
    banner_position.name AS position_name,
    top_banner_attributes.name AS top_banner_attribute_name,
    banners.image_path AS image_path,
    top_banners.connected_csv AS connected_csv,
    banners.link AS link,
    banners.publish_datetime_start AS publish_datetime_start,
    banners.publish_datetime_end AS publish_datetime_end,
    banners.priority AS priority,
    banners.comment AS comment,
    users.name AS user_name,
    banners.last_updated_date AS last_updated_date
  FROM banners
  ${join}
  INNER JOIN users ON banners.last_updated_user_id = users.id
  INNER JOIN banner_position ON banners.banner_position_id = banner_position.id
  INNER JOIN top_banner_attributes ON top_banners.top_banner_attribute_id = top_banner_attributes.id
  `;
  logger.debug('execute getAllTopBanners query');
  if(!contractNumber) {
    connection.query(sql, function(err, rows) {
      callback(err, req, res, rows);
    });
  } else {
    connection.query(sql,[contractNumber],function(err, rows) {
      callback(err, req, res, rows);
    });
  }
};

/**
 * 引数で指定したTOPバナー属性IDを取得する。
 * @param attributeId top_banner_attributesテーブルの主キーを指定
 * @param callback SQL実行後に呼ばれるコールバック
 */
exports.getTopBannerAttribute = function(attributeId, callback) {
  const sql = `
  SELECT
    top_banner_attributes.name
  FROM
    top_banner_attributes
  WHERE
    top_banner_attributes.id = ?
  `;
  logger.debug('execute getTopBannerAttribute query');
  connection.query(sql, attributeId, function(err, rows) {
    callback(err, rows);
  });
}

/**
 * 引数で指定したにバナー配置場所ID対応するバナー配置場所を取得する。
 * @param positionId banner_positionテーブルの主キーを指定
 * @param callback SQL実行後に呼ばれるコールバック
 */
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

/**
 * TOP画面バナー(一般バナーと同じ情報)を新規登録する。
 * @param connection
 * @param req
 * @param imagePath イメージパス
 */
exports.createBanner = async function(connection, req, imagePath) {
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
    util.getCurrentDateTimeWithSeconds()
  ];
  logger.debug('execute createBanner query');
  return await connection.query(sql, values);
}

/**
 * TOP画面バナー(TOPバナーのunique情報)を新規登録する。
 */
exports.createTopBanner = async function(connection, isDefault, topBannerAttributeId, insertId, csvFileName = null) {
  logger.debug('get bannerID : ' + insertId);
  const sql = `
    INSERT INTO top_banners
      (banner_id,
      is_default,
      top_banner_attribute_id,
      connected_csv,
      process_start_datetime)
    VALUES (?, ?, ?, ?, ?);
  `;
  const values = [
    insertId,
    isDefault,
    topBannerAttributeId,
    isDefault ? '' : csvFileName,
    util.getCurrentDateTime()
  ];
  logger.debug('execute createTopBanner query');
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
exports.updateTopBanner = async function(connection, req, targetTopBannerId, imagePath = null, csvFileName = null) {
  const priority = (isNaN(parseInt(req.body.priority, 10)) ? null :  parseInt(req.body.priority, 10));
  const bannerPositionId = (isNaN(parseInt(req.body.bannerPosition, 10)) ? null : parseInt(req.body.bannerPosition, 10));
  const topBannerAttributeId = (isNaN(parseInt(req.body.topBannerAttribute, 10)) ? null : parseInt(req.body.topBannerAttribute, 10));
  logger.debug('imagePath : ' + imagePath);
  logger.debug('csvFileName : ' + (!!csvFileName));
  let sql = `
    UPDATE banners, top_banners
    SET
      banners.title = ?,
      top_banners.is_default = ?,
      banners.banner_position_id = ?,
      top_banners.top_banner_attribute_id = ?,
      banners.link = ?,
      banners.publish_datetime_start = ?,
      banners.publish_datetime_end = ?,
      banners.priority = ?,
      banners.comment = ?,
      banners.last_updated_user_id = ?,
      banners.last_updated_date = ?
  `;
  let values = [
    req.body.title,
    req.body.is_default,
    bannerPositionId,
    topBannerAttributeId,
    req.body.link,
    req.body.publish_datetime_start,
    req.body.publish_datetime_end,
    priority,
    req.body.comment,
    req.session.user_id,
    util.getCurrentDateTimeWithSeconds()
  ];
  if (imagePath && csvFileName) {
    //バナーイメージとcsvファイルの両方更新
    logger.debug('csv_updated is true image_updated is true : ' +targetTopBannerId);
    sql += `
      , banners.image_path = ?,
      top_banners.connected_csv = ?
    `;
    values.push(imagePath, csvFileName);
  } else if (csvFileName && !imagePath) {
    //csvファイル更新
    logger.debug('csv_updated is true image_updated is false : ' +targetTopBannerId);
    sql += `
      , top_banners.connected_csv = ?
    `;
    values.push(csvFileName);
  } else if (!csvFileName && imagePath) {
    //バナーイメージ更新
    logger.debug('csv_updated is false image_updated is true : ' + targetTopBannerId);
    sql += `
      , banners.image_path = ?
    `;
    values.push(imagePath);
  } else {
    // csvファイル、バナーイメージを更新しない場合
    logger.debug('csv_updated is false image_updated is false : ' + targetTopBannerId);
  }

  sql += `
    WHERE top_banners.id = ?
    AND top_banners.banner_id = banners.id;
  `;
  values.push(targetTopBannerId);
  logger.debug('execute updateTopBanner query');
  return await connection.query(sql, values);
}

/**
* 指定したTOP画面バナーIDのTOP画面バナー情報を取得する。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
* @param topbannerId TOP画面バナーID
*/
exports.getTopBannerInfo = function(req, res, callback, topBannerId) {
  const sql = `
  SELECT
    top_banners.id AS id,
    banners.title AS title,
    top_banners.is_default AS is_default,
    top_banner_attributes.name AS top_banner_attribute_name,
    banners.image_path AS image_path,
    banners.link AS link,
    top_banners.connected_csv AS connected_csv,
    banners.publish_datetime_start AS publish_datetime_start,
    banners.publish_datetime_end AS publish_datetime_end,
    banners.priority AS priority,
    banners.comment AS comment
  FROM banners
  INNER JOIN top_banners ON top_banners.banner_id = banners.id
  INNER JOIN top_banner_attributes ON top_banners.top_banner_attribute_id = top_banner_attributes.id
  WHERE top_banners.id = ?;
  `;
  const values = [parseInt(topBannerId, 10)];
  logger.debug('execute getTopBannerInfo query');
  connection.query(sql, values, function(err, rows) {
    callback(err, req, res, rows);
  });
}

/**
* 指定したTOP画面バナーIDのTOP画面バナー情報を取得する。
* @param req リクエスト
* @param topbannerId TOP画面バナーID
*/
exports.getTopBannerInfoSync = async function(connection, topBannerId) {
  const sql = `
  SELECT
    top_banners.id AS id,
    banners.title AS title,
    top_banners.is_default AS is_default,
    top_banner_attributes.name AS top_banner_attribute_name,
    banners.image_path AS image_path,
    banners.link AS link,
    top_banners.connected_csv AS connected_csv,
    banners.publish_datetime_start AS publish_datetime_start,
    banners.publish_datetime_end AS publish_datetime_end,
    banners.priority AS priority,
    banners.comment AS comment
  FROM banners
  INNER JOIN top_banners ON top_banners.banner_id = banners.id
  INNER JOIN top_banner_attributes ON top_banners.top_banner_attribute_id = top_banner_attributes.id
  WHERE top_banners.id = ?;
  `;
  const values = [parseInt(topBannerId, 10)];
  logger.debug('execute getTopBannerInfoSync query');
  return await connection.query(sql, values);
}

/**
 * Top画面バナー情報を削除する
 */
exports.deleteTopBanner = async (connection, topBannerId) => {
  const sql = `
    DELETE top_banners, banners, top_banner_display_inventory
    FROM top_banners
    INNER JOIN banners ON top_banners.banner_id = banners.id
    INNER JOIN top_banner_display_inventory ON top_banners.id = top_banner_display_inventory.top_banner_id
    WHERE top_banners.id = ?;
  `;
  const values = [topBannerId];
  logger.debug('execute deleteTopBanner query');
  return await connection.query(sql, values);
}

/**
 * デフォルトバナーを取得する（新規契約者通番ユーザー or 契約者通番なしユーザーに表示）
 */
exports.findDefaultBanner = async function(connection) {
  logger.debug('execute findDefaultBanner query');
  const currentDateTime = util.getCurrentDateTime();
  const sql = `
    SELECT
      top_banners.id,
      top_banners.top_banner_attribute_id,
      banners.image_path,
      banners.link
    FROM top_banners
    INNER JOIN banners ON top_banners.banner_id = banners.id
    WHERE is_default = 1
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
      CASE
        WHEN priority is NULL then '1'
        ELSE '0'
      END,
      banners.priority, 
      banners.last_updated_date desc
    LIMIT 1
  `
  const values = [
    currentDateTime,
    currentDateTime,
    currentDateTime,
    currentDateTime
  ];
  const result = await connection.query(sql, values);
  if(result.length === 0) {
    return null
  }
  return result[0];
}

/**
 * TOPバナーの処理開始時刻を更新する
 * @param isProcessing: true => 現在の日時をセット, false => 処理開始時刻を初期化(空文字をセット)
 */
const updateProcessStartDatetime = async (connection, topBannerId, isProcessing = false) => {
  const sql = `
    UPDATE top_banners
    SET
      process_start_datetime = ?
    WHERE
      id = ?
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
const selectProcessingTopBanner = async (connection) => {
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
exports.hasProccessingRecord = async (connection) => {
  logger.info('hasProcessingRecord() called');
  let isLocking = true;
  const procesingBanners = await selectProcessingTopBanner(connection);
  if (1 === procesingBanners.length) {
    const processingBanner = procesingBanners[0];
    const startTime = processingBanner.process_start_datetime;
    const PATTERN_DATETIME = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/;
    if (!startTime.match(PATTERN_DATETIME)) {
      throw Error('datetime pattern not matched to process_start_datetime');
    }
    if (0 <= util.compareDateTimeWhetherSpentMinutes(startTime, constants.FORCE_FREE_PROCESS_MINUTES)) {
      // 強制リセット時間が経過した場合は処理中フラグをリセットする
      let _ = await updateProcessStartDatetime(connection, processingBanner.id, false);
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
        let _ = await updateProcessStartDatetime(connection, processingBanner.id, false);
      }
    }
    throw Error('multiple processing records detected');
  } else {
    // 処理中レコードが0件の場合
    isLocking = false;
  }
  return isLocking;
}
