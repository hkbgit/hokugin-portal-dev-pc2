const express = require('express');
const router = express.Router();
const cloudantNoticeModel = require('../postgres_model/notice-model');
const multer  = require('multer');
const img = multer({ dest: 'img/tmp/' });
const crypto = require('crypto');
const fs = require('fs');
const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');
const util = require('../submodules/util');
const sizeOf = require('image-size');
const sessionModel = require('../postgres_model/session-model');
const sessionManager = require('../submodules/session-manager');
const path = require('path');


router.get('/', async(req, res, next) => {
  logger.info('received request URL : ' + req.originalUrl);

  const session = global.session;

  try{
    let info = {
      title: constants.TITLE.NOTICE_FORM,
      error: "",
    }
    try {
      // let body = await sessionModel.getSession(req);
      if(session[0] && session[0].errorMsg && session[0].errorMsg !== null){
        info.error = session[0].errorMsg;
        // req.session.errorMsg = null;
        await sessionModel.updateSession(session[0],req);
      }
    } catch (error) {
      logger.error('getAllExtendsCallback updateSession for delete errorMsg error : \n' + error);
      sessionManager.destroy(req);
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    util.renderWithBaseInfo(req, res, constants.VIEW.NOTICE_FORM, info, session);
  } catch (error) {
    logger.error('getAllNoticeback updateSession for delete errorMsg error : \n' + error);
    sessionManager.destroy(req);
    msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
    res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
    return;
  }

  
  return;
});

/**
 * 新規追加・更新
 */
router.post('/', async function(req, res, next) {
  logger.info('received request URL : ' + req.originalUrl);
  const session = global.session;
  // console.log("表单追加");

  var resultCount = 0
  var updateCount = 0
  
  try{
    if (req.body.noticeId) {
      resultCount = 1
      updateCount = await cloudantNoticeModel.updateItem(req, session);
      console.log(updateCount)
    } else {
      resultCount = await cloudantNoticeModel.createItemAsync(req, session);
      console.log(resultCount)
    }

    logger.debug('createItem is success')
    res.redirect(constants.ROUTE.NOTICE);
  } catch (err) {
    let msg = constants.MESSAGE.FAILED_TO_REGISTER_NOTICE;
    if(err.message === constants.CLOUDANT.ERROR_MESSAGE.ECONNREFUSED){
      msg = constants.CLOUDANT.RES_MESSAGE.DB_NOT_AVAILABLE;
      logger.fatal('cloudant server is not available.');
    }else{
      msg = constants.CLOUDANT.RES_MESSAGE.DB_ERROR_COMMON;
      logger.error('failed to query');
    }
    logger.error('error info : \n' + err);
    // renderError(req, res, {error: msg});
    try {
      
      await sessionModel.sessionAddErrorMsg(req,constants.MESSAGE.FAILED_TO_UPDATE_NOTICE);

      if (resultCount == 0) {
        await sessionModel.sessionAddErrorMsg(req,constants.MESSAGE.FAILED_TO_REGISTER_NOTICE);
      } 

      res.redirect(constants.ROUTE.NOTICE_REGISTER);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    return;
  }


});

router.post('/validate', async function(req, res, next) {
  // console.log("表单校验22222...");
  let errorInfo = {};
  const inputErrorInfo = validateInputValue(req);

  if (inputErrorInfo) {
    logger.info('validate error: input');
    // ファイルアップロードのエラー情報とその他フォームのエラー情報をマージする
    errorInfo = Object.assign(errorInfo, inputErrorInfo);
  }
 
  if (Object.keys(errorInfo).length > 0) {
    // errorInfoが何らかのキーを持つ場合、エラーとする
    // レスポンスにエラー情報をセット
    res.json(errorInfo);
  } else {
    // 入力値異常なし
    res.json('');
  }

 });

/**
 * 入力内容バリデーションチェック
 * ファイル内容のチェックはここでは行わない。
 * @param req リクエスト
 * @return null: バリデーション問題なし
 *         バリデーション異常の場合は該当フォームのエラー情報を連想配列で返す
 */
 const validateInputValue = function(req) {
  const PATTERN_DATETIME = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/;
  const formValues = {};
  const EMPTY_VALUE = '';
  formValues.notice = req.body.notice ? req.body.notice : EMPTY_VALUE;
  formValues.link = req.body.link ? req.body.link : EMPTY_VALUE;
  formValues.publishDateTimeStart = req.body.publish_datetime_start ? req.body.publish_datetime_start : EMPTY_VALUE;
  formValues.publishDateTimeEnd = req.body.publish_datetime_end ? req.body.publish_datetime_end : EMPTY_VALUE;

  let hasInvalidValue = false;
  const errorInfo = {};

  logger.debug('validateInputValue() called');
  if (formValues.notice.length <= 0) {
    // タイトル文字は空くことはできない
    logger.debug("notice is not null");
    errorInfo.notice = {
      msg: constants.MESSAGE.NOTICE_TITLE_NULL
    };
    hasInvalidValue = true;
  }

  if (constants.MAX_NOTICE_LENGTH < formValues.notice.length) {
    // タイトル文字列長エラー
    logger.debug("notice length is out of range");
    errorInfo.notice = {
      msg: constants.MESSAGE.NOTICE_TITLE_LENGTH
    };
    hasInvalidValue = true;
  }

  if (formValues.link.length　<= 0) {
    // リンク先URLは空くことはできない
    logger.debug("link is not null");
    errorInfo.link = {
      msg: constants.MESSAGE.NOTICE_LINK_NULL
    }
    hasInvalidValue = true;
  }

  if (constants.MAX_LENGTH_LINK < formValues.link.length) {
    // リンク先URL文字列長エラー
    logger.debug("link length is out of range");
    errorInfo.link = {
      msg: constants.MESSAGE.LINK_LENGTH
    }
    hasInvalidValue = true;
  }


  if ('' !== formValues.publishDateTimeStart && null === formValues.publishDateTimeStart.match(PATTERN_DATETIME)) {
    // 公開開始日時に何か入力されていた場合、フォーマットチェックを行う。
    // 公開開始日時フォーマットエラー
    logger.debug("publishDateTimeStart is invalid format");
    errorInfo.publishDateTimeStart = {
      msg: constants.MESSAGE.PUBLISHDATE_START_FORMAT
    }
    hasInvalidValue = true;
  }

  if (formValues.publishDateTimeStart.length <= 0) {
    // 公開開始日時 IS NULL
    logger.debug("publishDateTimeStart is null");
    errorInfo.publishDateTimeStart = {
      msg: constants.MESSAGE.PUBLISHDATE_START_NULL
    }
    hasInvalidValue = true;
  }

  
  if (formValues.publishDateTimeEnd.length <= 0) {
    // 公開終了日時 IS NULL
    logger.debug("publishDateTimeEnd is null");
    errorInfo.publishDateTimeStart = {
      msg: constants.MESSAGE.PUBLISHDATE_END_NULL
    }
    hasInvalidValue = true;
  }

  if ('' !== formValues.publishDateTimeEnd) {
    // 公開終了日時に何か入力されていた場合、フォーマットチェックを行う。
    if (null === formValues.publishDateTimeEnd.match(PATTERN_DATETIME)) {
      // 公開終了日時フォーマットエラー
      logger.debug("publishDateTimeEnd is invalid format");
      errorInfo.publishDateTimeEnd = {
        msg: constants.MESSAGE.PUBLISHDATE_END_FORMAT
      }
      hasInvalidValue = true;
    } else if(null !== formValues.publishDateTimeStart.match(PATTERN_DATETIME)) {
      if (0 <= util.compareDateTime(formValues.publishDateTimeStart, formValues.publishDateTimeEnd)) {
        // 公開終了日時が公開開始日時よりも前の場合
        logger.debug('publishDateTimeEnd(' + formValues.publishDateTimeEnd + ') is prior to publishDateTimeStart(' + formValues.publishDateTimeStart + ')');
        errorInfo.publishDateTimeEnd = {
          msg: constants.MESSAGE.PUBLISHDATE_END_PRIOR_TO_START
        }
        hasInvalidValue = true;
      }
    }
  }

  return hasInvalidValue ? errorInfo : null;
};


module.exports = router;
