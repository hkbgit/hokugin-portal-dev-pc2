const express = require('express');
const router = express.Router();
const cloudantExtendModel = require('../postgres_model/extend-model');
const cloudantImageModel = require('../postgres_model/image-model');
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
const path = require('path');
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

router.get('/', async(req, res, next) => {
  logger.info('received request URL : ' + req.originalUrl);
  const session = global.session;

  cloudantExtendModel.getAllExtends(req, res, session, getAllExtendsCallback);
});

/**
 * バナー情報の送信時（新規追加・更新）
 */
router.post('/', upload, async function(req, res, next) {
  logger.info('received request URL : ' + req.originalUrl);
  const session = global.session;
  // console.log("表单追加");
  if (req.body.extendId) {
    // バナーIDが取得できた場合はバナー更新処理
    if (req.files.image || req.files.csv ) {
      await saveImage(req, res, session, req.files.image, true);
    } else {
      // バナー画像は更新しない場合
      cloudantExtendModel.updateExtend(req, res, session, updateExtendCallback);
    }
  } else {
    // バナー新規追加処理
    if (!req.files.image) {
      logger.error('file has not been attached');
      next();
      return;
    }
    await saveImage(req, res, session, req.files.image);
  }

});

/**
 * バリデーションチェックの実行結果をフロントに返す。  
 * 本ルーティングはajax通信により行われる為、ビューのレンダーは行わない。
 * 代わりにバリデーションの実行結果をJSONでレスポンスする。
 * バリデーション異常なしの場合は空文字を返す。
 */
