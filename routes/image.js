
const express = require('express');
const router = express.Router();
const cloudantImageModle = require('../postgres_model/image-model');
const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');
const fs = require('fs');

/**
 * 画像ファイル取得select文のコールバック
 * @param err エラー情報
 * @param req リクエスト
 * @param res レスポンス
 * @param rows select文実行結果
 * @param next next()関数
 */
const getImageBinaryCallback = function(err, req, res, rows, next) {
  if (err) {
    if (err.code === constants.ERROR.ECONNREFUSED) {
      logger.fatal("mysql server is not available.");
    } else {
      logger.error("failed to query");
    }
    logger.error('error info : \n' + err);
    next();
    return;
  }
  if (1 !== rows.length) {
    logger.error('result rows is not 1 record');
    next();
    return;
  }
  logger.debug('getImageBinary is success');
  //const imageBin = rows[0].image_binary;
  //const imageBin = Buffer.from(rows[0].image_binary);

  const imageBin = Buffer.from(rows[0].image_binary, 'base64');
  res.set('Content-Type', 'image/png');
  res.status(200).send(imageBin);
};

/**
 * 画像ファイル取得
 */
router.get('/:filepath', function(req, res, next) {
  logger.info('received request URL : ' + req.originalUrl);
  const filepath = '/img/' + req.params.filepath;
  if (!filepath) {
    logger.error('failed to get query(filepath)');
    next();
    return;
  }
  cloudantImageModle.getImageBinary(req, res, getImageBinaryCallback, filepath, next);
});

module.exports = router;
