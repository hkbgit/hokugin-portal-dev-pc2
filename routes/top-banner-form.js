const express = require('express');
const router = express.Router();

const cloudantTopBannerModel = require('../postgres_model/top-banner-model');
const cloudantImageModel = require('../postgres_model/image-model');
const cloudantBannerPositionModel = require('../postgres_model/banner-position-model');
const cloudantTopBannerAttributeModel = require('../postgres_model/top-banner-attribute-model');
const csvFileModel = require('../models/csv-file-model');
const cloudantTopBannerDisplayInventoryModel = require('../postgres_model/top-banner-display-inventory-model');
const cloudantAppUserModel =  require('../postgres_model/app-user-model');

const multer  = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const logger = require('../submodules/logger').systemLogger;
const constants = require('../constants');
const util = require('../submodules/util');
const sizeOf = require('image-size');
const sessionModel = require('../postgres_model/session-model');
const sessionManager = require('../submodules/session-manager');
// アップロードファイルをtmpフォルダに格納
const storage = multer.diskStorage({
  destination: async function(req, file ,callback) {
    const tmpImageDir = 'img/tmp/';
    const tmpCsvDir = 'csv/tmp';
    //バナーイメージ項目からのアップロードの場合
    if (file.fieldname === 'image'){
      await util.mkdirIfNotExists(tmpImageDir);
      callback(null, tmpImageDir);
    }
    //csv項目からのアップロードの場合
    else if (file.fieldname === 'csv'){
      await util.mkdirIfNotExists(tmpCsvDir);
      callback(null, tmpCsvDir);
    } else {
      //他の場合は存在しない
      logger.debug('something is wrong : multer upload error');
    }
  },
  filename: function(req, file, callback){
    let extension = path.extname(file.originalname);
    let basename = path.basename(file.originalname, extension);
    callback(null, basename + extension);
  }
});
const upload = multer({storage: storage}).fields([{name:'image'},{name:'csv'}]);

