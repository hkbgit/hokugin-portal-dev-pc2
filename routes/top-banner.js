const express = require('express');
const sessionManager = require('../submodules/session-manager');
const router = express.Router();
const topBannerModel = require('../models/top-banner-model');
const cloudantTopBannerModel = require('../postgres_model/top-banner-model');
//const cloudantTopBannerModel = require('../postgres_model/top-banner-model');
const imageModel = require('../models/image-model');
const cloudantImageModel = require('../postgres_model/image-model');
const topBannerAttributeModel = require('../models/top-banner-attribute-model');
const cloudantTopBannerAttributeModel = require('../postgres_model/top-banner-attribute-model');
const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');
const util = require('../submodules/util');
const connectionOptions = require('../submodules/connection-options');
const mysql = require('promise-mysql');
const sessionModel = require('../postgres_model/session-model');
// TOP画面バナー一覧表示
router.get('/', async(req, res, next) => {
  logger.info('received request URL : ' + req.originalUrl);
  const session = global.session;
  if (req.query.contract_no) {
    // 契約者通番がgetパラメータに設定されている場合は形式をチェックする
    const PATTERN_CONTRACT_NO = /^(\d{1,24})$/;
    let contract_no = req.query.contract_no;
    if (!contract_no.match(PATTERN_CONTRACT_NO)) {
      logger.debug(`invalid contract no. (${contract_no})`);
      // req.session.errorMsg = constants.MESSAGE.INVALID_CONTRACT_NO_SEARCH_ERROR;
      try {
        await sessionModel.addErrorMsg(session,constants.MESSAGE.INVALID_CONTRACT_NO_SEARCH_ERROR);
      } catch (error) {
        logger.error('save session errorMsg error: '+error);
        sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
        msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
        res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
        return;
      }
      res.redirect(constants.ROUTE.TOP_BANNERS);
      return;
    }
  }
  
  try{
    cloudantTopBannerModel.getAllTopBanners(req, res, session, getAllTopBannersCallback);
  } catch(err) {
    let msg = util.getCatchMessage(err);
    util.renderWithBaseInfo(req, res, constants.VIEW.TOP_BANNERS, {title: constants.TITLE.BANNER_LIST, error:msg}, session);
  }
});

// Top画面バナー編集へ遷移。編集完了した場合一覧に遷移。
router.get('/update', async (req, res, next) => {
  logger.info('received request URL : ' + req.originalUrl);
  const session = global.session;
    // is_processingチェック
    let isProcessing = true;
    // let connection = await mysql.createConnection(connectionOptions);
    try {
      // await connection.beginTransaction();
      isProcessing = await cloudantTopBannerModel.hasProccessingRecord();
      // await connection.commit();
    } catch (error) {
      logger.error(error);
      // await connection.rollback();
    } finally {
      // await connection.end();
    }
    if (isProcessing) {
      // 処理中レコードがある場合
      logger.info('processing file detected.');
      // req.session.errorMsg = constants.MESSAGE.CANNOT_REGISTER_OR_UPDATE_TOP_BANNER_WHILE_PROCESSING;
      try {
        await sessionModel.addErrorMsg(session,constants.MESSAGE.CANNOT_REGISTER_OR_UPDATE_TOP_BANNER_WHILE_PROCESSING);
      } catch (error) {
        logger.error('save session errorMsg error: '+error);
        // sessionManager.destroy(req);
        req.session.destroy(function(err) {
          if (err) throw err;
        });
        msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
        res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
        return;
      }
      res.redirect(constants.ROUTE.TOP_BANNERS);
      return;
    }
  const topBannerId = req.query.topBannerId;
  try{
    cloudantTopBannerModel.getTopBannerInfo(req, res, session, getTopBannerInfoCallback, topBannerId);
  } catch(err) {
    let msg = util.getCatchMessage(err);
    util.renderWithBaseInfo(req, res, constants.VIEW.TOP_BANNERS, {title: constants.TITLE.BANNER_LIST, error:msg}, session);
  }
  
});

