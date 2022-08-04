const express = require('express');
const sessionManager = require('../submodules/session-manager');
const router = express.Router();
const cloudantKyaraModel = require('../postgres_model/kyara-model');
const cloudantCommentModel = require('../postgres_model/comment-model');
const cloudantImageModel = require('../postgres_model/image-model');
const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');
const util = require('../submodules/util');
const sessionModel = require('../postgres_model/session-model');

// 画面一覧表示
router.get('/', async (req, res, next) => {
    logger.info('received request URL : ' + req.originalUrl);
    const session = global.session;
    cloudantKyaraModel.getAll(req, res, session, getAllsCallback);
});

// 編集へ遷移。編集完了した場合一覧に遷移。
router.get('/update', async (req, res, next) => {
  logger.info('received request URL : ' + req.originalUrl);
  const session = global.session;
  const kyaraId = req.query.kyaraId;
  let rows = await cloudantKyaraModel.getItemById(kyaraId);
  if (rows.length != 1) {
    throw Error('faild to get extendInfo');
  }
  const info = {
    title: constants.TITLE.KYARA_FORM,
    kyaraInfo: rows[0]
  }
  // global.extendInfo=rows[0];
  util.renderWithBaseInfo(req, res, constants.VIEW.KYARA_FORM, info, session);
});

// バナー削除処理
router.post('/delete', async function(req, res, next) {
  const kyaraId = req.body.kyaraId;
 
  logger.info('received request URL : ' + req.originalUrl);

  let kyaraInfo = await cloudantKyaraModel.getItemById(kyaraId);
  if (kyaraInfo.length != 1) {
    throw Error('faild to get extendInfo');
  }

  let comments = await cloudantCommentModel.getItemsByKaraId(kyaraId);
  if (comments.length > 0) {
    try {
      await sessionModel.sessionAddErrorMsg(req,constants.MESSAGE.CANNOT_DELETE_KYARA_COMMENT);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    res.redirect(constants.ROUTE.KYARA);
    return;
  }

  const result = await cloudantKyaraModel.deleteItem(kyaraId);
  if (result.errorNum && result.errorNum > 0) {
    try {
      await sessionModel.sessionAddErrorMsg(req,constants.MESSAGE.FAILED_TO_DELETE_KYARA);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    res.redirect(constants.ROUTE.KYARA);
    return;
    // throw new Error();
  } else if (!result.errorNum){
    logger.debug('deleting topExtend has done');
    try {
      var image_path = kyaraInfo[0].image_path
      const result = await cloudantImageModel.deleteImageData(image_path);
      logger.debug('deleteImageData success');
      logger.debug('query result :\n' + JSON.stringify(result));
      // 正常終了時はTOP画面バナー一覧にリダイレクトする
      res.redirect(constants.ROUTE.KYARA);
    } catch (err) {
      let msg = constants.MESSAGE.FAILED_TO_DELETE_KYARA;
      if(err.message === constants.CLOUDANT.ERROR_MESSAGE.ECONNREFUSED){
        msg = constants.CLOUDANT.RES_MESSAGE.DB_NOT_AVAILABLE;
        logger.fatal('cloudant server is not available.');
      }else{
        msg = constants.CLOUDANT.RES_MESSAGE.DB_ERROR_COMMON;
        logger.error('failed to query');
      }
      logger.error('error info : \n' + err);
      
      res.redirect(constants.ROUTE.KYARA);
    }
  } else {
    try {
      await sessionModel.sessionAddErrorMsg(req,constants.MESSAGE.FAILED_TO_DELETE_KYARA);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    res.redirect(constants.ROUTE.KYARA);
  }
  
});

/**
* コメント画面バナー取得のselect文実行後のコールバック
* @param err エラー情報
* @param req リクエスト
* @param res レスポンス
* @param rows select文実行結果
 */
const getAllsCallback = async (err, req, res, session, rows) => {
    let msg = '';
    console.log("getAllsCallback")
    if (err) {
        
        if (err.message === constants.CLOUDANT.ERROR_MESSAGE.ECONNREFUSED) {
            msg = constants.CLOUDANT.RES_MESSAGE.DB_NOT_AVAILABLE;
            logger.fatal('cloudant server is not available.');
        } else {
            msg = constants.CLOUDANT.RES_MESSAGE.DB_ERROR_COMMON;
            logger.error('failed to query');
        }
        logger.error('error info : \n' + err);
        util.renderWithBaseInfo(req, res, constants.VIEW.KYARA, {
            title: constants.TITLE.KYARA,
            datas: [],
            contractNumber: "",
            error: msg,
        }, session);
        return;
    }
    const comments = rows;
    // 連番を付与
    let number = 1;
    for (const i in comments) {
        if (comments.hasOwnProperty(i)) {
            comments[i].number = number++;
        }
    }

    const info = {
        title: constants.TITLE.KYARA,
        datas: comments
    }
    try {
        // session = await sessionModel.getSession(req);
        if (session[0] && session[0].errorMsg && session[0].errorMsg !== null) {
            info.error = session[0].errorMsg;
            // req.session.errorMsg = null;
            await sessionModel.updateSession(session[0], req);
        }
    } catch (error) {
        logger.error('getAllsCallback getSession/updateSession error : \n' + error);
        // sessionManager.destroy(req);
        //将session从数据库中删除
        msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
        res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg });
        return;
    }
    logger.debug('getAllsCallback has done');
    util.renderWithBaseInfo(req, res, constants.VIEW.KYARA, info, session);
};

module.exports = router;