router.post('/validate', upload,async(req, res, next) =>{
  
 console.log("表单校验...");
 let errorInfo = {};
 let imageErrorInfo = null;
 logger.debug('imageFile :' + req.files.image);
 logger.debug('csvFile :' + req.files.csv);
 // バナー画像ファイルアップロードのエラー情報   list 
 if (req.files.image) {
   const imageFile = req.files.image[0];
   imageErrorInfo = checkUploadedFile(imageFile,req);
   if (imageErrorInfo) {
     logger.info('validate error: image');
     errorInfo = Object.assign(errorInfo, imageErrorInfo);
   }
 }
  // info
  if (req.files.csv) {
    const csvFile = req.files.csv[0];
    csvErrorInfo = await checkUploadedFile2(csvFile);
    if (csvErrorInfo) {
      logger.info('validate error: csv');
      errorInfo = Object.assign(errorInfo, csvErrorInfo);
    }
  }

  const inputErrorInfo = validateInputValue(req);
  if (errorInfo && inputErrorInfo) {
    // ファイルアップロードのエラー情報とその他フォームのエラー情報をマージする
    errorInfo = Object.assign(errorInfo, inputErrorInfo);
  } else if (!errorInfo && inputErrorInfo) {
    errorInfo = inputErrorInfo;
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
const getAllExtendsCallback = async (err, req, res, session, rows)=> {
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
  logger.debug(' is success');
  const info = {
    title: constants.TITLE.EXTEND_FORM,
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
      logger.error('getAllExtendsCallback updateSession for delete errorMsg error : \n' + error);
      sessionManager.destroy(req);
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
  // }
  util.renderWithBaseInfo(req, res, constants.VIEW.EXTEND_FORM, info, session);
};

/**
 * バナー新規追加のinsert文実行後のコールバック
 * @param err エラー情報
 * @param req リクエスト
 * @param res レスポンス
 * @param result insert文実行結果
 */
const createExtendCallback = async(err, req, res, result) => {
  if (err) {
    let msg = constants.MESSAGE.FAILED_TO_REGISTER_EXTEND;
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
      await sessionModel.sessionAddErrorMsg(req,constants.MESSAGE.FAILED_TO_REGISTER_EXTEND);
      res.redirect(constants.ROUTE.EXTEND_REGISTER);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    return;
  }
  logger.debug('createExtend is success');
  logger.debug('query result :\n' + JSON.stringify(result));
  res.redirect(constants.ROUTE.EXTEND);
  return;
};

/**
 * バナー情報更新のupdate文実行後のコールバック
 * @param err エラー情報
 * @param req リクエスト
 * @param res レスポンス
 * @param result update文実行結果
 */
const updateExtendCallback = async(err, req, res, session, result) => {
  if (err) {
    // クエリ実行失敗時
    logger.error('failed to query');
    logger.error('error message : \n' + err);
    // req.session.errorMsg = constants.MESSAGE.FAILED_TO_UPDATE_BANNER;
    try {
      await sessionModel.addErrorMsg(session,constants.MESSAGE.FAILED_TO_UPDATE_EXTEND);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    res.redirect(constants.ROUTE.EXTEND_UPDATE + '?extendId=' + req.body.extendId);
    return;
  }
  if (1 !== result) {
    // affectedRowsが1以外の場合は更新なし（該当レコードなし）なので失敗扱いにする。
    logger.error('affectedRows not equals 1. failed to update banner info');
    // req.session.errorMsg = constants.MESSAGE.FAILED_TO_UPDATE_BANNER;
    try {
      await sessionModel.addErrorMsg(session,constants.MESSAGE.FAILED_TO_UPDATE_EXTEND);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    res.redirect(constants.ROUTE.EXTEND);
    return;
  }
  logger.debug('updateBanner is success')
  logger.debug('query result :\n' + JSON.stringify(result));
  res.redirect(constants.ROUTE.EXTEND);
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
  // formValues.bannerPositionId = req.body.bannerPosition ? req.body.bannerPosition : EMPTY_VALUE;
  formValues.imageName = req.body.imageName ? req.body.imageName : EMPTY_VALUE;
  formValues.imageNames = req.body.imageNames ? req.body.imageNames : EMPTY_VALUE;
  formValues.publishDateTimeStart = req.body.publish_datetime_start ? req.body.publish_datetime_start : EMPTY_VALUE;
  formValues.publishDateTimeEnd = req.body.publish_datetime_end ? req.body.publish_datetime_end : EMPTY_VALUE;
  formValues.priority = req.body.priority ? req.body.priority : EMPTY_VALUE;
  formValues.comment = req.body.comment ? req.body.comment : EMPTY_VALUE;
  formValues.catalogTitle = req.body.catalogTitle ? req.body.catalogTitle : EMPTY_VALUE;
  formValues.catalogLink = req.body.catalogLink ? req.body.catalogLink : EMPTY_VALUE;
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

  if ('' === formValues.imageName) {
    // ファイル名未入力時エラー
    logger.debug('fileName is empty');
    errorInfo.image = {
      msg: constants.MESSAGE.FILE_NAME_IS_EMPTY
    };
    hasInvalidValue = true;
  }
  if ('' === formValues.imageNames) {
    // ファイル名未入力時エラー
    logger.debug('fileName is empty');
    errorInfo.images = {
      msg: constants.MESSAGE.FILE_NAME_IS_EMPTY
    };
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

  if (constants.MAX_LENGTH_TITLE < formValues.catalogTitle.length) {
    // タイトル文字列長エラー
    logger.debug("catalogTitle length is out of range");
    errorInfo.catalogTitle = {
      msg: constants.MESSAGE.TITLE_LENGTH
    };
    hasInvalidValue = true;
  }
  if (constants.MAX_LENGTH_LINK < formValues.catalogLink.length) {
    // リンク先文字列長エラー
    logger.debug("catalogLink length is out of range");
    errorInfo.catalogLink = {
      msg: constants.MESSAGE.LINK_LENGTH
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
    // for (const token of constants.FILE_DIMENSIONS_LIST) {
      if (width <= constants.FILE_DIMENSIONS_LIST[0].WIDTH ) {
          isAcceptedDimentions = true;
        }
    // }
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
  if (constants.LML_FILE_SIZE < file.size) {
    logger.debug('file size is too large. file size : ' + file.size + ' bytes');
    errorInfo.image = {
      msg: constants.MESSAGE.IMAGE_FILE_SIZE_TOO_LARGE
    }
    isInvalidFile = true;
  }
  return isInvalidFile ? errorInfo : null;
}
const checkUploadedFile2 = function(file) {
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
    errorInfo.images = {
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
    // for (const token of constants.FILE_DIMENSIONS_LIST) {
      if (width <= constants.FILE_DIMENSIONS_LIST[3].WIDTH &&
        height <= constants.FILE_DIMENSIONS_LIST[3].HEIGHT) {
          isAcceptedDimentions = true;
        }
      // if (width <= constants.FILE_DIMENSIONS_LIST[0].WIDTH ) {
      //   isAcceptedDimentions = true;
      // }
    // }
    if (!isAcceptedDimentions) {
      logger.debug('width or height are not allowed. width : ' + width + ', height : ' + height);
      errorInfo.images = {
        msg: constants.MESSAGE.IMAGE_WRONG_DIMENSION_SIZE
      }
      isInvalidFile = true;
    }
  } catch (e) {
    logger.debug('Exception occurred :\n' + e);
    errorInfo.images = {
      msg: constants.MESSAGE.IMAGE_TYPE_ERROR
    }
    isInvalidFile = true;
  }
  // 画像サイズ確認
  if (constants.LSL_FILE_SIZE < file.size) {
    logger.debug('file size is too large. file size : ' + file.size + ' bytes');
    errorInfo.images = {
      msg: constants.MESSAGE.IMAGE_FILE_SIZE_TOO_LARGE
    }
    isInvalidFile = true;
  }
  return isInvalidFile ? errorInfo : null;
}


const checkUploadedFile3 = function(file) {
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
    errorInfo.imagezj = {
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
    // for (const token of constants.FILE_DIMENSIONS_LIST) {
      if (width === constants.FILE_DIMENSIONS_LIST[2].WIDTH &&
        height === constants.FILE_DIMENSIONS_LIST[2].HEIGHT) {
          isAcceptedDimentions = true;
        }
    // }
    if (!isAcceptedDimentions) {
      logger.debug('width or height are not allowed. width : ' + width + ', height : ' + height);
      errorInfo.imagezj = {
        msg: constants.MESSAGE.IMAGE_WRONG_DIMENSION_SIZE
      }
      isInvalidFile = true;
    }
  } catch (e) {
    logger.debug('Exception occurred :\n' + e);
    errorInfo.imagezj = {
      msg: constants.MESSAGE.IMAGE_TYPE_ERROR
    }
    isInvalidFile = true;
  }
  // 画像サイズ確認
  if (constants.MAX_FILE_SIZE < file.size) {
    logger.debug('file size is too large. file size : ' + file.size + ' bytes');
    errorInfo.imagezj = {
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
  var now = "";
  var name = "";
  var token="";
  var ext = "";
  var fileName = "";
  var dest = "";
  if(req.files.image){
    now = new Date().getTime();
    name = crypto.createHash('sha256').update(String(now)).digest('hex');
    token = req.files.image[0].originalname.split('.');
    ext = token[token.length - 1];
    fileName = name + '.' + ext;
    dest = constants.BANNER_ROOT_PATH + '/' + fileName;
  }
  var now1="";
  var name1="";
  var token1="";
  var ext1="";
  var fileName1="";
  var dest1="";
  if(req.files.csv){
    now1 = new Date().getTime()+1;
    name1 = crypto.createHash('sha256').update(String(now1)).digest('hex');
    token1 = req.files.csv[0].originalname.split('.');
    ext1 = token1[token1.length - 1];
    fileName1 = name1 + '.' + ext1;
    dest1 = constants.BANNER_ROOT_PATH + '/' + fileName1;
  }



  logger.debug('saveImage() called');
  // ファイルのバイナリデータ取得
  try {
    var data="";
    var data1="";
    if(req.files.image){
      data = await util.readFile(req.files.image[0].path);
      const buffer = Buffer.from(data, 'binary');
      data = buffer.toString('base64')
    }
    if(req.files.csv){
      data1 = await util.readFile(req.files.csv[0].path);
      const buffer = Buffer.from(data1, 'binary');
      data1 = buffer.toString('base64')
    }
    try {
      if(req.files.image){
        await util.unlink(req.files.image[0].path);
      }
      if(req.files.csv){
      await util.unlink(req.files.csv[0].path);
      }
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
        res.redirect(constants.ROUTE.EXTEND_UPDATE + '?extendId=' + req.body.extendId);
      } else {
        res.redirect(constants.ROUTE.EXTEND_REGISTER);
      }
      return;
    }
    // 画像挿入/更新クエリ実行
    try {
      if (isUpdateBanner) {
        // 既存のimageレコードを更新する
        let bannerInfo = await cloudantExtendModel.getExtendInfoSync(req.body.extendId);
        if (bannerInfo.length !== 1) {
          throw Error('faild to get extendInfo');
        }
        let originImagePath = bannerInfo[0].image_path;
        let originImagePath1 = bannerInfo[0].image_path1;
        logger.debug('originImagePath => ' + originImagePath);
        let result = await cloudantImageModel.updateImageDataSync2(req, dest, data, originImagePath,dest1, data1, originImagePath1);
        logger.debug('updateImage success');
        logger.debug('query result :\n' + JSON.stringify(result));
      } else {
        //,dest2s, data2s
        let result = await cloudantImageModel.insertImageDataSync2(req,dest, data,dest1, data1);
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
          await sessionModel.addErrorMsg(session,constants.MESSAGE.FAILED_TO_UPDATE_EXTEND);
          res.redirect(constants.ROUTE.EXTEND_UPDATE + '?extendId=' + req.body.extendId);
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
          await sessionModel.addErrorMsg(session,constants.MESSAGE.FAILED_TO_REGISTER_EXTEND);
          res.redirect(constants.ROUTE.EXTEND_REGISTER);
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
      //,dest2s
      cloudantExtendModel.updateExtend(req, res, session, updateExtendCallback, dest,dest1);
    } else {
      //,dest2s 
      cloudantExtendModel.createExtend(req, res, session, createExtendCallback, dest,dest1);
 
    }
  } catch (err) {
    logger.error('reading file failed.');
    console.log('createExtend/updateExtend error: '+err);
    try {
      await sessionModel.addErrorMsg(session,constants.MESSAGE.FILE_READ_ERROR);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);
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
      res.redirect(constants.ROUTE.EXTEND_UPDATE + '?extendId=' + req.body.extendId);
    } else {
      res.redirect(constants.ROUTE.EXTEND_REGISTER);
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


/**
 * 2021/02/17
 */

router.get('/discussAdd', async(req, res, next) => {
  logger.info('received request URL : ' + req.originalUrl);
  const session = global.session;
  cloudantExtendModel.getAllExtends(req, res, session, getAllExtends2Callback);
});

/**
 * バナー配置場所取得のselect文実行後のコールバック
 * @param err エラー情報
 * @param req リクエスト
 * @param res レスポンス
 * @param rows select文実行結果
 */
const getAllExtends2Callback = async (err, req, res, session, rows)=> {
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


  logger.debug(' is success');
  const info = {
    title: constants.TITLE.EXTEND_FORM2,
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
      logger.error('getAllExtendsCallback updateSession for delete errorMsg error : \n' + error);
      sessionManager.destroy(req);
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
  // }
  // console.log("=======> : "+ JSON.stringify(info));
  util.renderWithBaseInfo(req, res, constants.VIEW.EXTEND_FORM2, info, session);
};


router.post('/validate/discussAdd', upload,async(req, res, next) =>{
  
  // console.log("表单校验22222...");
  let errorInfo = {};
  let imageErrorInfo = null;
  // logger.debug('imageFile :' + req.files.image);
  // // バナー画像ファイルアップロードのエラー情報   list 
  // if (req.files.image) {
  //   const imageFile = req.files.image[0];
  //   imageErrorInfo = checkUploadedFile4(imageFile,req);
  //   if (imageErrorInfo) {
  //     logger.info('validate error: image');
  //     errorInfo = Object.assign(errorInfo, imageErrorInfo);
  //   }
  // }
   const inputErrorInfo = validateInputValue2(req);
   if (errorInfo && inputErrorInfo) {
     // ファイルアップロードのエラー情報とその他フォームのエラー情報をマージする
     errorInfo = Object.assign(errorInfo, inputErrorInfo);
   } else if (!errorInfo && inputErrorInfo) {
     errorInfo = inputErrorInfo;
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
   if (Object.keys(errorInfo).length > 0) {
     // errorInfoが何らかのキーを持つ場合、エラーとする
     // レスポンスにエラー情報をセット
     res.json(errorInfo);
   } else {
     // 入力値異常なし
     res.json('');
   }
 
 
  
 });

 const checkUploadedFile4 = function(file) {
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
    // for (const token of constants.FILE_DIMENSIONS_LIST) {
      if (width <= constants.FILE_DIMENSIONS_LIST[5].WIDTH ) {
          isAcceptedDimentions = true;
        }
    // }
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
  if (constants.LXX_FILE_SIZE < file.size) {
    logger.debug('file size is too large. file size : ' + file.size + ' bytes');
    errorInfo.image = {
      msg: constants.MESSAGE.IMAGE_FILE_SIZE_TOO_LARGE
    }
    isInvalidFile = true;
  }
  return isInvalidFile ? errorInfo : null;
}

const validateInputValue2 = function(req) {
  const PATTERN_DATETIME = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/;
  const formValues = {};
  const EMPTY_VALUE = '';
  //_id
  formValues.bannerPosition = req.body.bannerPosition ? req.body.bannerPosition : EMPTY_VALUE;
  formValues.smalTitle = req.body.smalTitle ? req.body.smalTitle : EMPTY_VALUE;
  formValues.priority = req.body.priority ? req.body.priority : EMPTY_VALUE;
  let hasInvalidValue = false;
  const errorInfo = {};

  logger.debug('validateInputValue() called');
  if (formValues.bannerPosition.length <= 0 || constants.MAX_LENGTH_TITLE < formValues.bannerPosition.length) {
    // タイトル文字列長エラー
    logger.debug("title length is out of range");
    errorInfo.bannerPosition = {
      msg: constants.MESSAGE.TITLE_LENGTH
    };
    hasInvalidValue = true;
  }

  if ('' === formValues.smalTitle ) {
    logger.debug("smalTitle is invalid format");
    errorInfo.smalTitle = {
      msg: constants.MESSAGE.TITLE_NULL
    }
    hasInvalidValue = true;
  }
  if ('' === formValues.priority ) {
    logger.debug("priority is invalid format");
    errorInfo.Priority = {
      msg: constants.MESSAGE.TITLE_NULL
    }
    hasInvalidValue = true;
  }

  return hasInvalidValue ? errorInfo : null;
};

router.post('/discussAdd', upload, async function(req, res, next) {

  // console.log("=================> discussAdd");
  logger.info('received request URL : ' + req.originalUrl);
  const session = global.session;

  try{
    var count = 0
    if (req.body.detailId) {
      var details = await cloudantExtendModel.getDetailsById(req.body.detailId);
      if (details.length != 1) {
        res.redirect(constants.ROUTE.EXTEND2);
      }
      var oldImages = util.getContentImagePath(details[0].content)
      var newImages = util.getContentImagePath(req.body.content)
      // バナーIDが取得できた場合はバナー更新処理
      count = await cloudantExtendModel.updateDetail(req, session);
      for (var i = 0; i < oldImages.length; i++) {
        var oldPath = oldImages[i]
        var exitsFlag = false;
        for (var j = 0; j < newImages.length; j++) {
          var newPath = newImages[j];
          if (oldPath == newPath) {
            exitsFlag = true;
          }
        }
        if (!exitsFlag) {
          let _ = await cloudantImageModel.deleteImageData(oldPath);
        }
      }
    } else {
      count = await cloudantExtendModel.createDetailItem(req, session);
    }
    res.redirect(constants.ROUTE.EXTEND2);
  } catch(err) {
    let msg = util.getCatchMessage(err);
    util.renderWithBaseInfo(req, res, constants.VIEW.EXTEND2, {title: constants.TITLE.EXTEND2, error:msg}, session);
  }
});

router.post('/localImage', upload, async function(req, res, next) {

  // console.log("=================> localImage");
  logger.info('received request URL : ' + req.originalUrl);

  var error = 0;
  var errorMsg = "";
  
  const session = global.session;
  const file = req.files.image
  var now="";
  var name="";
  var token="";
  var ext="";
  var fileName="";
  var dest="";
  if(req.files.image){
    now = new Date().getTime();
    name = crypto.createHash('sha256').update(String(now)).digest('hex');
    token = req.files.image[0].originalname.split('.');
    ext = token[token.length - 1];
    fileName = name + '.' + ext;
    dest = constants.BANNER_ROOT_PATH + '/' + fileName;
  }

  logger.debug('saveImage() called');
  // ファイルのバイナリデータ取得
  try {
    var data="";
    if(req.files.image){
       data = await util.readFile(req.files.image[0].path);
       const buffer = Buffer.from(data, 'binary');
       data = buffer.toString('base64')
    }
  
    try {
      if(req.files.image){
      await util.unlink(req.files.image[0].path);
      }
    } catch (err) {
      error = 1;
      errorMsg="ファイルアップロード失敗";
    }
    // 画像挿入/更新クエリ実行
    try {
        await cloudantImageModel.insertImageDataSync3(dest, data);
    } catch (err) {
      error = 1;
      errorMsg="ファイルアップロード失敗";
    }
   
  } catch (err) {
    error = 1;
    errorMsg="ファイルアップロード失敗";
    try {
      await util.unlink(file.path);
    } catch (e) {
    }
  }
  var info = {
    "error": error,
    "message":errorMsg,
    "url": dest
  };
  res.send(info);
});



const saveImage2 = async function(req, res, session, file, isUpdateBanner = false) {
  var now="";
  var name="";
  var token="";
  var ext="";
  var fileName="";
  var dest="";
  if(req.files.image){
    now = new Date().getTime();
    name = crypto.createHash('sha256').update(String(now)).digest('hex');
    token = req.files.image[0].originalname.split('.');
    ext = token[token.length - 1];
    fileName = name + '.' + ext;
    dest = constants.BANNER_ROOT_PATH + '/' + fileName;
  }

  logger.debug('saveImage() called');
  // ファイルのバイナリデータ取得
  try {
    var data="";
    if(req.files.image){
       data = await util.readFile(req.files.image[0].path);
       const buffer = Buffer.from(data, 'binary');
       data = buffer.toString('base64')
    }
  
    try {
      if(req.files.image){
      await util.unlink(req.files.image[0].path);
      }
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
        res.redirect(constants.ROUTE.EXTEND_UPDATE + '?extendId=' + req.body.extendId);
      } else {
        res.redirect(constants.ROUTE.EXTEND_REGISTER);
      }
      return;
    }
    // 画像挿入/更新クエリ実行
    try {
      if (isUpdateBanner) {
        // 既存のimageレコードを更新する
        let bannerInfo = await cloudantExtendModel.getExtendInfoSync(req.body.extendId);
        if (bannerInfo.length !== 1) {
          throw Error('faild to get extendInfo');
        }
        let originImagePath = bannerInfo[0].image_path;
        logger.debug('originImagePath => ' + originImagePath);
        let result = await cloudantImageModel.updateImageDataSync3( dest, data, originImagePath);
        logger.debug('updateImage success');
        logger.debug('query result :\n' + JSON.stringify(result));
      } else {
        //,dest2s, data2s
        if(req.files.image){
        let result = await cloudantImageModel.insertImageDataSync3(dest, data);
        logger.debug('insertImage success');
        logger.debug('query result :\n' + JSON.stringify(result));
        }
      }
    } catch (err) {
      // クエリ実行失敗時
      logger.error('failed to query');
      logger.error('error message : \n' + err);
      if (isUpdateBanner) {
        // req.session.errorMsg = constants.MESSAGE.FAILED_TO_UPDATE_BANNER;
        try {
          await sessionModel.addErrorMsg(session,constants.MESSAGE.FAILED_TO_UPDATE_EXTEND);
          res.redirect(constants.ROUTE.EXTEND_UPDATE + '?extendId=' + req.body.extendId);
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
          await sessionModel.addErrorMsg(session,constants.MESSAGE.FAILED_TO_REGISTER_EXTEND);
          res.redirect(constants.ROUTE.EXTEND_REGISTER);
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
      //,dest2s
      cloudantExtendModel.updateExtend(req, res, session, updateExtendCallback, dest,dest1);
    } else {
      //,dest2s  insertExtend3
      // cloudantExtendModel.createExtend(req, res, session, createExtendCallback, dest,dest1);
      if(req.files.image){
        cloudantExtendModel.insertExtend3(req, res, session, insertExtend3Callback, dest);
      }else{
        cloudantExtendModel.insertExtend3(req, res, session, insertExtend3Callback, "");
      }
    }
  } catch (err) {
    logger.error('reading file failed.');
    console.log('createExtend/updateExtend error: '+err);
    try {
      await sessionModel.addErrorMsg(session,constants.MESSAGE.FILE_READ_ERROR);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);
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
      res.redirect(constants.ROUTE.EXTEND_UPDATE + '?extendId=' + req.body.extendId);
    } else {
      res.redirect(constants.ROUTE.EXTEND_REGISTER);
    }
    return;
  }
};

const updateExtend2Callback = async(err, req, res, session, result) => {
  if (err) {
    // クエリ実行失敗時
    logger.error('failed to query');
    logger.error('error message : \n' + err);
    // req.session.errorMsg = constants.MESSAGE.FAILED_TO_UPDATE_BANNER;
    try {
      await sessionModel.addErrorMsg(session,constants.MESSAGE.FAILED_TO_UPDATE_EXTEND);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    res.redirect(constants.ROUTE.EXTEND_UPDATE + '?extendId=' + req.body.extendId);
    return;
  }
  if (true !== result.ok) {
    // affectedRowsが1以外の場合は更新なし（該当レコードなし）なので失敗扱いにする。
    logger.error('affectedRows not equals 1. failed to update banner info');
    // req.session.errorMsg = constants.MESSAGE.FAILED_TO_UPDATE_BANNER;
    try {
      await sessionModel.addErrorMsg(session,constants.MESSAGE.FAILED_TO_UPDATE_EXTEND);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    res.redirect(constants.ROUTE.EXTEND);
    return;
  }
  logger.debug('updateBanner is success')
  logger.debug('query result :\n' + JSON.stringify(result));
  res.redirect(constants.ROUTE.EXTEND);
  return;
};


const insertExtend3Callback = async(err, req, res, session, result) => {
  if (err) {
    // クエリ実行失敗時
    logger.error('failed to query');
    logger.error('error message : \n' + err);
    // req.session.errorMsg = constants.MESSAGE.FAILED_TO_UPDATE_BANNER;
    try {
      await sessionModel.addErrorMsg(session,constants.MESSAGE.FAILED_TO_UPDATE_EXTEND);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    res.redirect(constants.ROUTE.EXTEND_UPDATE + '?extendId=' + req.body.extendId);
    return;
  }
  if (true !== result.ok) {
    // affectedRowsが1以外の場合は更新なし（該当レコードなし）なので失敗扱いにする。
    logger.error('affectedRows not equals 1. failed to update banner info');
    // req.session.errorMsg = constants.MESSAGE.FAILED_TO_UPDATE_BANNER;
    try {
      await sessionModel.addErrorMsg(session,constants.MESSAGE.FAILED_TO_UPDATE_EXTEND);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    res.redirect(constants.ROUTE.EXTEND);
    return;
  }
  logger.debug('updateBanner is success')
  logger.debug('query result :\n' + JSON.stringify(result));
  res.redirect(constants.ROUTE.EXTEND2);
  return;
};




module.exports = router;