// Top画面バナー削除処理
router.post('/delete', async function(req, res, next) {
  const publishDateTimeStart = req.body.publish_datetime_start;
  const publishDateTimeEnd = req.body.publish_datetime_end;
  logger.info('received request URL : ' + req.originalUrl);
  // is_processingチェック
  let isProcessing = true;
  // let connection = await mysql.createConnection(connectionOptions);
  try {
    // await connection.beginTransaction();
    isProcessing = await cloudantTopBannerModel.hasProccessingRecord();
    // await connection.commit();
  } catch (error) {
    logger.error(error);
    // await connection.rollback();
  } finally {
    // await connection.end();
  }
  if (isProcessing) {
    // 処理中レコードがある場合
    logger.info('processing file detected.');
    // req.session.errorMsg = constants.MESSAGE.CANNOT_REGISTER_OR_UPDATE_TOP_BANNER_WHILE_PROCESSING;
    try {
      await sessionModel.sessionAddErrorMsg(req,constants.MESSAGE.CANNOT_REGISTER_OR_UPDATE_TOP_BANNER_WHILE_PROCESSING);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    res.redirect(constants.ROUTE.TOP_BANNERS);
    return;
  }

  const imagePath = req.body.image;
  if (!imagePath) {
    logger.error('body param[image] was not found');
    next();
    return;
  }

  try {
    // トランザクション開始
    // await connection.beginTransaction();
    try {
      // const topBannerId = parseInt(req.body.targetId, 10);
      const topBannerId = req.body.targetId;
      const result = await cloudantTopBannerModel.deleteTopBanner( topBannerId);
      if (result.errorNum && result.errorNum > 0) {
        try {
          await sessionModel.sessionAddErrorMsg(req,constants.MESSAGE.FAILED_TO_DELETE_BANNER);
        } catch (error) {
          logger.error('save session errorMsg error: '+error);
          sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
          msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
          res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
          return;
        }
        res.redirect(constants.ROUTE.TOP_BANNERS);
        return;
        // throw new Error();
      } else if (!result.errorNum){
        logger.debug('deleting topbanner has done');
        try {
          const result = await cloudantImageModel.deleteImageData(imagePath);
          logger.debug('deleteImageData success');
          logger.debug('query result :\n' + JSON.stringify(result));
          // 正常終了時はTOP画面バナー一覧にリダイレクトする
          res.redirect(constants.ROUTE.TOP_BANNERS);
        } catch (err) {
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
            await sessionModel.sessionAddErrorMsg(req,constants.MESSAGE.FAILED_TO_DELETE_BANNER);
          } catch (error) {
            logger.error('save session errorMsg error: '+error);
            sessionManager.destroy(req);
            msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
            res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
            return;
          }
          res.redirect(constants.ROUTE.TOP_BANNERS);
          // throw err;
        }
      } else {
        try {
          await sessionModel.sessionAddErrorMsg(req,constants.MESSAGE.FAILED_TO_DELETE_BANNER);
        } catch (error) {
          logger.error('save session errorMsg error: '+error);
          sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
          msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
          res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
          return;
        }
        res.redirect(constants.ROUTE.TOP_BANNERS);
        // throw new Error();
      }
    } catch (err) {
      let msg = constants.MESSAGE.FAILED_TO_DELETE_BANNER;
      if(err.message === constants.CLOUDANT.ERROR_MESSAGE.ECONNREFUSED){
        msg = constants.CLOUDANT.RES_MESSAGE.DB_NOT_AVAILABLE;
        logger.fatal('cloudant server is not available.');
      }else{
        msg = constants.CLOUDANT.RES_MESSAGE.DB_ERROR_COMMON;
        logger.error('failed to query');
      }
      logger.error('error info : \n' + err);
      // req.session.errorMsg = constants.MESSAGE.FAILED_TO_DELETE_BANNER;
      try {
        await sessionModel.sessionAddErrorMsg(req,constants.MESSAGE.FAILED_TO_DELETE_BANNER);
      } catch (error) {
        logger.error('save session errorMsg error: '+error);
        sessionManager.destroy(req);
        msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
        res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
        return;
      }
      res.redirect(constants.ROUTE.TOP_BANNERS);
      // throw err;
    }
    // commit
    // await connection.commit();
  } catch (err) {
    // rollback
    logger.error("error occured: " + err);
    logger.debug(err.stack);
    // await connection.rollback();
  } finally {
    // end
    // await connection.end();
  }
});