router.get('/', async (req, res, next) => {
  logger.info('received request URL : ' + req.originalUrl);
  const session = global.session;

  let isProcessing = true;
  // let connection = await mysql.createConnection(connectionOptions);
  try {
    // await connection.beginTransaction();
    isProcessing = await cloudantTopBannerModel.hasProccessingRecord();
    // await connection.commit();
  } catch (error) {
    logger.error(error);
    // await connection.rollback();
  } finally {
    // await connection.end();
  }
  if (isProcessing) {
    // 処理中レコードがある場合
    logger.info('processing file detected.');
    // req.session.errorMsg = constants.MESSAGE.CANNOT_REGISTER_OR_UPDATE_TOP_BANNER_WHILE_PROCESSING;
    try {
      await sessionModel.addErrorMsg(session,constants.MESSAGE.CANNOT_REGISTER_OR_UPDATE_TOP_BANNER_WHILE_PROCESSING);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    res.redirect(constants.ROUTE.TOP_BANNERS);
    return;
  }


  try {
    const url = req.originalUrl
    if (url.indexOf('Default') != -1){
      //デフォルトバナー登録画面へ遷移
      const info = {
        title: constants.TITLE.REGISTER_DEFAULT_TOP_BANNER,
        is_default: 1
      }
      logger.debug(info.title);
      cloudantBannerPositionModel.getAllBannerPositions(req, res, session, getAllBannerPositionsCallback, info);
    } else if (url.indexOf('Contract') != -1) {
      //契約者通番紐付バナー登録画面へ遷移
      const info = {
        title: constants.TITLE.REGISTER_CONTRACT_TOP_BANNER,
        is_default: 0
      }
      logger.debug(info.title);
      cloudantBannerPositionModel.getAllBannerPositions(req, res, session, getAllBannerPositionsCallback, info);
    } else {
      res.redirect(constants.ROUTE.TOP_BANNERS);
    }

  } catch(err) {
    let msg = util.getCatchMessage(err);
    util.renderWithBaseInfo(req, res, constants.VIEW.TOP_BANNER_FORM, {title: constants.TITLE.BANNER_REGISTER, error:msg}, session);
  }
});

  /**
  * TOP画面バナー情報の送信時（新規追加・更新）
  */
router.post('/', upload, async function(req, res, next) {
  logger.info('received request URL(method: post) : ' + req.originalUrl);
  const session = global.session;

  //1就是true，0就是false
  const isDefault = (1 === parseInt(req.body.is_default, 10)) ? true : false;
  //req.files.csv存在就是true,不存在就是false
  const isCsvUpdated = req.files.csv ? true: false;
  //csvFile根据isCsvUpdated ,如果isCsvUpdated是true，csvFile就是路径，否则为null
  const csvFile = isCsvUpdated ? req.files.csv[0] : null;
  let isProcessing = true;
  let isErrorOccurred = false;
  // 編集フラグ
  //isEdit表示请求是否包含topBannerId,包含为true，否则为false
  const isEdit = req.body.topBannerId ? true : false;
  let topBannerId = req.body.topBannerId;
  // let connection = await mysql.createConnection(connectionOptions);
  try {
    // await connection.beginTransaction();
    isProcessing = await cloudantTopBannerModel.hasProccessingRecord();
    // await connection.commit();
  } catch (error) {
    logger.error(error);
    isErrorOccurred = true;
    // await connection.rollback();
  } 
  // finally {
    // await connection.end();
  // }
  if (isProcessing) {
    // 処理中レコードがある場合
    logger.info('processing file detected.');
    // req.session.errorMsg = constants.MESSAGE.CANNOT_REGISTER_OR_UPDATE_TOP_BANNER_WHILE_PROCESSING;
    try {
      await sessionModel.sessionAddErrorMsg(req,constants.MESSAGE.CANNOT_REGISTER_OR_UPDATE_TOP_BANNER_WHILE_PROCESSING);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    res.redirect(constants.ROUTE.TOP_BANNERS);
    return;
  }
  // process_start_datetimeをセットする
  // connection = await mysql.createConnection(connectionOptions);
  let newBannerId = null;
  let newTopBannerId = null;
  try {
    // await connection.beginTransaction();
    if (isEdit) {
      let _ = await cloudantTopBannerModel.updateProcessStartDatetime(topBannerId, true);
    } else {
      // 新規登録の場合、レコードを先に作成してprocess_start_datetimeをセットする
      const bannerResult = await cloudantTopBannerModel.createBanner(req, 'dummy', session);
      newBannerId = bannerResult[0].id;
      logger.debug('debuglog25 : ' + newBannerId);
      const topBannerResult = await cloudantTopBannerModel.createTopBanner(isDefault, 0, newBannerId, isDefault ? null: csvFile.filename);
      newTopBannerId = topBannerResult[0].id;
      logger.debug('debuglog26 : ' + newTopBannerId);
    }
    // await connection.commit();
  } catch (err) {
    logger.error(err);
    isErrorOccurred = true;
    // await connection.rollback();
  } 
  // finally {
    // await connection.end();
  // }
  if (!isErrorOccurred) {
    // 非同期の登録/編集処理呼び出し
    await asyncRegisterProcess(req, session, newTopBannerId);
  } else {
    // req.session.errorMsg = constants.ERROR_BEFORE_REGISTERING;//这个异常压根没定义
    try {
      await sessionModel.addErrorMsg(session, constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
  }
  // 非同期処理の結果を待たずにバナー一覧画面に返す
  res.redirect(constants.ROUTE.TOP_BANNERS);
});

/**
 * TOPバナー登録/編集処理(promise化)
 * @param req
 * @param newTopBannerId
 */
const asyncRegisterProcess = async (req, session, newTopBannerId = null) => {
  const isDefault = (1 === parseInt(req.body.is_default, 10)) ? true : false;
  const isImageUpdated = req.files.image ? true : false;
  const imageFile = isImageUpdated ? req.files.image[0] : null;
  const isCsvUpdated = req.files.csv ? true: false;
  const csvFile = isCsvUpdated ? req.files.csv[0] : null;
  // 編集フラグ
  const isEdit = req.body.topBannerId ? true : false;
  let topBannerId = isEdit ? req.body.topBannerId : newTopBannerId;
  let imagePath = null;
  let newContructNumbers = null;
  let isErrorOccurred = false;
  logger.debug('async process start');
  logger.debug('isDefault = ' + isDefault);
  logger.debug('isImageUpdated : ' + isImageUpdated);
  logger.debug('isCsvUpdated : ' + isCsvUpdated);
  // ここから下は非同期で処理する。
  // let connection = await mysql.createConnection(connectionOptions);
  try {
    // transaction開始
    // await connection.beginTransaction();

    // バナー画像をimagesテーブルにinsert(編集時はimage_pathカラムをupdateし、最終更新日時を更新)
    if (isEdit) {
      if (isImageUpdated) {
        //バナーイメージファイル更新の場合画像のimage_pathを更新し、最終更新日時を更新
        const topBannerRows = await cloudantTopBannerModel.getTopBannerInfoSync(topBannerId);

        const originImagePath = topBannerRows.image_path;
        // TOP画面バナー画像が新しくアップロードされた時イメージを更新
        imagePath = await saveImage(imageFile, originImagePath);
      }
      // bannersとtop-bannersテーブル更新
      let _ = await cloudantTopBannerModel.updateTopBanner( req, session, topBannerId, imagePath, csvFile ? csvFile.filename : null);
    } else {
      // 新規登録の場合、画像をDBに登録後、TOPバナーレコードを生成
      imagePath = await saveImage(imageFile);
      // bannersとtop-bannersテーブル更新
      let _ = await cloudantTopBannerModel.updateTopBanner( req, session, topBannerId, imagePath, isDefault ? null: csvFile.filename);
    }

    // アップロードされたcsvファイルから契約者通番を取得
    if (csvFile) {
      newContructNumbers = await csvFileModel.getContractNumbersFromCsv(csvFile);
    }

    // 登録
    if (isEdit && !isDefault && csvFile) {
      // 編集かつ契約者通番紐付けの場合、csvが指定されていれば今あるレコードをdelete
      let _ = await cloudantTopBannerDisplayInventoryModel.deleteByTopBannerId(topBannerId);
    }

    //契約者通番登録編集の時、csvファイルのアップデートがある場合
    if (!isDefault && csvFile) {
      // 新規の契約者通番をマスタに追加
      let _ = await cloudantAppUserModel.insertContractNumbers(newContructNumbers);
      // 新規の契約者通番を契約者通番バナーに紐づける。既存の契約者通番の場合は既に紐づいている為、最終表示日時を空にする
      _ = await cloudantTopBannerDisplayInventoryModel.linkContractNumbersWithTopBanner(newContructNumbers, topBannerId);
      // デフォルトバナーでない場合、新規の契約者通番と既存のデフォルトバナーを紐づける
      //_ = await cloudantTopBannerDisplayInventoryModel.linkNewContractNumberWithDefaultBanners();

    } else if (!isEdit && isDefault) {
      // デフォルトバナーの新規登録の場合、全てのapp_usersを対象としてアップされたバナーと既存ユーザを紐づける
      //let _ = await cloudantTopBannerDisplayInventoryModel.linkBannerWithAllContractNumbers( topBannerId);
    }
    // commit
    // await connection.commit();
  } catch (err) {
    // rollback
    logger.error("error occured: " + err);
    logger.debug(err.stack);
    isErrorOccurred = true;
    // await connection.rollback();
  } finally {
    // 処理開始日時を空にする
    let _ = await cloudantTopBannerModel.updateProcessStartDatetime(topBannerId, false);
    if (isErrorOccurred && !isEdit) {
      // エラー発生時、新規登録の場合は事前に新規追加したバナー、TOPバナー情報を削除する
      let _ = await cloudantTopBannerModel.deleteTopBanner(topBannerId);
    }
    // end
    // await connection.end();
    logger.debug('async process end');
  }
}

/**
 * バリデーションチェックの実行結果をフロントに返す。
 * 本ルーティングはajax通信により行われる為、ビューのレンダーは行わない。
 * 代わりにバリデーションの実行結果をJSONでレスポンスする。
 * バリデーション異常なしの場合は空文字を返す。
 */
router.post('/validate', upload, async function(req, res, next) {
  logger.info('received request URL : ' + req.originalUrl);
  let errorInfo = {};
  let imageErrorInfo = null;
  let csvErrorInfo = null;
  logger.debug('imageFile :' + req.files.image);
  logger.debug('csvFile :' + req.files.csv);
  // バナー画像ファイルアップロードのエラー情報
  if (req.files.image) {
    const imageFile = req.files.image[0];
    imageErrorInfo = checkUploadedImageFile(imageFile,req);
    if (imageErrorInfo) {
      logger.info('validate error: image');
      errorInfo = Object.assign(errorInfo, imageErrorInfo);
    }
  }
  // csvファイルアップロードのエラー情報
  if (req.files.csv) {
    const csvFile = req.files.csv[0];
    csvErrorInfo = await checkUploadedCsvFile(csvFile);
    if (csvErrorInfo) {
      logger.info('validate error: csv');
      errorInfo = Object.assign(errorInfo, csvErrorInfo);
    }
  }

  const inputErrorInfo = validateInputValue(req);
  if (inputErrorInfo) {
    logger.info('validate error: input');
    // ファイルアップロードのエラー情報とその他フォームのエラー情報をマージする
    errorInfo = Object.assign(errorInfo, inputErrorInfo);
  }
  if (req.files.image) {
    // ファイル添付がされている場合、ディレクトリに保存された添付ファイルを削除する。
    const imageFile = req.files.image[0];
    fs.unlink(imageFile.path, async(err) => {
      if (err) {
        logger.error('deleting attached imagefile failed.');
        logger.fatal('attached file('+ imageFile.path +') has been no longer used. please delete it manually');
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
        logger.info('deleting attached imagefile success');
      }
    });
  }
  if (req.files.csv) {
    // ファイル添付がされている場合、ディレクトリに保存された添付ファイルを削除する。
    const csvFile = req.files.csv[0];
    fs.unlink(csvFile.path, async(err) => {
      if (err) {
        logger.error('deleting attached csvfile failed.');
        logger.fatal('attached file('+ csvFile.path +') has been no longer used. please delete it manually');
        // req.session.errorMsg = constants.MESSAGE.CSVFILE_REMOVE_ERROR;
        try {
          await sessionModel.sessionAddErrorMsg(req,constants.MESSAGE.CSVFILE_REMOVE_ERROR);
        } catch (error) {
          logger.error('save session errorMsg error: '+error);
          sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
          msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
          res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
          return;
        }
      } else {
        logger.info('deleting attached csvfile success');
      }
    });
  }
  if (Object.keys(errorInfo).length > 0) {
    // errorInfoが何らかのキーを持つ場合、エラーとする
    // レスポンスにエラー情報をセット
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
const getAllBannerPositionsCallback = async(err, req, res, session, rows, info) => {
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
    info.error = constants.MESSAGE.FAILED_TO_LOAD_BANNER_POSITIONS;
    renderError(req, res, info, session);
    return;
  }
  const bannerInfo = {
    title: info.title,
    is_default: info.is_default,
    bannerPostions: rows
  }
  // if (req.session.errorMsg) {
  //   info.error = req.session.errorMsg;
  //   req.session.errorMsg = null;
  // }
  try {
    // let body = await sessionModel.getSession(req);
    if(session[0] && session[0].errorMsg && session[0].errorMsg !== null){
      info.error = session[0].errorMsg;
      // req.session.errorMsg = null;
      await sessionModel.updateSession(session[0],req);
    }
  } catch (error) {
    logger.error('updateSession for delete errorMsg error : \n' + error);
    sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
    msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
    res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
    return;
  }
  logger.debug(bannerInfo);
  logger.debug('getAllBannerPositions is success');
  //util.renderWithBaseInfo(req, res, constants.VIEW.TOP_BANNER_FORM, info);
  cloudantTopBannerAttributeModel.getAllTopBannerAttributes(req, res, session, getAllTopBannerAttributesCallback, bannerInfo)
};

/**
 * TOP画面バナー属性情報取得のselect文実行後のコールバック
 * @param err エラー情報
 * @param req リクエスト
 * @param res レスポンス
 * @param rows select文実行結果
 * @param bannerInfo バナー情報保持オブジェクト
 */
const getAllTopBannerAttributesCallback = async(err, req, res, session, rows, bannerInfo) => {
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
    bannerInfo.error = constants.MESSAGE.FAILED_TO_LOAD_BANNER_POSITIONS;
    renderError(req, res, bannerInfo, session);
    return;
  }
  const info = {
    title: bannerInfo.title,
    is_default: bannerInfo.is_default,
    bannerPostions: bannerInfo.bannerPostions,
    topBannerAttributes: rows
  }
  // if (req.session.errorMsg) {
  //   info.error = req.session.errorMsg;
  //   req.session.errorMsg = null;
  // }
  try {
    // session = await sessionModel.getSession(req);
    if(session[0] && session[0].errorMsg && session[0].errorMsg !==null){
      info.error = session[0].errorMsg;
      // req.session.errorMsg = null;
      await sessionModel.updateSession(session[0],req);
    }
  } catch (error) {
    logger.error('getAllBannersCallback getSession/updateSession error : \n' + error);
    sessionManager.destroy(req);
    //将session从数据库中删除
    msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
    res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
    return;
  }
  logger.debug(info);
  logger.debug('getAllTopBannerAttributes is success');
  util.renderWithBaseInfo(req, res, constants.VIEW.TOP_BANNER_FORM, info, session);
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
  formValues.is_default = req.body.is_default ? req.body.is_default : EMPTY_VALUE;
  formValues.bannerPositionId = req.body.bannerPosition ? req.body.bannerPosition : EMPTY_VALUE;
  formValues.topBannerAttributeId = req.body.topBannerAttribute ? req.body.topBannerAttribute : EMPTY_VALUE;
  formValues.imageName = req.body.imageName ? req.body.imageName : EMPTY_VALUE;
  formValues.link = req.body.link ? req.body.link : EMPTY_VALUE;
  formValues.csvName = req.body.csvName ? req.body.csvName : EMPTY_VALUE;
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

  if ('' === formValues.topBannerAttributeId) {
    // TOP画面バナー属性未選択エラー
    logger.debug("topBannerAttribute is not selected");
    errorInfo.topBannerAttribute = {
      msg: constants.MESSAGE.TOP_BANNER_ATTRIBUTE_MUST
    };
    hasInvalidValue = true;
  }

  if ('' === formValues.imageName) {
    // イメージファイル名未入力時エラー
    logger.debug('imageFileName is empty');
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

  if (formValues.is_default === '0') {
    if ('' === formValues.csvName) {
      // csvファイル名未入力時エラー
      logger.debug('csvFileName is empty');
      errorInfo.csv = {
        msg: constants.MESSAGE.FILE_NAME_IS_EMPTY
      };
      hasInvalidValue = true;
    }
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
 * アップロードされたバナー画像ファイルの内容を確認する。
 * 拡張子及び画像ファイルの縦横比が許容された値ではない場合はエラー情報を連想配列にして
 * 返す。異常なしの場合はnullを返す。
 * @param file フォームでアップロードされたバナー画像ファイル情報
 * @return null: ファイル内容問題なし
 *         ファイル内容異常の場合はエラー情報を連想配列で返す
 */
const checkUploadedImageFile = function(file,req) {
  const errorInfo = {};
  let isInvalidFile = false;
  const token = file.originalname.split('.');
  const originExt = token[token.length - 1].toLowerCase();
  let isAcceptedExt = false;
  logger.debug('checkUploadedImageFile() called');
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
  if (!isInvalidFile) {
    // 高さ・幅のサイズ確認
    try {
      const dimensions = sizeOf(file.path);
      const width = dimensions.width;
      const height = dimensions.height;
      let isAcceptedDimentions = false;
      if ((width === constants.FILE_DIMENSION_TOP_BANNER_LIST[0].WIDTH &&height === constants.FILE_DIMENSION_TOP_BANNER_LIST[0].HEIGHT&&req.body.topBannerAttribute === '1')||
         (width === constants.FILE_DIMENSION_TOP_BANNER_LIST[1].WIDTH && height === constants.FILE_DIMENSION_TOP_BANNER_LIST[1].HEIGHT&&req.body.topBannerAttribute === '2')
        ) {
          isAcceptedDimentions = true;
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
    if(req.body.topBannerAttribute === '1'){
      if (constants.XG_MAX_FILE_SIZE < file.size) {
        logger.debug('file size is too large. file size : ' + file.size + ' bytes');
        errorInfo.image = {
          msg: constants.MESSAGE.IMAGE_FILE_SIZE_TOO_LARGE
        }
        isInvalidFile = true;
      }
    }else if(req.body.topBannerAttribute === '2'){
      if (constants.FB_MAX_FILE_SIZE < file.size) {
        logger.debug('file size is too large. file size : ' + file.size + ' bytes');
        errorInfo.image = {
          msg: constants.MESSAGE.IMAGE_FILE_SIZE_TOO_LARGE
        }
        isInvalidFile = true;
      }
    }


   
  }
  return isInvalidFile ? errorInfo : null;
}

/**
 * 画像データを格納する。
 * 画像データは1970年1月1日からの経過ミリ秒をファイル名として登録する。
 * 画像データの格納後はバナー情報をDBへ登録する。
 */
const saveImage = async function( imageFile, updateTargetImagePath = null) {
  const now = new Date().getTime();
  const name = crypto.createHash('sha256').update(String(now)).digest('hex');
  const token = imageFile.originalname.split('.');
  const ext = token[token.length - 1];
  const fileName = name + '.' + ext;
  const dest = constants.BANNER_ROOT_PATH + '/' + fileName;

  logger.debug('saveImage() called');
  logger.debug('image path: ' + imageFile.path);
  // ファイルのバイナリデータ取得
  try {
    let data = null;
    try {
      data = await util.readFile(imageFile.path);
      const buffer = Buffer.from(data, 'binary');
      data = buffer.toString('base64')
    } catch (error) {
      logger.error('reading imageFile failed.');
      throw error;
    }
    try {
      // tmpファイル削除
      await util.unlink(imageFile.path);
    } catch (error) {
      // tmpファイル削除失敗
      logger.error('deleting attached imageFile failed.');
      logger.fatal('attached imageFile('+ imageFile.path +') has been no longer used. please delete it  manually');
      throw error;
    }
    if (updateTargetImagePath) {
      // バナー更新の場合（編集時）
      let _ = await cloudantImageModel.updateImageDataSync(dest, data, updateTargetImagePath);
    } else {
      // バナー新規追加の場合
      let _ = await cloudantImageModel.insertImageDataSync( dest, data);
    }
  } catch (error) {
    if (constants.ERROR.ENOENT === error.code) {
      logger.fatal('no such imageFile or directory. path : ' + imageFile.path);
    }
    try {
      util.unlink(imageFile.path);
    } catch (e) {
      // DO NOTHING
    }
    throw error;
  }
  return dest;
};

/**
 * アップロードされた契約者通番csvファイルの内容を確認する。
 * 契約者通番csvファイルの最初の一列を読み込む
 * 契約者通番の条件：1~24 半角英数
 * 異常なしの場合はnullを返す。
 * @param file フォームでアップロードされた契約者通番csvファイル情報
 * @return null: ファイル内容問題なし
 *         ファイル内容異常の場合はエラー情報を連想配列で返す
 */
const checkUploadedCsvFile = async function(file) {
  const PATTERN_CONTRACT_NO = /^(\d{1,24})$/;
  const errorInfo = {};
  let isInvalidFile = false;
  const token = file.originalname.split('.');
  const originExt = token[token.length - 1].toLowerCase();
  let isAcceptedExt = false;
  logger.debug('checkUploadedCsvFile() called');
  // 拡張子確認
  for (const ext of constants.CSVFILE_EXT_LIST) {
    if (originExt === ext) {
      isAcceptedExt = true;
      break;
    }
  }
  if (!isAcceptedExt) {
    // システムで定義された拡張子ではない場合
    logger.debug('file ext is not allowed. ext : ' + originExt);
    errorInfo.csv = {
      msg: constants.MESSAGE.CSVFILE_WRONG_EXT
    }
    isInvalidFile = true;
  }
  // csvファイル中身の契約者通番形式が正しいのか検査
  if (!isInvalidFile) {
    try {
      // csvを1列だけ値をとるようになっているか確認（他の列は無視する）
      // sjisだが、半角英数のみであればutf8として読み込める。sjisで読む必要がない限りこれで問題ない
      const data = await util.readFile(file.path, {encoding: 'utf8'});
      // 改行区切りで配列にし、ヘッダ行を削除
      const rows = data.split('\r\n');
      rows.shift();
      const contractNumbers = [];
      // 現在の行数 ヘッダ行をすでに省いているので1からスタート
      let rowNumber = 1;
      for (const row of rows) {
        rowNumber++;
        const values = row.split(',');
        let contractNumber = null;
        if (!values) {
          // csv形式では無い場合、行をそのまま挿入する
          contractNumber = row;
        } else {
          // csv形式の場合、1つ目の要素を契約者通番として取得する
          contractNumber = values[0];
        }
        // 契約者通番の形式チェック
        if (contractNumber.match(PATTERN_CONTRACT_NO)) {
          // 形式に一致する場合だけ契約者通番として読み取る
          contractNumbers.push(contractNumber);
        } else if(!contractNumber.match(PATTERN_CONTRACT_NO) && contractNumber) {
          // 形式に一致しない契約者通番かつ、空白文字でない契約者通番が1件でもある場合はエラーとする
          isInvalidFile = true;
          break;
        }
      }
      if (isInvalidFile) {
        const err = new Error('csv contains at least 1 invalid contract number');
        err.rowNumber = rowNumber;
        throw err;
      }
      if (0 === contractNumbers.length) {
        // 読み取った契約者通番が0件の場合
        isInvalidFile = true;
        throw new Error('contract number count from csvFile is 0');
      }
    } catch (e) {
      logger.debug('Exception occurred :\n' + e);
      let msg = constants.MESSAGE.FAILED_TO_REGISTER_CSV;
      if (e.rowNumber) {
        msg += ' ' + e.rowNumber + constants.MESSAGE.CSV_CONTAINS_INVALID_CONTRACT_NO;
      }
      errorInfo.csv = {
        msg: msg
      }
      isInvalidFile = true;
    }
  }
  return isInvalidFile ? errorInfo : null;
}

/**
 * エラー発生時に再度TOP画面登録/編集へリダイレクトする。
 */
const renderError = function(req, res, info, session) {
  info.bannerPostions = [];
  info.topBannerAttributes = [];
  if (req.body.topBannerId) {
    // res.redirect(constants.ROUTE.UPDATE_TOP_BANNER + '?topBannerId=' + req.body.topBannerId);
    util.renderWithBaseInfo(req, res, constants.VIEW.TOP_BANNER_FORM, info, session);
  } else {
    util.renderWithBaseInfo(req, res, constants.VIEW.TOP_BANNER_FORM, info, session);
    // res.redirect(constants.ROUTE.REGISTER_TOP_BANNER);
  }
}

module.exports = router;
