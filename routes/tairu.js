const express = require('express');
const sessionManager = require('../submodules/session-manager');
const router = express.Router();
const cloudantTairuModel = require('../postgres_model/tairu-model');
const cloudantImageModel = require('../postgres_model/image-model');
const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');
const util = require('../submodules/util');
const sessionModel = require('../postgres_model/session-model');

// 画面一覧表示
router.get('/', async (req, res, next) => {
    logger.info('received request URL : ' + req.originalUrl);
    const session = global.session;
    const info = {title: constants.TITLE.TAIRU}
    try {
      const items = await cloudantTairuModel.getItems();
      // 連番を付与
      let number = 1;
      for (const i in items) {
          if (items.hasOwnProperty(i)) {
            items[i].number = number++;
            if (items[i].coordinate == 1) {
              items[i].coordinate = constants.COORDINATE_ATTRS[0]
            } else {
              items[i].coordinate = constants.COORDINATE_ATTRS[1]
            }
          }
      }
      info.datas = items
      try {
          if (session[0] && session[0].errorMsg && session[0].errorMsg !== null) {
              info.error = session[0].errorMsg;
              await sessionModel.updateSession(session[0], req);
          }
      } catch (error) {
          logger.error('getSession/updateSession error : \n' + error);
          msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
          res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg });
          return;
      }
    } catch(err) {
      info.error = util.getCatchMessage(err);
    }

    util.renderWithBaseInfo(req, res, constants.VIEW.TAIRU, info, session);
});

// 編集へ遷移。編集完了した場合一覧に遷移。
router.get('/update', async (req, res, next) => {
  logger.info('received request URL : ' + req.originalUrl);
  const session = global.session;
  const tairuId = req.query.tairuId;
  try{
    let rows = await cloudantTairuModel.getItemById(tairuId);
    if (rows.length != 1) {
      throw Error('faild to get extendInfo');
    }
    const info = {
      title: constants.TITLE.TAIRU_FORM,
      data: rows[0],
      attrs: [{"id":1,"name":constants.COORDINATE_ATTRS[0]},{"id":2,"name":constants.COORDINATE_ATTRS[1]}]
    }
    util.renderWithBaseInfo(req, res, constants.VIEW.TAIRU_FORM, info, session);
  } catch(err) {
    let msg = util.getCatchMessage(err);
    util.renderWithBaseInfo(req, res, constants.VIEW.TAIRU, {title: constants.TITLE.TAIRU, error:msg}, session);
  }
});

// 削除処理
router.post('/delete', async function(req, res, next) {
  const id = req.body.tairuId;

  logger.info('received request URL : ' + req.originalUrl);

  try{
    let item = await cloudantTairuModel.getItemById(id);
    if (item.length != 1) {
      throw Error('faild to get extendInfo');
    }

    let result = await cloudantTairuModel.deleteItem(id);
    result = await cloudantImageModel.deleteImageData(item.image_path);
    logger.debug('deleteImageData success');
    logger.debug('query result :\n' + JSON.stringify(result));
    res.redirect(constants.ROUTE.TAIRU);

  } catch(err) {
    let msg = util.getCatchMessage(err);
    util.renderWithBaseInfo(req, res, constants.VIEW.TAIRU, {title: constants.TITLE.TAIRU, error:msg}, session);
  }
});


module.exports = router;