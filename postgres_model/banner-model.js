const db = require('../submodules/postgres');
const util = require('../submodules/util');
const fs = require('fs');
const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');
const uuidv1 = require('uuid');
const { isNull } = require('util');
/**
* バナー一覧に表示する情報を全件取得する。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
*/
exports.getAllBanners = async (req, res, session, callback) => {
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
    callback(err, req, res,session, rows);
  });
};

/**
 * 引数で指定したバナー配置場所IDに対応するバナー配置場所を取得する。
 * @param positionId banner_positionテーブルの主キーを指定
 * @param callback SQL実行後に呼ばれるコールバック
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
        "priority",
        "_id"
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
exports.createBanner =async (req, res, session, callback, imagePath) => {
  // const priority = (isNaN(parseInt(req.body.priority, 10)) ? null : parseInt(req.body.priority, 10));
  const priority = (isNaN(parseInt(req.body.priority, 10)) ? 99999 : parseInt(req.body.priority, 10));
  const bannerPositionId = req.body.bannerPosition;
  // const bannerPositionId = (isNaN(parseInt(req.body.bannerPosition, 10)) ? null : parseInt(req.body.bannerPosition, 10));
  // let body = await db.partitionedList('banners');
  logger.debug('execute selectBanner_position query');
  await db.partitionedFind('banner_position',{
    "selector":{"id":bannerPositionId}
  },async(select_err,select_body)=>{
    if(select_err){
      callback(select_err, req, res, body, imagePath);
      return;
    }
    const doc ={
      '_id': "banners:"+new Date().getTime(),
      'id': "banners:"+new Date().getTime(),
      'title': req.body.title,
      'banner_position_id': "banner_position:"+bannerPositionId,
      'position_name': select_body.docs[0].name,
      'image_path': imagePath,
      'link': req.body.link,
      'publish_datetime_start': req.body.publish_datetime_start,
      'publish_datetime_end': req.body.publish_datetime_end,
      'priority': priority,
      'comment': req.body.comment,
      'last_updated_user_id': session[0].user_id,
      'user_name': session[0].user_name,
      'last_updated_date': util.getCurrentDate()
    }
    logger.debug('execute createBanner query');
    await db.insert(doc,(insert_err, insert_body) => {
      callback(insert_err, req, res, insert_body, imagePath);
  });
  });
  
};

/**
* バナー情報を更新する
* @param req バナー情報を格納したリクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
* @param imagePath 画像ファイルの格納パス。省略時は画像ファイルの更新は行わない。パスには静的フォルダまでのパスは不要。
*/
exports.updateBanner = async(req, res, session, callback, imagePath = null) => {
  const targetBannerId = req.body.bannerId;
  // const targetBannerId = (isNaN(parseInt(req.body.bannerId, 10)) ? null :  parseInt(req.body.bannerId));
  const bannerPositionId = req.body.bannerPosition;
  const priority = (isNaN(parseInt(req.body.priority, 10)) ? 99999 :  parseInt(req.body.priority, 10));
  // const bannerPositionId = (isNaN(parseInt(req.body.bannerPosition, 10)) ? null :  parseInt(req.body.bannerPosition, 10));
  // let banner = db.partitionedFind('banners', { "selector" : {"_id":"banners:"+targetBannerId}});
  let err = null;
  try {
    let banner = await db.partitionedFind('banners',{
      "selector":{
        "_id":targetBannerId
      }});
    let banner_position = await db.partitionedFind('banner_position',{
      "selector":{
        "id":bannerPositionId
      }});
      banner.docs[0].title= req.body.title;
      banner.docs[0].banner_position_id = "banner_position:"+bannerPositionId;
      banner.docs[0].position_name = banner_position.docs[0].name;
      banner.docs[0].link = req.body.link;
      banner.docs[0].publish_datetime_start = req.body.publish_datetime_start;
      banner.docs[0].publish_datetime_end = req.body.publish_datetime_end;
      banner.docs[0].priority = priority;
      banner.docs[0].comment = req.body.comment;
      banner.docs[0].last_updated_user_id = session[0].user_id;
      banner.docs[0].user_name = session[0].user_name,
      banner.docs[0].last_updated_date = util.getCurrentDate();
      if (null != imagePath) {
        banner.docs[0].image_path = imagePath;
      } 
      logger.debug('execute updateBanner query');
      let body = await db.insert(banner.docs[0]);
      callback(err, req, res, session, body, imagePath); 
  } catch (error) {
    err = error;
    callback(err, req, res, session, [], imagePath);
  }
  
};

/**
* 指定したバナーIDのバナー情報を取得する。
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
* @param bannerId バナーID
*/
exports.getBannerInfo = async(req, res, session, callback, bannerId) => {
  // let error = null;
  // let rows = []; bannerId
  console.log("bannerId: "+bannerId);
  logger.debug('execute getBannerInfo query');
  db.partitionedFind('banners',{
    "selector":{
      "_id":  bannerId
    }
  },(err,body)=>{
    callback(err, req, res, session, body.docs);
  });

}

/**
* 指定したバナーIDのバナー情報を取得する。
*/
exports.getBannerInfoSync = async function(bannerId) {
  // let error = null;
  // let rows = [];
  logger.debug('execute getBannerInfoSync query');
  let body = await db.partitionedFind('banners',{
    "selector":{
      "id":bannerId
    }
  });
    return body.docs;
}
/**
 * バナー情報を削除する
 * @param req リクエスト
 * @param res レスポンス
 * @param callback SQL実行後に呼ばれるコールバック
 */
exports.deleteBanner = async(req, res, imagePath, callback) => {
  // const BANNER_ID = parseInt(req.body.targetId, 10);
  const BANNER_ID = req.body.targetId;
  // const BANNER_ID = req.body.targetId;
  let err = null;
  try {
    let body = await db.partitionedFind('banners',{
      "selector":{
        "_id":BANNER_ID
      }
    });
    let _id = body.docs[0]._id;
    let _rev = body.docs[0]._rev;
    logger.debug('execute deleteBanner query');
    let result = await db.destroy(_id, _rev);
    callback(err, req, res, result, imagePath);
  } catch (error) {
    err = error;
    callback(err, req, res, [], imagePath);
  }
  
}
exports.getAppAllBanners = async () => {
  logger.debug('execute getAppAllBanners query');
  let body = await db.partitionedFind('banners',{
    "selector":{
      "_id":BANNER_ID
    }
  });
  return body.docs;
};