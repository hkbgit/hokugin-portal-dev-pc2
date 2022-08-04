const express = require('express');
const router = express.Router();
const userModel = require('../models/user-model')
// const cloudantUserModel = require('../postgres_model/user-model');
// const sessionModel = require('../postgres_model/session-model');
const crypto = require('crypto');
const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');
const util = require('../submodules/util');

const cloudantUserModel = require('../postgres_model/user-model');
const sessionModel = require('../postgres_model/session-model');

router.get('/', function(req, res, next) {
  logger.info('received request URL : ' + req.originalUrl);
  const session = global.session;
  util.renderWithBaseInfo(req, res, constants.VIEW.PASSWORD, {}, session);
});

// パスワード変更時処理
router.post('/', function(req, res, next) {
  logger.info('received request URL : ' + req.originalUrl);
  const session = global.session;
  if (isInputValueValid(req, res)) {
    cloudantUserModel.updatePassword(req, res, session, passwordUpdateCallback);
  }
});

/**
 * バリデーションチェックの実行結果をフロントに返す。
 * 本ルーティングはajax通信により行われる為、ビューのレンダーは行わない。
 * 代わりにバリデーションの実行結果をJSONでレスポンスする。
 * バリデーション異常なしの場合は空文字を返す。
 */
router.post('/validate', function(req, res, next) {
  logger.info('received request URL : ' + req.originalUrl);
  const errorInfo = validateInputValue(req);
  if (errorInfo) {
    // 入力値エラー発生
    res.json(errorInfo);
  } else {
    // 入力値異常なし
    res.json('');
  }
});

/**
 * パスワード更新SQL実行後に呼び出されるコールバック
 * @param err エラー内容
 * @param req リクエスト
 * @param res レスポンス
 * @param result SQLの実行結果
 * @param updateDate パスワード更新日
 */
const passwordUpdateCallback = async(err, req, res, result, updateDate)=> {
  if (err) {
    let msg = '';
    if (err.code === constants.ERROR.ECONNREFUSED) {
      msg = constants.MESSAGE.DB_NOT_AVAILABLE;
      logger.fatal('mysql server is not available.');
    } else {
      msg = constants.MESSAGE.DB_ERROR_COMMON;
      logger.error('failed to query');
    }
    logger.error('error info : \n' + err);
    renderError(req, res, msg);
    return;
  };
  //(result.affectedRows === 1 && result.changedRows === 1
  if (result.ok) {
    session[0].user_last_password_updated_date = updateDate;
    try {
      // let rows = await sessionModel.getSession(req);
      await sessionModel.updateSession(session[0]);
    } catch (error) {
      logger.error('passwordUpdateCallback updateSession error: \n' + err);
      req.session.destroy(function(err) {
        if (err) throw err;
      });
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    util.renderWithBaseInfo(req, res, constants.VIEW.PASSWORD, {
      info: constants.MESSAGE.PASSWORD_UPDATE_SUCCESS
    }, session);
    return;
  } else {
    renderError(req, res, constants.MESSAGE.PASSWORD_UPDATE_FAILURE, session);
    return;
  }
};

/**
 * 入力内容のバリデーションチェック
 * @param req リクエスト
 * @param res レスポンス
 */
const isInputValueValid = function(req, res) {
  const currentPass = req.body.currentPass;
  const newPass = req.body.newPass;
  const newPass2 = req.body.newPass2;
  let errMsg = null;
  if (undefined === currentPass ||
      undefined === newPass ||
      undefined === newPass2) {
        errMsg = constants.MESSAGE.REQUEST_ERROR_PARAMS;
      }
  if (newPass !== newPass2) {
    errMsg = constants.MESSAGE.INCORRECT_CONFIRM_PASSWORD;
  }

  if (null !== errMsg) {
    renderError(req, res, errMsg);
    return false;
  }
  return true;
}

/**
 * 入力内容バリデーションチェック
 * ファイル内容のチェックはここでは行わない。
 * @param req リクエスト
 * @return null: バリデーション問題なし
 *         バリデーション異常の場合は該当フォームのエラー情報を連想配列で返す
 */
const validateInputValue = function(req) {
  const formValues = {};
  const EMPTY_VALUE = '';
  formValues.currentPass = req.body.currentPass ? req.body.currentPass : EMPTY_VALUE;
  formValues.newPass = req.body.newPass ? req.body.newPass : EMPTY_VALUE;
  formValues.newPass2 = req.body.newPass2 ? req.body.newPass2 : EMPTY_VALUE;
  let hasInvalidValue = false;
  const errorInfo = {};
  logger.debug('validateInputValue() called');
  if (formValues.currentPass.length <= 0 || constants.MAX_LENGTH_PASSWORD < formValues.currentPass.length) {
    // 現在のパスワード文字列長エラー
    logger.debug("currentPass length is out of range");
    errorInfo.currentPass = {
      msg: constants.MESSAGE.PASSWORD_LENGTH
    };
    hasInvalidValue = true;
  }

  if (formValues.newPass.length <= 0 || constants.MAX_LENGTH_PASSWORD < formValues.newPass.length) {
    // 新しいパスワード文字列長エラー
    logger.debug("newPass length is out of range");
    errorInfo.newPass = {
      msg: constants.MESSAGE.PASSWORD_LENGTH
    };
    hasInvalidValue = true;
  }

  if (formValues.newPass2.length <= 0 || constants.MAX_LENGTH_PASSWORD < formValues.newPass2.length) {
    // 新しいパスワード（確認用）文字列長エラー
    logger.debug("newPass2 length is out of range");
    errorInfo.newPass2 = {
      msg: constants.MESSAGE.PASSWORD_LENGTH
    };
    hasInvalidValue = true;
  }

  if (0 < formValues.newPass.length && 0 < formValues.newPass2.length && formValues.newPass !== formValues.newPass2) {
    // 新しいパスワードが確認用パスワードと異なる場合のエラー
    logger.debug("newPass2 is not equal to newPass");
    errorInfo.newPass2 = {
      msg: constants.MESSAGE.INCORRECT_CONFIRM_PASSWORD
    };
    hasInvalidValue = true;
  }

  return hasInvalidValue ? errorInfo : null;
};

/**
 * エラー発生時に再度パスワード変更画面をレンダリングする。
 * @param req リクエスト
 * @param res レスポンス
 * @param errMsg パスワード変更画面に表示するエラーメッセージ
 */
const renderError = function(req, res, errMsg, session) {
  util.renderWithBaseInfo(req, res, constants.VIEW.PASSWORD, {
    error: errMsg
  },session);
}

module.exports = router;
