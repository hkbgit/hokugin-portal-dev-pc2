const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');
/**
 * ログイン認証クエリー実行後のコールバック
 * @param err エラー情報
 * @param req リクエスト
 * @param res レスポンス
 * @param rows select文実行結果
 */
exports.authCallback = function(err, req, res, rows) {
    if (err) {
      let msg = '';
      if (err.message === constants.CLOUDANT.ERROR_MESSAGE.ECONNREFUSED) {
        msg = constants.CLOUDANT.RES_MESSAGE.DB_NOT_AVAILABLE;
        logger.fatal('cloudant server is not available.');
      }else {
        msg = constants.CLOUDANT.RES_MESSAGE.DB_ERROR_COMMON;
        logger.error('failed to query');
      }
      logger.error('error info : \n' + err);
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    if (rows.docs.length === 0) {
      logger.debug('failed to login');
      msg = constants.CLOUDANT.RES_MESSAGE.LOGIN_FAILURE;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    };
    const user = rows.docs[0];
    logger.debug("login success!");
    req.session.user_id = user._id;
    req.session.user_rev = user._rev;
    req.session.user_name = user.name;
    req.session.user_last_password_updated_date = user.last_password_updated_date;
    res.redirect(constants.ROUTE.BANNERS);
  }