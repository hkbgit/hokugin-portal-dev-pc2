const express = require('express');
const router = express.Router();
const userModel = require('../postgres_model/user-model');
const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');
const sessionModel = require('../postgres_model/session-model');

router.get('/', function(req, res, next) {
  logger.info('received request URL : ' + req.originalUrl);
  res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN });
});

router.post('/', function(req, res, next) {
  logger.info('received request URL : ' + req.originalUrl);
  userModel.auth(req, res, authCallback);
});

/**
 * ログイン認証クエリー実行後のコールバック
 * @param err エラー情報
 * @param req リクエスト
 * @param res レスポンス
 * @param rows select文実行結果
 */
const authCallback = async(err, req, res, rows) =>{
  if (err) {
    let msg = '';
    if(err.message === constants.CLOUDANT.ERROR_MESSAGE.ECONNREFUSED){
      msg = constants.CLOUDANT.RES_MESSAGE.DB_NOT_AVAILABLE;
      logger.fatal('cloudant server is not available.');
    }else{
      msg = constants.CLOUDANT.RES_MESSAGE.DB_ERROR_COMMON;
      logger.error('failed to query');
    }
    logger.error(' auth error info : \n' + err);
    res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
    return;
  };
  if (rows.length === 0) {
    console.log('authCallback，rows.docs.length === 0');
    logger.debug('failed to login');
    msg = constants.CLOUDANT.RES_MESSAGE.LOGIN_FAILURE;
    res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
    return;
  };
  const user = rows[0];
  logger.debug("login success!");
  // req.session.user_id = user.id;
  // req.session.user_name = user.name;
  // req.session.user_last_password_updated_date = user.last_password_updated_date;
  // res.redirect(constants.ROUTE.BANNERS);
  // return;
  try {
    await sessionModel.insertSession(req,user);
    res.set('Set-Cookie', `sessionId=${req.session.id}`);
    // res.redirect(constants.ROUTE.BANNERS);
    res.redirect(constants.ROUTE.TOP_BANNERS);
  } catch (error) {
    logger.error('authCallback-insertSession error info:  \n' + error);
    req.session.destroy(function(err) {
      if (err) throw err;
    });
    msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
    res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
  } 
}

module.exports = router;
