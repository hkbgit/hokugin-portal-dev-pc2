const util = require('../submodules/util');
const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');

const connection = require('../submodules/postgres');

const model_name = "extend_model";


/**
* TOP画面バナー一覧に表示する情報を全件取得する。
* 契約者通番をgetパラメータにセットしている場合は取り出して、契約者通番に紐づくTOP画面バナーを取得する。
* その際、デフォルトTOPバナーは取得しない。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
*/
exports.getItems = async(req) => {
  const contractNumber = req.query.contract_no;
  logger.debug(`contract_no is ${contractNumber}`);
  let sql = `
    SELECT * FROM extend_info order by priority asc
  `;
  
  let values = []
  let rows = await connection.query(sql,values);
  return rows;

};

/**
* TOP画面バナー一覧に表示する情報を全件取得する。
* 契約者通番をgetパラメータにセットしている場合は取り出して、契約者通番に紐づくTOP画面バナーを取得する。
* その際、デフォルトTOPバナーは取得しない。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
*/
exports.getAllExtends = async(req, res, session, callback) => {
  const contractNumber = req.query.contract_no;
  logger.debug(`contract_no is ${contractNumber}`);
  let sql = `
    SELECT * FROM extend_info order by priority asc
  `;
  let err = null;
  try{
    connection.queryCallBack(sql, [], function (err, rows) {
      callback(err, req, res, session, rows);
    });
  } catch (error) {
    err = error;
    callback(err, req, res, session);
  }
};

exports.getTopExtends = async() => {

  const currentDateTime = util.getCurrentDateTime();
  const sql = `
  SELECT
    *
  FROM extend_info
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
  ORDER BY
    priority IS NULL ASC,
    priority ASC,
    id ASC ;
  `;

  const values = [
    currentDateTime
  ];
  logger.debug('execute getPublishBanners query');

  try {
    return connection.query(sql,values);
  } catch (error) {
    err = error;
    return err;
  }
};

exports.getExtendDetail = async(extendId) => {
  let err = null;
    try {
      let sql = `
      SELECT * FROM extend_info WHERE id = $1;
      `;
      let values = [extendId]
      return connection.query(sql,values);
     
    } catch (error) {
      err = error;
      return err;
    }
};

/**
* バナー情報を更新する
* @param req バナー情報を格納したリクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
* @param imagePath 画像ファイルの格納パス。省略時は画像ファイルの更新は行わない。パスには静的フォルダまでのパスは不要。
*/
exports.updateExtend = async(req, res, session, callback, imagePath = null,imagePath1 = null) => {
  const targetBannerId = req.body.extendId;
  const priority = (isNaN(parseInt(req.body.priority, 10)) ? 99999 :  parseInt(req.body.priority, 10));
  let err = null;
  try {

    let infoSql = `
      SELECT * FROM extend_info WHERE id = $1;
      `;
      let infoValues = [targetBannerId]
      var extend = await connection.query(infoSql,infoValues);


    if (null == imagePath || '' == imagePath) {
      imagePath = extend[0].image_path;
    }

    if (null == imagePath1 || '' == imagePath1) {
      imagePath1 = extend[0].image_path1
    }

    let sql = `
      UPDATE extend_info
      SET title=$1,
          "smalTitle"=$2,
          image_path=$3,
          image_path1=$4,
          publish_datetime_start=$5, 
          publish_datetime_end=$6, 
          priority=$7, 
          comment=$8, 
          last_updated_user_id=$9, 
          user_name=$10, 
          last_updated_date=$11
          
      WHERE id=$12;
      `
    var values = [
      req.body.title,
      req.body.smalTitle,
      imagePath,
      imagePath1,
      req.body.publish_datetime_start,
      req.body.publish_datetime_end,
      priority,
      req.body.comment,
      session[0].user_id,
      session[0].user_name,
      util.getCurrentDate(),
      targetBannerId
    ]


    let result = await connection.queryCount(sql,values);
    callback(err, req, res, session, result, imagePath); 

  } catch (error) {
    err = error;
    callback(err, req, res, session, [], imagePath);
  }
  
};