/**
* Top画面バナー取得のselect文実行後のコールバック
* @param err エラー情報
* @param req リクエスト
* @param res レスポンス
* @param rows select文実行結果
 */
const getAllTopBannersCallback = async(err, req, res, session, rows) => {
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
    util.renderWithBaseInfo(req, res, constants.VIEW.TOP_BANNERS,  {
      title: constants.TITLE.TOP_BANNER_LIST,
      topBanners: [],
      contractNumber: "",
      error: msg,
    }, session);
    return;
  }
  const topBanners = sortTopBanners(rows);
  // 連番を付与
  let number = 1;
  for (const i in topBanners) {
    if (topBanners.hasOwnProperty(i)) {
      topBanners[i].number = number++;
    }
  }
  // is_defaultを論理名に変更
  for (const i in topBanners) {
    if (parseInt(topBanners[i].is_default) === 1) {
      topBanners[i].is_default = constants.TOP_BANNER_KINDS_LIST.DEFAULT_TOP_BANNER
    } else if (parseInt(topBanners[i].is_default) === 0) {
      topBanners[i].is_default = constants.TOP_BANNER_KINDS_LIST.CONTRACT_TOP_BANNER
    }
  }
  const info = {
    title: constants.TITLE.TOP_BANNER_LIST,
    topBanners: topBanners,
    contractNumber: req.query.contract_no
  }
  try {
    if(session[0] && session[0].errorMsg && session[0].errorMsg !==null){
      info.error = session[0].errorMsg;
      await sessionModel.updateSession(session[0],req);
    }
  } catch (error) {
    logger.error('getAllBannersCallback getSession/updateSession error : \n' + error);
    msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
    res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
    return;
  }
  logger.debug('getAllTopBanners has done');
  util.renderWithBaseInfo(req, res, constants.VIEW.TOP_BANNERS, info, session);
};

/**
 * Top画面バナー一覧に表示するバナーを並び替える
 * 並び替えは、公開中のバナーを先頭にする。
 * 公開済みバナーまたは未公開Top画面バナーは表示中バナーの後ろにまとめる。
 * @param rows Top画面バナー情報一覧
 * @return Top画面バナー情報一覧 公開中バナーを先頭にソートした配列
 */
const sortTopBanners = function(rows) {
  logger.debug('sortTopBanners from topbanner.js ');
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
 * TOP画面バナー情報取得クエリー実行後のコールバック
 * TOP画面バナー表示位置クエリーを実行する
 * @param err エラー情報
 * @param req リクエスト
 * @param res レスポンス
 * @param rows クエリー実行結果
 */
const getTopBannerInfoCallback = function(err, req, res, session, rows) {
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
    util.renderWithBaseInfo(req, res, constants.VIEW.TOP_BANNERS, {
      title: constants.TITLE.TOP_BANNER_LIST,
      topBanners: [],
      contractNumber: "",
      error: msg,
    }, session);
    return;
  }
  if (!rows || rows.length === 0) {
    util.renderWithBaseInfo(req, res, constants.VIEW.TOP_BANNERS, {
      title: constants.TITLE.TOP_BANNER_LIST,
      topBanners: [],
      contractNumber: "",
      error: msg,
    }, session);
    return;
  }
  logger.debug('getTopBannerInfo is success');
  cloudantTopBannerAttributeModel.getAllTopBannerAttributes(req, res, session, getAllTopBannerAttributesCallbackWithBannerInfo, rows[0]);
};

