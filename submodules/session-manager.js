const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');
const sessionModel = require('../postgres_model/session-model');


// セッションが有効かチェックする
// 無効な場合はログイン画面にリダイレクトする。
// exports.sessionCheck = function(req, res, next) {
//   if (req.session.user_name) {
//     next();
//   } else {
//     res.redirect(constants.ROUTE.LOGIN);
//   }
// }

// // セッションを破棄する
// exports.destroy = function(req) {
//   logger.debug('destroy session');
//   req.session.destroy(function(err) {
//     if (err) throw err;
//   });
// };
exports.sessionCheck = async(req, res, next) => {
  if(req.cookies.sessionId){
    logger.info('sessionCheck req.cookies.sessionId: '+req.cookies.sessionId);
    let session = null;
    try {
      session = await sessionModel.getSession(req);
    } catch (error) {
      req.session.destroy(function(err) {
        if (err) throw err;
      });
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    if(session.length !== 0){
      let now = new Date().getTime();
      let maxAge = session[0].date + 1800000;
      logger.info('now: '+now);
      logger.info('maxAge: '+maxAge);
      if(now <= maxAge){
        global.session = session;
        next();
      }else{
        try {
          await sessionModel.deleteSession(session.id);
          req.session.destroy(function(err) {
            if (err) throw err;
          });
          res.redirect(constants.ROUTE.LOGIN);
        } catch (error) {
          req.session.destroy(function(err) {
            if (err) throw err;
          });
          msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
          res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
          return;
        } 
      }
    }else{
      res.redirect(constants.ROUTE.LOGIN);
    }
  }else {
    logger.info('sessionCheck not req.cookies.sessionId!');
    res.redirect(constants.ROUTE.LOGIN);
  }
}

// セッションを破棄する
exports.destroy = async(req) => {
  logger.debug('destroy session');
  req.session.destroy(function(err) {
    if (err) throw err;
  });
};