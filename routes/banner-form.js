const express = require('express');
const router = express.Router();
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
const cloudantBannerModel = require('../postgres_model/banner-model');
const cloudantImageModel = require('../postgres_model/image-model');
const cloudantBannerPositionModel = require('../postgres_model/banner-position-model');

router.get('/', async(req, res, next) => {
  logger.info('received request URL : ' + req.originalUrl);
  const session = global.session;

  cloudantBannerPositionModel.getAllBannerPositions(req, res, session, getAllBannerPositionsCallback);
});

/**
 * バナー情報の送信時（新規追加・更新）
 */
router.post('/', img.single('image'), async function(req, res, next) {
  logger.info('received request URL : ' + req.originalUrl);
  const session = global.session;
  if (req.body.bannerId) {
    // バナーIDが取得できた場合はバナー更新処理
    if (req.file) {
      await saveImage(req, res, session, req.file, true);
    } else {
      // バナー画像は更新しない場合
      cloudantBannerModel.updateBanner(req, res, session, updateBannerCallback);
    }
  } else {
    // バナー新規追加処理
    if (!req.file) {
      logger.error('file has not been attached');
      next();
      return;
    }
    await saveImage(req, res, session, req.file);
  }
});

/**
 * バリデーションチェックの実行結果をフロントに返す。
 * 本ルーティングはajax通信により行われる為、ビューのレンダーは行わない。
 * 代わりにバリデーションの実行結果をJSONでレスポンスする。
 * バリデーション異常なしの場合は空文字を返す。
 */
router.post('/validate', img.single('image'), async(req, res, next) =>{
  logger.info('received request URL : ' + req.originalUrl);
  let errorInfo = null;
  if (req.file) {
    // ファイルアップロードのエラー情報
    errorInfo = checkUploadedFile(req.file);
  }
  const inputErrorInfo = validateInputValue(req);
  if (errorInfo && inputErrorInfo) {
    // ファイルアップロードのエラー情報とその他フォームのエラー情報をマージする
    errorInfo = Object.assign(errorInfo, inputErrorInfo);
  } else if (!errorInfo && inputErrorInfo) {
    errorInfo = inputErrorInfo;
  }
  if (req.file) {
    // ファイル添付がされている場合、ディレクトリに保存された添付ファイルを削除する。
    fs.unlink(req.file.path, async(err) => {
      if (err) {
        logger.error('deleting attached file failed.');
        logger.fatal('attached file('+ req.file.path +') has been no longer used. please delete it  manually');
        // req.session.errorMsg = constants.MESSAGE.IMAGE_REMOVE_ERROR;
        try {
          await sessionModel.sessionAddErrorMsg(req,constants.MESSAGE.IMAGE_REMOVE_ERROR);
        } catch (error) {
          logger.error('save session errorMsg error: '+error);
          sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
          msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
          res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
          return;
        }
      } else {
        logger.info('deleting attached file success');
      }
    });
  }
  if (errorInfo) {
    // 入力値エラー発生
    res.json(errorInfo);
  } else {
    // 入力値異常なし
    res.json('');
  }
});

/**
 * バナー配置場所取得のselect文実行後のコールバック
 * @param err エラー情報
 * @param req リクエスト
 * @param res レスポンス
 * @param rows select文実行結果
 */
