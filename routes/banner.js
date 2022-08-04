const express = require('express');
const router = express.Router();
const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');
const util = require('../submodules/util');
const sessionManager = require('../submodules/session-manager');

const cloudantBannerModel = require('../postgres_model/banner-model');
const cloudantImageModel = require('../postgres_model/image-model');
const cloudantBannerPositionModel =  require('../postgres_model/banner-position-model');
const sessionModel = require('../postgres_model/session-model');

// バナー一覧表示
router.get('/', async(req, res, next) => {
  logger.info('received request URL : ' + req.originalUrl);
  // bannerModel.getAllBanners(req, res, getAllBannersCallback);
  const session = global.session;
  cloudantBannerModel.getAllBanners(req, res, session, getAllBannersCallback);
});

// バナー編集へ遷移
router.get('/update', async(req, res, next) => {
  logger.info('received request URL : ' + req.originalUrl);
  const bannerId = req.query.bannerId;
  const session = global.session;
  cloudantBannerModel.getBannerInfo(req, res, session, getBannerInfoCallback, bannerId);
});

// バナー削除処理
router.post('/delete', async function(req, res, next) {
  const publishDateTimeStart = req.body.publish_datetime_start;
  const publishDateTimeEnd = req.body.publish_datetime_end;
  logger.info('received request URL : ' + req.originalUrl);
  const imagePath = req.body.image;
  if (!imagePath) {
    logger.error('body param[image] was not found');
    next();
    return;
  }
  // バナー表示中の場合は削除不可能である為、バナーを削除せずにバナー一覧に戻る
  if (!isBannerDeletable(publishDateTimeStart, publishDateTimeEnd)) {
    logger.info('selected banner info cannot delete due to publishing');
    // req.session.errorMsg = constants.MESSAGE.CANNOT_DELETE_BANNER_PUBLISHING;
    try {
      await sessionModel.sessionAddErrorMsg(req,constants.MESSAGE.CANNOT_DELETE_BANNER_PUBLISHING);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    res.redirect(constants.ROUTE.BANNERS);
    return;
  }
    cloudantBannerModel.deleteBanner(req, res, imagePath, deleteBannerCallback);
});

/**
* バナー取得のselect文実行後のコールバック
* @param err エラー情報
* @param req リクエスト
* @param res レスポンス
* @param rows select文実行結果
 */
const getAllBannersCallback = async(err, req, res, session, rows) => {
  let msg = '';
  if (err) {
    
    if(err.message === constants.CLOUDANT.ERROR_MESSAGE.ECONNREFUSED){
      msg = constants.CLOUDANT.RES_MESSAGE.DB_NOT_AVAILABLE;
      logger.fatal('cloudant server is not available.');
    }else{
      msg = constants.CLOUDANT.RES_MESSAGE.DB_ERROR_COMMON;
      logger.error('failed to query');
    }
    logger.error('error info : \n' + err);
    util.renderWithBaseInfo(req, res, constants.VIEW.BANNERS,  {
      title: constants.TITLE.BANNER_LIST,
      error: msg,
    }, session);
    return;
  };
  const banners = sortBanners(rows);
  // 連番を付与
  let number = 1;
  for (const i in banners) {
    if (banners.hasOwnProperty(i)) {
      banners[i].number = number++;
    }
  }
  const info = {
    title: constants.TITLE.BANNER_LIST,
    banners: banners
  }
  try {
    // session = await sessionModel.getSession(req);
    if(session[0] && session[0].errorMsg && session[0].errorMsg !==null){
      info.error = session[0].errorMsg;
      // req.session.errorMsg = null;
      await sessionModel.updateSession(session[0],req);
    }
  } catch (error) {
    logger.error('getAllBannersCallback getSession/updateSession error : \n' + error);
    sessionManager.destroy(req);
    msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
    res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
    return;
  }
  util.renderWithBaseInfo(req, res, constants.VIEW.BANNERS, info ,session);
};

/**
 * バナー一覧に表示するバナーを並び替える
 * 並び替えは、公開中のバナーを先頭にする。
 * 公開済みバナーまたは未公開バナーは表示中バナーの後ろにまとめる。
 * @param rows バナー情報一覧
 * @return バナー情報一覧 公開中バナーを先頭にソートした配列
 */
const sortBanners = function(rows) {
  const currentDateTime = util.getCurrentDateTime();
  const publishing = []; // 公開中バナー
  const stash = []; // 公開済みまたは未公開バナー
  rows.forEach(function(row) {
    if ("" === row.publish_datetime_start && "" === row.publish_datetime_end) {
      publishing.push(row);
    } else if (1 === util.compareDateTime(currentDateTime, row.publish_datetime_start) && -1 === util.compareDateTime(currentDateTime, row.publish_datetime_end)) {
      publishing.push(row);
    } else if ("" === row.publish_datetime_start && -1 === util.compareDateTime(currentDateTime, row.publish_datetime_end)) {
      publishing.push(row);
    } else if (1 === util.compareDateTime(currentDateTime, row.publish_datetime_start) && "" === row.publish_datetime_end) {
      publishing.push(row);
    } else {
      stash.push(row);
    }
  });
  const result = publishing.concat(stash);
  return result;
}

/**
 * バナー情報取得クエリー実行後のコールバック
 * バナー表示位置クエリーを実行する
 * @param err エラー情報
 * @param req リクエスト
 * @param res レスポンス
 * @param rows クエリー実行結果
 */
const getBannerInfoCallback = function(err, req, res, session, rows) {
  if (err) {
    let msg = '';
    if(err.message === constants.CLOUDANT.ERROR_MESSAGE.ECONNREFUSED){
      msg = constants.CLOUDANT.RES_MESSAGE.DB_NOT_AVAILABLE;
      logger.fatal('cloudant server is not available.');
    }else{
      msg = constants.CLOUDANT.RES_MESSAGE.DB_ERROR_COMMON;
      logger.error('failed to query');
    }
    logger.error('error info : \n' + err);
    util.renderWithBaseInfo(req, res, constants.VIEW.BANNERS, {
      title: constants.TITLE.BANNERS,
      error: msg,
    }, session);
    return;
  }
  if (!rows || rows.length === 0) {
    util.renderWithBaseInfo(req, res, constants.VIEW.BANNERS, {
      title: constants.TITLE.BANNERS,
      error: constants.MESSAGE.FAILED_TO_LOAD_BANNER_INFO,
    },session);
    return;
  };
  cloudantBannerPositionModel.getAllBannerPositions(req, res, session, getAllBannerPositionsCallbackWithBannerInfo, rows[0]);
};

/**
* バナー配置場所取得クエリー実行後のコールバック
* バナー編集ページへ遷移する
* @param err エラー情報
* @param req リクエスト
* @param res レスポンス
* @param rows クエリー実行結果
* @param bannerInfo バナー登録情報
*/
const getAllBannerPositionsCallbackWithBannerInfo = async(err, req, res, session, rows, bannerInfo) => {
  // console.log("=========>： "+bannerInfo);
  let msg = '';
  if (err) {
    
    if(err.message === constants.CLOUDANT.ERROR_MESSAGE.ECONNREFUSED){
      msg = constants.CLOUDANT.RES_MESSAGE.DB_NOT_AVAILABLE;
      logger.fatal('cloudant server is not available.');
    }else{
      msg = constants.CLOUDANT.RES_MESSAGE.DB_ERROR_COMMON;
      logger.error('failed to query');
    }
    logger.error('error info : \n' + err);
    util.renderWithBaseInfo(req, res, constants.VIEW.BANNERS, {
      title: constants.TITLE.BANNERS,
      error: msg,
    }, session);
    return;
  }
  logger.debug('getAllBannerPositions is success');
  const info = {
    title: constants.TITLE.BANNER_UPDATE,
    bannerInfo: bannerInfo,
    bannerPostions: rows
  }
  // if (req.session.errorMsg) {
  //   info.error = req.session.errorMsg;
  //   req.session.errorMsg = null;
  // }
  try {
    // let body = await sessionModel.getSession(req);
    if(session[0] && session[0].errorMsg && session[0].errorMsg !== null){
      info.error = session[0].errorMsg;
      // req.session.errorMsg = null;
      await sessionModel.updateSession(session[0],req);
    }
  } catch (error) {
    logger.error('updateSession for delete errorMsg error : \n' + error);
    sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
    msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
    res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
    return;
  }
  util.renderWithBaseInfo(req, res, constants.VIEW.BANNER_FORM, info, session);
};

/**
 * バナー削除クエリー実行後のコールバック
 * @param err エラー情報
 * @param req リクエスト
 * @param res レスポンス
 * @param result delete文実行結果
 */
const deleteBannerCallback = async(err, req, res, result, imagePath) => {
  if (err) {
    let msg = constants.MESSAGE.FAILED_TO_DELETE_BANNER;
    if(err.message === constants.CLOUDANT.ERROR_MESSAGE.ECONNREFUSED){
      msg = constants.CLOUDANT.RES_MESSAGE.DB_NOT_AVAILABLE;
      logger.fatal('cloudant server is not available.');
    }else{
      msg = constants.CLOUDANT.RES_MESSAGE.DB_ERROR_COMMON;
      logger.error('failed to query');
    }
    logger.error('error info : \n' + err);
    // req.session.errorMsg = msg;
    try {
      await sessionModel.sessionAddErrorMsg(req,msg);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    res.redirect(constants.ROUTE.BANNERS);
    return;
  };

  if (true !== result.ok) {
    // 削除対象のレコードがなかった場合
    // logger.error('affectedRows is ' + result.affectedRows);
    logger.error('delete banner failde ' + JSON.stringify(result));
    // req.session.errorMsg = constants.MESSAGE.FAILED_TO_DELETE_BANNER;
    try {
      await sessionModel.sessionAddErrorMsg(req,constants.MESSAGE.FAILED_TO_DELETE_BANNER);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    res.redirect(constants.ROUTE.BANNERS);
    return;
  }
  // logger.debug('deleting banner has done');

  try {
    // connection.beginTransaction();
    const result = await cloudantImageModel.deleteImageData(imagePath);
    logger.debug('deleteImageData success');
    logger.debug('query result :\n' + JSON.stringify(result));
  } catch (err) {
    // connection.rollback();
    // connection.end();
    let msg = constants.MESSAGE.FAILED_TO_DELETE_BANNER;
    if(err.message === constants.CLOUDANT.ERROR_MESSAGE.ECONNREFUSED){
      msg = constants.CLOUDANT.RES_MESSAGE.DB_NOT_AVAILABLE;
      logger.fatal('cloudant server is not available.');
    }else{
      msg = constants.CLOUDANT.RES_MESSAGE.DB_ERROR_COMMON;
      logger.error('failed to query');
    }
    logger.error('error info : \n' + err);
    // req.session.errorMsg = msg;
    try {
      await sessionModel.sessionAddErrorMsg(req,msg);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    res.redirect(constants.ROUTE.BANNERS);
    return;
  }
  // 正常終了時はバナー一覧にリダイレクトする
  res.redirect(constants.ROUTE.BANNERS);
}

/**
 * バナーの公開日時と現在日時を比較し、削除可能かどうか確認する。
 * @param publishDateTimeStart 公開開始日時を示す文字列 'YYYY/MM/DD hh:mm:ss'
 * @param publishDateTimeEnd 公開終了日時を示す文字列 'YYYY/MM/DD hh:mm:ss'
 * @return true  : 削除可能な場合
 *         false : 削除不可能な場合
 */
const isBannerDeletable = function(publishDateTimeStart, publishDateTimeEnd) {
  logger.info('isBannerDeletable called');
  const PATTERN_DATETIME = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/;
  const currentDt = util.getCurrentDateTime();
  let startDt = null;
  let endDt = null;
  if (null !== publishDateTimeStart.match(PATTERN_DATETIME)) {
    startDt = publishDateTimeStart;
  }
  if (null !== publishDateTimeEnd.match(PATTERN_DATETIME)) {
    endDt = publishDateTimeEnd;
  }
  // パターン1 開始日時と終了日時が未指定（null）の場合は削除不可
  if (null === startDt && null === endDt) {
    logger.info('cannnot delete. startDt & endDt are null');
    return false;
  }
  // パターン2 開始日時がnullで終了日時が指定されている場合
  if (null === startDt && null !== endDt) {
    if (0 >= util.compareDateTime(currentDt, endDt)) {
      // 現在日時が終了日時に達していない場合
      // 削除不可
      logger.info('cannot delete. currentDt is prior to endDt');
      return false;
      // 終了日時が過去の日時である場合
      // 削除可能
      logger.info('can delete. endDt has been over');
      return true;
    } else {
      // 終了日時が過去の日時である場合
      // 削除可能
      logger.info('can delete. endDt has been over');
      return true;
    }
  }
  // パターン3 開始日時が指定されており、終了日時がnullの場合
  if (null !== startDt && null === endDt) {
    if (0 <= util.compareDateTime(currentDt, startDt)) {
      // 開始日時が現在日時よりも昔の場合
      // 削除不可
      logger.info('cannot delete. startDt is prior to currentDt');
      return false;
    } else {
      // 開始日時が未来の日時である場合
      // 削除可能
      logger.info('can delete. startDt is yet to come');
      return true;
    }
  }
  // パターン4 開始日時と終了日時がどちらも指定されている場合
  if (0 <= util.compareDateTime(currentDt, startDt) && 0 >= util.compareDateTime(currentDt, endDt)) {
    // 開始日時 < 現在日時 < 終了日時 の場合
    // 削除不可
    logger.info('cannot delete. currentDt is between startDt and endDt');
    return false;
  } else {
    // 上記以外の場合
    // 削除可能
    logger.info('can delete. currentDt is not between startDt and endDt');
    return true;
  }
}

module.exports = router;