/**
* TOP画面バナー配置場所取得クエリー実行後のコールバック
* TOP画面バナー編集ページへ遷移する
* @param err エラー情報
* @param req リクエスト
* @param res レスポンス
* @param rows クエリー実行結果
* @param bannerInfo バナー登録情報
*/
const getAllTopBannerAttributesCallbackWithBannerInfo = async(err, req, res, session, rows, bannerInfo) => {
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
    util.renderWithBaseInfo(req, res, constants.VIEW.TOP_BANNERS, {
      title: constants.TITLE.TOP_BANNER_LIST,
      topBanners: [],
      contractNumber: "",
      error: msg,
    }, session);
    return;
  }
  logger.debug('getAllTopBannerAttributes is success');

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
    //将session从数据库中删除
    msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
    res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
    return;
  }
  //デフォルトバナー編集と契約者通番バナー編集画面の名前を設定
  if (bannerInfo.is_default === 1) {
    const info = {
      title: constants.TITLE.UPDATE_DEFAULT_TOP_BANNER,
      bannerInfo: bannerInfo,
      topBannerAttributes: rows
    }
    logger.debug('getAllTopBannerAttributesCallbackWithBannerInfo is success');
    util.renderWithBaseInfo(req, res, constants.VIEW.TOP_BANNER_FORM, info, session);
  } else if (bannerInfo.is_default === 0) {
    const info = {
      title: constants.TITLE.UPDATE_CONTRACT_TOP_BANNER,
      bannerInfo: bannerInfo,
      topBannerAttributes: rows
    }
    logger.debug('getAllTopBannerAttributesCallbackWithBannerInfo is success');
    util.renderWithBaseInfo(req, res, constants.VIEW.TOP_BANNER_FORM, info, session);
  } else {
    logger.error('is_default dose not exist ');
    msg = constants.MESSAGE.IS_DEFAULT_NOT_EXIST;
    util.renderWithBaseInfo(req, res, constants.VIEW.TOP_BANNERS, {
      title: constants.TITLE.TOP_BANNER_LIST,
      topBanners: [],
      contractNumber: "",
      error: msg,
    }, session);
    logger.debug('getAllTopBannerAttributesCallbackWithBannerInfo is failed');
  }
};

/**
 * TOP画面バナー削除クエリー実行後のコールバック
 * @param err エラー情報
 * @param req リクエスト
 * @param res レスポンス
 * @param result delete文実行結果
 */
const deleteTopBannerCallback = function(err, req, res, result) {
  if (err) {
    let msg = constants.MESSAGE.FAILED_TO_DELETE_BANNER;
    if (err.code === constants.ERROR.ECONNREFUSED) {
      msg = constants.MESSAGE.DB_NOT_AVAILABLE;
      logger.fatal('mysql server is not available.');
    } else {
      msg = constants.MESSAGE.DB_ERROR_COMMON;
      logger.error('failed to query');
    }
    logger.error('error info : \n' + err);
    req.session.errorMsg = msg;
    res.redirect(constants.ROUTE.TOP_BANNERS);
    return;
  };
  if (1 == result.affectedRows) {
    //TOP画面バナーの場合、affectedRowsは2以上になる
    //2より小さい場合はエラー扱いにする。
    logger.error('affectedRows are less than 2. failed to delete topBanner info');
    req.session.errorMsg = constants.MESSAGE.FAILED_TO_DELETE_BANNER;
    res.redirect(constants.ROUTE.TOP_BANNERS);
    return;
  } else if (0 == result.affectedRows){
    // 削除対象のレコードがなかった場合
    logger.error('affectedRows is ' + result.affectedRows);
    req.session.errorMsg = constants.MESSAGE.FAILED_TO_DELETE_BANNER;
    res.redirect(constants.ROUTE.TOP_BANNERS);
    return;
  }

  logger.debug('deleting topbanner has done');
  // 正常終了時はTOP画面バナー一覧にリダイレクトする
  res.redirect(constants.ROUTE.TOP_BANNERS);
}

/**
 * TOP画面バナーの公開日時と現在日時を比較し、削除可能かどうか確認する。
 * @param publishDateTimeStart 公開開始日時を示す文字列 'YYYY/MM/DD hh:mm:ss'
 * @param publishDateTimeEnd 公開終了日時を示す文字列 'YYYY/MM/DD hh:mm:ss'
 * @return true  : 削除可能な場合
 *         false : 削除不可能な場合
 */
const isTopBannerDeletable = function(publishDateTimeStart, publishDateTimeEnd) {
  logger.info('isTopBannerDeletable called');
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