const getAllBannerPositionsCallback = async (err, req, res, session, rows)=> {
  if (err) {
    let msg = constants.MESSAGE.FAILED_TO_LOAD_BANNER_POSITIONS;
    if(err.message === constants.CLOUDANT.ERROR_MESSAGE.ECONNREFUSED){
      msg = constants.CLOUDANT.RES_MESSAGE.DB_NOT_AVAILABLE;
      logger.fatal('cloudant server is not available.');
    }else{
      msg = constants.CLOUDANT.RES_MESSAGE.DB_ERROR_COMMON;
      logger.error('failed to query');
    }
    logger.error('error info : \n' + err);
    // renderError(req, res, {error: msg}, session);
    // renderError(req, res, msg, session);
    let info = {
      title: constants.TITLE.BANNER_REGISTER,
      error: constants.MESSAGE.FAILED_TO_LOAD_BANNER_POSITIONS,
      bannerPostions: []
    }
    util.renderWithBaseInfo(req, res, constants.VIEW.BANNER_FORM, info, session);
    return;
  }
  logger.debug('getAllBannerPositions is success');
  const info = {
    title: constants.TITLE.BANNER_REGISTER,
    bannerPostions: rows
  }
  // if (req.session.errorMsg) {
  //   info.error = req.session.errorMsg;
  //   req.session.errorMsg = null;
  // }else{//如果session errorMsg为令一台服务器上的，这里需要进行数据库的session数据查询
    try {
      // let body = await sessionModel.getSession(req);
      if(session[0] && session[0].errorMsg && session[0].errorMsg !== null){
        info.error = session[0].errorMsg;
        // req.session.errorMsg = null;
        await sessionModel.updateSession(session[0],req);
      }
    } catch (error) {
      logger.error('getAllBannerPositionsCallback updateSession for delete errorMsg error : \n' + error);
      sessionManager.destroy(req);
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
  // }
  util.renderWithBaseInfo(req, res, constants.VIEW.BANNER_FORM, info, session);
};

/**
 * バナー新規追加のinsert文実行後のコールバック
 * @param err エラー情報
 * @param req リクエスト
 * @param res レスポンス
 * @param result insert文実行結果
 */
const createBannerCallback = async(err, req, res, result) => {
  if (err) {
    let msg = constants.MESSAGE.FAILED_TO_REGISTER_BANNER;
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
      await sessionModel.sessionAddErrorMsg(req,constants.MESSAGE.FAILED_TO_REGISTER_BANNER);
      res.redirect(constants.ROUTE.REGISTER_BANNER);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    return;
  }
  logger.debug('createbanner is success')
  logger.debug('query result :\n' + JSON.stringify(result));
  res.redirect(constants.ROUTE.BANNERS);
  return;
};

/**
 * バナー情報更新のupdate文実行後のコールバック
 * @param err エラー情報
 * @param req リクエスト
 * @param res レスポンス
 * @param result update文実行結果
 */
const updateBannerCallback = async(err, req, res, session, result) => {
  if (err) {
    // クエリ実行失敗時
    logger.error('failed to query');
    logger.error('error message : \n' + err);
    // req.session.errorMsg = constants.MESSAGE.FAILED_TO_UPDATE_BANNER;
    try {
      await sessionModel.addErrorMsg(session,constants.MESSAGE.FAILED_TO_UPDATE_BANNER);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    res.redirect(constants.ROUTE.UPDATE + '?bannerId=' + req.body.bannerId);
    return;
  }
  if (true !== result.ok) {
    // affectedRowsが1以外の場合は更新なし（該当レコードなし）なので失敗扱いにする。
    logger.error('affectedRows not equals 1. failed to update banner info');
    // req.session.errorMsg = constants.MESSAGE.FAILED_TO_UPDATE_BANNER;
    try {
      await sessionModel.addErrorMsg(session,constants.MESSAGE.FAILED_TO_UPDATE_BANNER);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    res.redirect(constants.ROUTE.BANNERS);
    return;
  }
  logger.debug('updateBanner is success')
  logger.debug('query result :\n' + JSON.stringify(result));
  res.redirect(constants.ROUTE.BANNERS);
  return;
};

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
  formValues.title = req.body.title ? req.body.title : EMPTY_VALUE;
  formValues.bannerPositionId = req.body.bannerPosition ? req.body.bannerPosition : EMPTY_VALUE;
  formValues.imageName = req.body.imageName ? req.body.imageName : EMPTY_VALUE;
  formValues.link = req.body.link ? req.body.link : EMPTY_VALUE;
  formValues.publishDateTimeStart = req.body.publish_datetime_start ? req.body.publish_datetime_start : EMPTY_VALUE;
  formValues.publishDateTimeEnd = req.body.publish_datetime_end ? req.body.publish_datetime_end : EMPTY_VALUE;
  formValues.priority = req.body.priority ? req.body.priority : EMPTY_VALUE;
  formValues.comment = req.body.comment ? req.body.comment : EMPTY_VALUE;
  let hasInvalidValue = false;
  const errorInfo = {};

  logger.debug('validateInputValue() called');
  if (formValues.title.length <= 0 || constants.MAX_LENGTH_TITLE < formValues.title.length) {
    // タイトル文字列長エラー
    logger.debug("title length is out of range");
    errorInfo.title = {
      msg: constants.MESSAGE.TITLE_LENGTH
    };
    hasInvalidValue = true;
  }

  if ('' === formValues.bannerPositionId) {
    // バナー配置場所未選択エラー
    logger.debug("bannerPosition is not selected");
    errorInfo.bannerPosition = {
      msg: constants.MESSAGE.BANNER_POSITION_MUST
    };
    hasInvalidValue = true;
  }

  if ('' === formValues.imageName) {
    // ファイル名未入力時エラー
    logger.debug('fileName is empty');
    errorInfo.image = {
      msg: constants.MESSAGE.FILE_NAME_IS_EMPTY
    };
    hasInvalidValue = true;
  }

  if (constants.MAX_LENGTH_LINK < formValues.link.length) {
    // リンク先文字列長エラー
    logger.debug("link length is out of range");
    errorInfo.link = {
      msg: constants.MESSAGE.LINK_LENGTH
    }
    hasInvalidValue = true;
  }
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
  if ('' !== formValues.priority) {
    // 表示優先順位に何か入力されていた場合、入力値をチェックする。
    const regex = new RegExp(/^[0-9]+$/);
    const isValid = regex.test(req.body.priority);
    if (!isValid) {
      // 表示優先順位の入力内容が整数変換に失敗した場合のエラー
      logger.debug("priority cannot parse to int");
      errorInfo.priority = {
        msg: constants.MESSAGE.PRIORITY_NOT_NUMBER
      }
      hasInvalidValue = true;
    } else {
      if (formValues.priority <= 0 || constants.MAX_NUMBER_PRIORITY < formValues.priority) {
        // 表示優先順位の値の範囲が指定外の場合のエラー
        logger.debug("priority is out of range");
        errorInfo.priority = {
          msg: constants.MESSAGE.PRIORITY_OUT_OF_RANGE
        }
        hasInvalidValue = true;
      }
    }
  }
  if (constants.MAX_LENGTH_COMMENT < formValues.comment.length) {
    // 備考文字列長エラー
    logger.debug("comment length is out of range");
    errorInfo.comment = {
      msg: constants.MESSAGE.COMMENT_LENGTH
    }
    hasInvalidValue = true;
  }

  return hasInvalidValue ? errorInfo : null;
};

/**
 * アップロードされたファイルの内容を確認する。
 * 拡張子及び画像ファイルの縦横比が許容された値ではない場合はエラー情報を連想配列にして
 * 返す。異常なしの場合はnullを返す。
 * @param file フォームでアップロードされたファイル情報
 * @return null: ファイル内容問題なし
 *         ファイル内容異常の場合はエラー情報を連想配列で返す
 */
const checkUploadedFile = function(file) {
  const errorInfo = {};
  let isInvalidFile = false;
  const token = file.originalname.split('.');
  const originExt = token[token.length - 1].toLowerCase();
  let isAcceptedExt = false;
  logger.debug('checkUploadedFile() called');
  // 拡張子確認
  for (const ext of constants.FILE_EXT_LIST) {
    if (originExt === ext) {
      isAcceptedExt = true;
      break;
    }
  }
  if (!isAcceptedExt) {
    // システムで定義された拡張子ではない場合
    logger.debug('file ext is not allowed. ext : ' + originExt);
    errorInfo.image = {
      msg: constants.MESSAGE.IMAGE_WRONG_EXT
    }
    isInvalidFile = true;
  }
  // 高さ・幅のサイズ確認
  try {
    const dimensions = sizeOf(file.path);
    const width = dimensions.width;
    const height = dimensions.height;
    let isAcceptedDimentions = false;
    for (const token of constants.FILE_DIMENSIONS_LIST) {
      if (width === token.WIDTH &&
        height === token.HEIGHT) {
          isAcceptedDimentions = true;
        }
    }
    if (!isAcceptedDimentions) {
      logger.debug('width or height are not allowed. width : ' + width + ', height : ' + height);
      errorInfo.image = {
        msg: constants.MESSAGE.IMAGE_WRONG_DIMENSION_SIZE
      }
      isInvalidFile = true;
    }
  } catch (e) {
    logger.debug('Exception occurred :\n' + e);
    errorInfo.image = {
      msg: constants.MESSAGE.IMAGE_TYPE_ERROR
    }
    isInvalidFile = true;
  }
  // 画像サイズ確認
  if (constants.MAX_FILE_SIZE < file.size) {
    logger.debug('file size is too large. file size : ' + file.size + ' bytes');
    errorInfo.image = {
      msg: constants.MESSAGE.IMAGE_FILE_SIZE_TOO_LARGE
    }
    isInvalidFile = true;
  }
  return isInvalidFile ? errorInfo : null;
}

/**
 * 画像データを格納する。
 * 画像データは1970年1月1日からの経過ミリ秒をファイル名として登録する。
 * 画像データの格納後はバナー情報をDBへ登録する。
 * @param req リクエスト
 * @param res レスポンス
 * @param file 画像ファイルオブジェクト
 * @param isUpdateBanner trueの場合はバナー情報を更新する。省略時はfalse
 */
const saveImage = async function(req, res, session, file, isUpdateBanner = false) {
  const now = new Date().getTime();
  const name = crypto.createHash('sha256').update(String(now)).digest('hex');
  const token = file.originalname.split('.');
  const ext = token[token.length - 1];
  const fileName = name + '.' + ext;
  const dest = constants.BANNER_ROOT_PATH + '/' + fileName;

  logger.debug('saveImage() called');
  // ファイルのバイナリデータ取得
  try {
    const data = await util.readFile(file.path);
    const buffer = Buffer.from(data, 'binary');
    data = buffer.toString('base64')
    try {
      await util.unlink(file.path);
    } catch (err) {
      logger.error('deleting attached file failed.');
      logger.fatal('attached file('+ file.path +') has been no longer used. please delete it  manually');
      // req.session.errorMsg = constants.MESSAGE.IMAGE_REMOVE_ERROR;
      try {
        await sessionModel.sessionAddErrorMsg(req,constants.MESSAGE.IMAGE_REMOVE_ERROR);
      } catch (error) {
        logger.error('save session errorMsg error: '+error);
        sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
        msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
        res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
        return;
      }

      if (isUpdateBanner) {
        res.redirect(constants.ROUTE.UPDATE + '?bannerId=' + req.body.bannerId);
      } else {
        res.redirect(constants.ROUTE.REGISTER_BANNER);
      }
      return;
    }
    // 画像挿入/更新クエリ実行
    try {
      if (isUpdateBanner) {
        // 既存のimageレコードを更新する
        let bannerInfo = await cloudantBannerModel.getBannerInfoSync(req.body.bannerId);
        if (bannerInfo.length !== 1) {
          throw Error('faild to get bannerInfo');
        }
        let originImagePath = bannerInfo[0].image_path;
        logger.debug('originImagePath => ' + originImagePath);
        let result = await cloudantImageModel.updateImageDataSync( dest, data, originImagePath);
        logger.debug('updateImage success');
        logger.debug('query result :\n' + JSON.stringify(result));
      } else {
        let result = await cloudantImageModel.insertImageDataSync(dest, data);
        logger.debug('insertImage success');
        logger.debug('query result :\n' + JSON.stringify(result));
      }
    } catch (err) {
      // クエリ実行失敗時
      logger.error('failed to query');
      logger.error('error message : \n' + err);
      if (isUpdateBanner) {
        // req.session.errorMsg = constants.MESSAGE.FAILED_TO_UPDATE_BANNER;
        try {
          await sessionModel.addErrorMsg(session,constants.MESSAGE.FAILED_TO_UPDATE_BANNER);
          res.redirect(constants.ROUTE.UPDATE + '?bannerId=' + req.body.bannerId);
        } catch (error) {
          logger.error('save session errorMsg error: '+error);
          sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
          msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
          res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
          return;
        }
      } else {
        // req.session.errorMsg = constants.MESSAGE.FAILED_TO_REGISTER_BANNER;
        try {
          await sessionModel.addErrorMsg(session,constants.MESSAGE.FAILED_TO_REGISTER_BANNER);
          res.redirect(constants.ROUTE.REGISTER_BANNER);
        } catch (error) {
          logger.error('save session errorMsg error: '+error);
          sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
          msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
          res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
          return;
        }
      }
      // await connection.end();
      return;
    }
    if (isUpdateBanner) {
      cloudantBannerModel.updateBanner(req, res, session, updateBannerCallback, dest);
    } else {
      cloudantBannerModel.createBanner(req, res, session, createBannerCallback, dest);
    }
  } catch (err) {
    logger.error('reading file failed.');
    console.log('createBanner/updateBanner error: '+err);
    // if (constants.ERROR.ENOENT === err.code) {
    //   logger.fatal('no such file or directory. path : ' + file.path);
    // }
    // req.session.errorMsg = constants.MESSAGE.FILE_READ_ERROR;
    try {
      await sessionModel.addErrorMsg(session,constants.MESSAGE.FILE_READ_ERROR);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    try {
      await util.unlink(file.path);
    } catch (e) {
      // DO NOTHING
    }
    if (isUpdateBanner) {
      res.redirect(constants.ROUTE.UPDATE + '?bannerId=' + req.body.bannerId);
    } else {
      res.redirect(constants.ROUTE.REGISTER_BANNER);
    }
    return;
  }
};

/**
 * エラー発生時に再度バナー情報画面をレンダリングする。
 * @param req リクエスト
 * @param res レスポンス
 * @param additionalInfo バナー情報画面に追加で表示するメッセージ情報
 */
const renderError = function(req, res, errMsg, session) {
  const baseInfo = {
    title: constants.TITLE.BANNER_REGISTER
  };
  const info = Object.assign({}, baseInfo, additionalInfo);
  util.renderWithBaseInfo(req, res, constants.ROUTE.REGISTER_BANNER, info, session);
  // util.renderWithBaseInfo(req, res, constants.VIEW.BANNER_FORM, {
  //   error: errMsg
  // }, session);
}

module.exports = router;
