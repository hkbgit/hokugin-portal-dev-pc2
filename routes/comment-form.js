const express = require('express');
const router = express.Router();
const cloudantKyaraModel = require('../postgres_model/kyara-model');
const cloudantImageModel = require('../postgres_model/image-model');
const cloudantCommentModel = require('../postgres_model/comment-model');
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

  logger.debug(' is success');

  const session = global.session;

  try{
    let rows = await cloudantKyaraModel.getItemsAsync();
    let info = {
      title: constants.TITLE.COMMENT_FORM,
      error: "",
      kyaraAttrs: rows
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
    util.renderWithBaseInfo(req, res, constants.VIEW.COMMENT_FORM, info, session);
  } catch (error) {
    logger.error('getAllKyaraCallback updateSession for delete errorMsg error : \n' + error);
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
  console.log("表单追加");

  var resultCount = 0
  try{
    if (req.body.commentId) {
      cloudantCommentModel.updateItem(req, session);
    } else {
      resultCount = await cloudantCommentModel.createItemAsync(req, session);
    }

    logger.debug('createItem is success')
    res.redirect(constants.ROUTE.COMMENT);
  } catch (err) {
    let msg = constants.MESSAGE.FAILED_TO_REGISTER_COMMENT;
    if(err.message === constants.CLOUDANT.ERROR_MESSAGE.ECONNREFUSED){
      msg = constants.CLOUDANT.RES_MESSAGE.DB_NOT_AVAILABLE;
      logger.fatal('cloudant server is not available.');
    }else{
      msg = constants.CLOUDANT.RES_MESSAGE.DB_ERROR_COMMON;
      logger.error('failed to query');
    }
    logger.error('error info : \n' + err);
    logger.debug('delete saved Image file');
    // renderError(req, res, {error: msg});
    try {
      await sessionModel.sessionAddErrorMsg(req,constants.MESSAGE.FAILED_TO_REGISTER_COMMENT);
      res.redirect(constants.ROUTE.COMMENT_REGISTER);
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
  console.log("表单校验22222...");
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
  formValues.comment = req.body.comment ? req.body.comment : EMPTY_VALUE;
  formValues.kyaraAttrId = req.body.kyaraAttrId ? req.body.kyaraAttrId : EMPTY_VALUE;
  formValues.link = req.body.link ? req.body.link : EMPTY_VALUE;
  formValues.publishDateTimeStart = req.body.publish_datetime_start ? req.body.publish_datetime_start : EMPTY_VALUE;
  formValues.publishDateTimeEnd = req.body.publish_datetime_end ? req.body.publish_datetime_end : EMPTY_VALUE;

  let hasInvalidValue = false;
  const errorInfo = {};

  logger.debug('validateInputValue() called');
  if (formValues.comment.length <= 0 || constants.MAX_LENGTH_TITLE < formValues.comment.length) {
    // タイトル文字列長エラー
    logger.debug("comment length is out of range");
    errorInfo.comment = {
      msg: constants.MESSAGE.COMMENT_TITLE_LENGTH
    };
    hasInvalidValue = true;
  }


  if ('' === formValues.kyaraAttrId) {
    // TOP画面バナー属性未選択エラー
    logger.debug("kyaraAttrId is not selected");
    errorInfo.kyaraAttr = {
      msg: constants.MESSAGE.COMMENT_ATTRIBUTE_MUST
    };
    hasInvalidValue = true;
  }


  // if (formValues.link.length <= 0 || constants.MAX_LENGTH_LINK < formValues.link.length) {
  //   // リンク先文字列長エラー
  //   logger.debug("link length is out of range");
  //   errorInfo.link = {
  //     msg: constants.MESSAGE.LINK_LENGTH
  //   }
  //   hasInvalidValue = true;
  // }

  if ('' !== formValues.publishDateTimeStart && null === formValues.publishDateTimeStart.match(PATTERN_DATETIME)) {
    // 公開開始日時に何か入力されていた場合、フォーマットチェックを行う。
    // 公開開始日時フォーマットエラー
    logger.debug("publishDateTimeStart is invalid format");
    errorInfo.publishDateTimeStart = {
      msg: constants.MESSAGE.PUBLISHDATE_START_FORMAT
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
