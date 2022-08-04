const express = require('express');
const router = express.Router();
const sessionManager = require('../submodules/session-manager');
const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');
const sessionModel = require('../postgres_model/session-model');

router.get('/', async(req, res, next) => {
  logger.info('received request URL : ' + req.originalUrl);
  try {
    //select session from database
    let rows = await sessionModel.getSession(req);
    //delete session from database
    await sessionModel.deleteSession(rows[0].id);
    //delete session from sever
    sessionManager.destroy(req);
    logger.debug('logout.');
    res.redirect(constants.ROUTE.LOGIN);
  } catch (error) {
    logger.error('logout delete session error: '+error);
    sessionManager.destroy(req);
    msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
    res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
  }
  
});

module.exports = router;