exports.insertExtend3 = async(req, res, session, callback,imagePath) => {
  const targetBannerId = req.body.bannerPosition;
  const catalog = [];
  // for(i=1;i<req.body.catalogTitle.length;i++){
  const priority = (isNaN(parseInt(req.body.priority, 10)) ? 99999 : parseInt(req.body.priority, 10));
    const cl = {};
    cl.mc_id = new Date().getTime();
    cl.catalgTitle = req.body.smalTitle;
    cl.imagePath2 = imagePath;
    cl.catalgLink = req.body.comment;
    cl.priority = priority;
    catalog.push(cl);
  // }
  let err = null;
  try {
    let sql = `
      SELECT * FROM extend_info WHERE id = $1;
      `;
    let values = [targetBannerId]
    let rows = await connection.query(sql,values);

   
    var num = rows[0].catalog.length;

    for(i=0;i<num;i++){
      const cl1 = {};
      cl1.mc_id = rows[0].catalog[i].mc_id;
      cl1.catalgTitle = rows[0].catalog[i].catalgTitle;
      cl1.imagePath2 = rows[0].catalog[i].imagePath2;
      cl1.catalgLink = rows[0].catalog[i].catalgLink;
      cl1.priority = rows[0].catalog[i].priority;
      catalog.push(cl1);
    }
     
    logger.debug('execute updateExtend query');
    let updSql = `
    UPDATE extend_info
    SET 
        catalog=$1
        
    WHERE id=$2;
    `
    let updValues = [
      JSON.stringify(catalog),
      targetBannerId
    ];
    let rowCount = await connection.queryCount(updSql,updValues);

    let result = {};
    result.ok = rowCount > 0;
    callback(err, req, res, session, result); 

  } catch (error) {
    err = error;
    callback(err, req, res, session, []);
  }
  
};

/**
 * TOP画面バナー(一般バナーと同じ情報)を新規登録する。
 * @param connection
 * @param req
 * @param imagePath イメージパス
 */
exports.createExtend = async (req, res, session, callback, imagePath,imagePath1) => {
  const priority = (isNaN(parseInt(req.body.priority, 10)) ? 99999 : parseInt(req.body.priority, 10)); 
  logger.debug('execute createBanner query');
  let sql = `
  INSERT INTO public.extend_info
  (  
    title, 
    "smalTitle", 
    image_path, 
    image_path1, 
    catalog, 
    publish_datetime_start, 
    publish_datetime_end, 
    priority, 
    comment, 
    last_updated_user_id, 
    user_name, 
    last_updated_date)
  VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);
  `
  let values = [
    req.body.title,
    req.body.smalTitle,
    imagePath,
    imagePath1,
    {},
    req.body.publish_datetime_start,
    req.body.publish_datetime_end,
    priority,
    req.body.comment,
    session[0].user_id,
    session[0].user_name,
    util.getCurrentDate()
  ];

  await connection.queryCallBack(sql, values, function (err, rows) {
    callback(err, req, res, rows);
  });
  
}

exports.getExtendInfo = async (req, res, session, callback, extendId) => {
  logger.debug('execute getExtendInfo query');

  let sql = `
  SELECT * FROM extend_info WHERE id = $1;
  `;
  let values = [extendId]
  await connection.queryCallBack(sql, values, function (err, rows) {
    callback(err,req,res,session,rows);
  });

}

exports.getExtendInfoSync = async function(bannerId) {

  logger.debug('execute getExtendfoSync query');
  
  let sql = `
  SELECT * FROM extend_info WHERE id = $1;
  `;
  let values = [bannerId]
  let rows = await connection.query(sql,values);
  return rows;
}

/**
 * Top画面バナー情報を削除する
 */
exports.deleteExtend = async (extendId) => {

  var sql = `
  delete from extend_info where id = $1;
  `
  let values = [extendId];
  
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
    result.errId = extendId;
  }
  return result;

}


exports.delete2Extend = async (extendId,_id,mc_id) => {
  const targetBannerId = _id;
  // const mc_id = req.body.mc_id;
  const catalog = [];
  let err = null;
  let result = {};
  try {
    let sql = `
      SELECT * FROM extend_info WHERE id = $1;
      `;
    let values = [targetBannerId]
    let rows = await connection.query(sql,values);

  
      var num = rows[0].catalog.length;
      
      for(i=0;i<num;i++){
        var str = rows[0].catalog[i].mc_id+"";
        if(str !== mc_id ){
          const cl = {};
          cl.mc_id = rows[0].catalog[i].mc_id;
          cl.catalgTitle = rows[0].catalog[i].catalgTitle;
          cl.imagePath2 = rows[0].catalog[i].imagePath2;
          cl.catalgLink = rows[0].catalog[i].catalgLink;
          cl.priority = rows[0].catalog[i].priority;
          catalog.push(cl);
        }
       
      }

      rows[0].catalog = catalog;
      // banner.docs[0].catalog[num] = catalog;
      result.ok="success";
      logger.debug('execute updateExtend query');
      sql = `
        UPDATE extend_info
        SET 
            catalog=$1
            
        WHERE id=$2;
        `
        values = [
          JSON.stringify(catalog),
          targetBannerId
        ];
        await connection.query(sql,values);

      } catch (error) {
        err = error;
        // callback(err, req, res, session, []);
        result.ok="error";
      }

   

    return result;

}


/**
 * TOPバナーの処理開始時刻を更新する
 * @param isProcessing: true => 現在の日時をセット, false => 処理開始時刻を初期化(空文字をセット)
 */
