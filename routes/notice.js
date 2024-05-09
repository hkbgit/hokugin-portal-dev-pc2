const express = require('express');
const sessionManager = require('../submodules/session-manager');
const router = express.Router();
const cloudantNoticeModel = require('../postgres_model/notice-model');
const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');
const util = require('../submodules/util');
const sessionModel = require('../postgres_model/session-model');

// お知らせ一覧表示
router.get('/', async (req, res, next) => {
    logger.info('received request URL : ' + req.originalUrl);
    const session = global.session;
    
    try {
        let rows = await cloudantNoticeModel.getItems(req, res, session, getAllsCallback);
        const notices = rows;
        // 連番を付与
        let number = 1;
        for (const i in notices) {
            if (notices.hasOwnProperty(i)) {
                notices[i].number = number++;
            }
        }
    
        const info = {
            title: constants.TITLE.NOTICE,
            notices: notices
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
        util.renderWithBaseInfo(req, res, constants.VIEW.NOTICE, info, session);
    } catch (error) {
        logger.error('getAllsCallback getSession/updateSession error : \n' + error);
        msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
        res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg });
        return;
    }
    
   
});

// 編集へ遷移。編集完了した場合一覧に遷移。
router.get('/update', async (req, res, next) => {
    logger.info('received request URL : ' + req.originalUrl);
    const session = global.session;
    const noticeId = req.query.noticeId;
    try {
        let rows = await cloudantNoticeModel.getItemById(noticeId);
        if (rows.length != 1) {
        throw Error('faild to get extendInfo');
        }
        const info = {
            title: constants.TITLE.NOTICE_FORM,
            notice: rows[0],
        }
        // global.extendInfo=rows[0];
        util.renderWithBaseInfo(req, res, constants.VIEW.NOTICE_FORM, info, session);
    } catch (err) {
        let msg = '';
        if(err.message === constants.CLOUDANT.ERROR_MESSAGE.ECONNREFUSED){
          msg = constants.CLOUDANT.RES_MESSAGE.DB_NOT_AVAILABLE;
          logger.fatal('cloudant server is not available.');
        }else{
          msg = constants.CLOUDANT.RES_MESSAGE.DB_ERROR_COMMON;
          logger.error('failed to query');
        }
        logger.error('error info : \n' + err);
        util.renderWithBaseInfo(req, res, constants.VIEW.NOTICE, {
            title: constants.TITLE.NOTICE, error: msg,
            }, session);
        return;
    }
    
  });

// 削除処理
router.post('/delete', async function(req, res, next) {
    logger.info('received request URL : ' + req.originalUrl);
    const noticeId = req.body.noticeId;
    try {
        let notice = await cloudantNoticeModel.getItemById(noticeId);
        if (notice.length != 1) {
          throw Error('faild to get notice');
        }
      
        const result = await cloudantNoticeModel.deleteItem(noticeId);

        res.redirect(constants.ROUTE.NOTICE);
    } catch (err) {
        let msg = '';
        if(err.message === constants.CLOUDANT.ERROR_MESSAGE.ECONNREFUSED){
          msg = constants.CLOUDANT.RES_MESSAGE.DB_NOT_AVAILABLE;
          logger.fatal('cloudant server is not available.');
        }else{
          msg = constants.CLOUDANT.RES_MESSAGE.DB_ERROR_COMMON;
          logger.error('failed to query');
        }
        logger.error('error info : \n' + err);
        util.renderWithBaseInfo(req, res, constants.VIEW.NOTICE, {
            title: constants.TITLE.NOTICE, error: msg,
            }, session);
        return;
    }
    
  });

/**
* お知らせ画面取得のselect文実行後のコールバック
* @param err エラー情報
* @param req リクエスト
* @param res レスポンス
* @param rows select文実行結果
 */
const getAllsCallback = async (err, req, res, session, rows) => {

    console.log("getAllsCallback")
    if (err) {
        let msg = '';
        if (err.message === constants.CLOUDANT.ERROR_MESSAGE.ECONNREFUSED) {
            msg = constants.CLOUDANT.RES_MESSAGE.DB_NOT_AVAILABLE;
            logger.fatal('cloudant server is not available.');
        } else {
            msg = constants.CLOUDANT.RES_MESSAGE.DB_ERROR_COMMON;
            logger.error('failed to query');
        }
        logger.error('error info : \n' + err);
        util.renderWithBaseInfo(req, res, constants.VIEW.NOTICE, {
            title: constants.TITLE.NOTICE,
            notices: [],
            contractNumber: "",
            error: msg,
        }, session);
        return;
    }
    const notices = rows;
    // 連番を付与
    let number = 1;
    for (const i in notices) {
        if (notices.hasOwnProperty(i)) {
            notices[i].number = number++;
        }
    }

    const info = {
        title: constants.TITLE.NOTICE,
        notices: notices
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
    util.renderWithBaseInfo(req, res, constants.VIEW.NOTICE, info, session);
};


module.exports = router;