const updateProcessStartDatetime = async ( topBannerId, isProcessing = false) => {
  logger.debug('execute updateProcessStartDatetime query: ' + isProcessing ? 'process start' : 'process end');
  logger.debug('processing extendId => ' + topBannerId);
  let body = await db.partitionedFind('extends', { "selector" : {"_id":topBannerId}});
  body.docs[0].process_start_datetime = isProcessing ? util.getCurrentDateTime() : '';
  //return await db.insert(body.docs[0]);

  let sql = `
  UPDATE extend_info
  SET 
    process_start_datetime=$1, 
      
  WHERE id=$2;
  `
  let values = [
    process_start_datetime,
    topBannerId
  ];
  return await connection.query(sql,values);

}

exports.updateProcessStartDatetime = updateProcessStartDatetime;

/**
 * 登録/編集処理中のTOPバナーを取得する
 */
const selectProcessingTopBanner = async () => {
  logger.debug('execute selectProcessingTopBanner query');

  let sql = `
  SELECT * FROM extend_info WHERE process_start_datetime = '';
  `;
  let values = []
  return await connection.query(sql,values);
  
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
      let _ = await updateProcessStartDatetime( processingBanner.id, false);
      logger.info('force free processing extends records has done. extend.id => ' + processingBanner.id);
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
        let _ = await updateProcessStartDatetime( processingBanner.id, false);
      }
    }
    throw Error('multiple processing records detected');
  } else {
    // 処理中レコードが0件の場合
    isLocking = false;
  }
  return isLocking;
}


/**
* コラム目次情報を全件取得する。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
*/
exports.getDetails = async () => {
  logger.debug('execute ' + model_name + ' getDetails query');
    const sql = `
    SELECT
      T1.*,
      T2.TITLE
    FROM
      EXTEND_DETAIL T1
    INNER JOIN EXTEND_INFO T2 ON
      T1.EXTEND_ID = T2.ID
    ORDER BY T1.PRIORITY
    `;

    logger.debug('execute getDetails query');

    let rows = await connection.query(sql,[]);
    return rows;

  };

/**
* コメント一覧に表示する情報を全件取得する。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
*/
exports.getDetailsById = async (id) => {
  logger.debug('execute ' + model_name + ' getDetailsById query');
    const sql = `
    SELECT
      T1.*,
      T2.TITLE
    FROM
      EXTEND_DETAIL T1
    INNER JOIN EXTEND_INFO T2 ON
      T1.EXTEND_ID = T2.ID
    WHERE T1.id = $1
    `;

    logger.debug('execute getDetailsById query');

    let rows = await connection.query(sql,[id]);
    return rows;

  };

/**
* コメント一覧に表示する情報を全件取得する。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
*/
exports.getDetailsByExtendId = async (extendId) => {
  logger.debug('execute ' + model_name + ' getDetailsByExtendId query');
    const sql = `
    SELECT
      T1.*,
      T2.TITLE
    FROM
      EXTEND_DETAIL T1
    INNER JOIN EXTEND_INFO T2 ON
      T1.EXTEND_ID = T2.ID
    WHERE T1.EXTEND_ID = $1
    ORDER BY T1.PRIORITY
    `;

    logger.debug('execute getDetailsByExtendId query');

    let rows = await connection.query(sql,[extendId]);
    return rows;

  };

exports.updateDetail = async(req, session) => {

    logger.debug('execute updateExtendDetail query');
    let updSql = `
      UPDATE extend_detail
      SET 
          extend_id=$1,
          sub_title=$2,
          content=$3,
          priority=$4,
          last_updated_user_id=$5, 
          user_name=$6, 
          last_updated_date=$7
      WHERE id=$8;
    `
    let values = [
      req.body.bannerPosition,
      req.body.smalTitle,
      req.body.content,
      req.body.priority,
      session[0].user_id,
      session[0].user_name,
      util.getCurrentDate(),
      req.body.detailId
    ];

    return await connection.queryCount(updSql,values);
  
};

/**
 * 新規登録する。
 * @param connection
 * @param req
 * @param imagePath イメージパス
 */
 exports.createDetailItem = async (req,session) => {
 
  logger.debug('execute ' + model_name +  ' createDetailItem query');

  let sql = `
  INSERT INTO public.extend_detail
  (  
    extend_id,
    sub_title,
    content, 
    priority,
    last_updated_user_id,
    user_name,
    last_updated_date)
  VALUES($1, $2, $3, $4, $5, $6, $7);
  `
  let values = [
      req.body.bannerPosition,
      req.body.smalTitle,
      req.body.content,
      req.body.priority,
      session[0].user_id,
      session[0].user_name,
      util.getCurrentDate()
  ];

  return await connection.queryCount(sql,values);

}

/**
 * 情報を削除する
 */
 exports.deleteDetail = async (id) => {

  var sql = `
  delete from extend_detail where id = $1;
  `
  let values = [id];
  
  return await connection.queryCount(sql,values);

}