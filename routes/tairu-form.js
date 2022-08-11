const express = require('express');
const router = express.Router();
const cloudantTairuModel = require('../postgres_model/tairu-model');
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
    //バナーイメージ項目からのアップロードの場合
    if (file.fieldname === 'image'){
      await util.mkdirIfNotExists(tmpImageDir);
      callback(null, tmpImageDir);
    }else {
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

  logger.debug(' is success');

  const session = global.session;
  try {
    if(session[0] && session[0].errorMsg && session[0].errorMsg !== null){
      info.error = session[0].errorMsg;
      await sessionModel.updateSession(session[0],req);
    }
  } catch (error) {
    logger.error('updateSession for delete errorMsg error : \n' + error);
    sessionManager.destroy(req);
    msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
    res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
    return;
  }

  let info = {
    title: constants.TITLE.TAIRU_FORM,
    error: "",
    attrs: [{"id":1,"name":constants.COORDINATE_ATTRS[0]},{"id":2,"name":constants.COORDINATE_ATTRS[1]}]
  }
  util.renderWithBaseInfo(req, res, constants.VIEW.TAIRU_FORM, info, session);
  return;
});

/**
 * バナー情報の送信時（新規追加・更新）
 */
 router.post('/', upload, async function(req, res, next) {
  logger.info('received request URL : ' + req.originalUrl);
  const session = global.session;
  // console.log("表单追加");

  try {
    if (req.body.tairuId) {
      // バナーIDが取得できた場合はバナー更新処理
      if (req.files.image || req.files.csv ) {
        await saveImage(req, res, session, req.files.image[0], true);
      } else {
        // バナー画像は更新しない場合
        cloudantTairuModel.updateItemCallback(req, res, session, updateItemCallback);
      }
    } else {
      // バナー新規追加処理
      if (!req.files.image) {
        logger.error('file has not been attached');
        next();
        return;
      }
      await saveImage(req, res, session, req.files.image[0]);
    }
  } catch(err) {
    let msg = util.getCatchMessage(err);
    util.renderWithBaseInfo(req, res, constants.VIEW.TAIRU_FORM, {title: constants.TITLE.TAIRU_FORM, error:msg}, session);
  }

});

router.post('/validate', upload,async(req, res, next) =>{
  
  // console.log("表单校验22222...");
  let errorInfo = {};
  let imageErrorInfo = null;
  logger.debug('imageFile :' + req.files.image);
  // バナー画像ファイルアップロードのエラー情報   list 
  if (req.files.image) {
    const imageFile = req.files.image[0];
    imageErrorInfo = checkUploadedFile4(imageFile,req);
    if (imageErrorInfo) {
      logger.info('validate error: image');
      errorInfo = Object.assign(errorInfo, imageErrorInfo);
    }
  }
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
      if (width == constants.FILE_DIMENSION_TAIRU.WIDTH && height == constants.FILE_DIMENSION_TAIRU.HEIGHT  ) {
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
  if (constants.FB_MAX_FILE_SIZE < file.size) {
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
  formValues.imageName = req.body.imageName ? req.body.imageName : EMPTY_VALUE;
  formValues.title = req.body.title ? req.body.title : EMPTY_VALUE;
  formValues.subTitle = req.body.subTitle ? req.body.subTitle : EMPTY_VALUE;
  formValues.link = req.body.link ? req.body.link : EMPTY_VALUE;
  formValues.coordinate = req.body.coordinate ? req.body.coordinate : EMPTY_VALUE;
  formValues.priority = req.body.priority ? req.body.priority : EMPTY_VALUE;

  let hasInvalidValue = false;
  const errorInfo = {};

  logger.debug('validateInputValue() called');
  

  if ('' === formValues.imageName) {
    // ファイル名未入力時エラー
    logger.debug('fileName is empty');
    errorInfo.image = {
      msg: constants.MESSAGE.FILE_NAME_IS_EMPTY
    };
    hasInvalidValue = true;
  }
  if ('' === formValues.title ) {
    logger.debug("title is invalid format");
    errorInfo.title = {
      msg: constants.MESSAGE.TITLE_NULL
    }
    hasInvalidValue = true;
  }

  if ('' !== formValues.priority) {
    // 順位に何か入力されていた場合、入力値をチェックする。
    const regex = new RegExp(/^[1-9]+$/);
    const isValid = regex.test(req.body.priority);
    if (!isValid) {
      // 表示優先順位の入力内容が整数変換に失敗した場合のエラー
      logger.debug("priority cannot parse to int");
      errorInfo.priority = {
        msg: constants.MESSAGE.FAILED_TAIRU_PRIORITY
      }
      hasInvalidValue = true;
    }
  } else{
    logger.debug("priority is invalid format");
    errorInfo.priority = {
      msg: constants.MESSAGE.FAILED_TAIRU_PRIORITY
    }
    hasInvalidValue = true;
  }

  if (formValues.coordinate != 1 && formValues.coordinate != 2) {
    logger.debug("coordinate is invalid format");
    errorInfo.coordinate = {
      msg: constants.MESSAGE.FAILED_TAIRU_COORDINATE
    }
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

  return hasInvalidValue ? errorInfo : null;
};


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
    let data = null;
    data = await util.readFile(file.path);
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
        res.redirect(constants.ROUTE.UPDATE_KYARA + '?kyaraId=' + req.body.kyaraId);
      } else {
        res.redirect(constants.ROUTE.KYARA_REGISTER);
      }

      return;
    }
    // 画像挿入クエリ実行
    try {

      if (isUpdateBanner) {
        // 既存のimageレコードを更新する
        let tairuInfo = await cloudantTairuModel.getItemById(req.body.tairuId);
        if (tairuInfo.length !== 1) {
          throw Error('faild to get tairuInfo');
        }
        let originImagePath = tairuInfo[0].image_path;
        logger.debug('originImagePath => ' + originImagePath);
        let result = await cloudantImageModel.updateImageDataSync(dest, data, originImagePath);
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
     
      try {
        await sessionModel.addErrorMsg(session,constants.MESSAGE.FAILED_TO_REGISTER_TAIRU);
        res.redirect(constants.ROUTE.TAIRU_REGISTER);
      } catch (error) {
        logger.error('save session errorMsg error: '+error);
        sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
        msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
        res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
        return;
      }
      return;
    }

    if (isUpdateBanner) {
      cloudantTairuModel.updateItemCallback(req, res, session, updateItemCallback, dest);
    } else {
      cloudantTairuModel.createItemCallBack(req, res, session, createItemCallback, dest);
    }

  } catch (err) {
    logger.error('reading file failed.');
    console.log('createKyara/updateKyara error: '+err);

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
      res.redirect(constants.ROUTE.TAIRU_UPDATE + '?tairuId=' + req.body.tairuId);
    } else {
      res.redirect(constants.ROUTE.TAIRU_REGISTER);
    }


    return;
  }
};

/**
 * キャラ新規追加のinsert文実行後のコールバック
 * @param err エラー情報
 * @param req リクエスト
 * @param res レスポンス
 * @param result insert文実行結果
 */
 const createItemCallback = async(err, req, res, result) => {
  if (err) {
    let msg = constants.MESSAGE.FAILED_TO_REGISTER_KYARA;
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
      await sessionModel.sessionAddErrorMsg(req,constants.MESSAGE.FAILED_TO_REGISTER_TAIRU);
      res.redirect(constants.ROUTE.TAIRU_REGISTER);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);//这里只是将系统的session删除了，并没有删除数据库的
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    return;
  }
  logger.debug('createItem is success')
  logger.debug('query result :\n' + JSON.stringify(result));
  res.redirect(constants.ROUTE.TAIRU);
  return;
};

/**
 * バナー情報更新のupdate文実行後のコールバック
 * @param err エラー情報
 * @param req リクエスト
 * @param res レスポンス
 * @param result update文実行結果
 */
 const updateItemCallback = async(err, req, res, session, result) => {
  if (err) {
    // クエリ実行失敗時
    logger.error('failed to query');
    logger.error('error message : \n' + err);
    try {
      await sessionModel.addErrorMsg(session,constants.MESSAGE.FAILED_TO_UPDATE_TAIRU);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    res.redirect(constants.ROUTE.TAIRU_UPDATE + '?tairuId=' + req.body.tairuId);
    return;
  }
  if (1 !== result) {
    logger.error('affectedRows not equals 1. failed to update banner info');
    try {
      await sessionModel.addErrorMsg(session,constants.MESSAGE.FAILED_TO_UPDATE_KYARA);
    } catch (error) {
      logger.error('save session errorMsg error: '+error);
      sessionManager.destroy(req);
      msg = constants.CLOUDANT.RES_MESSAGE.OTHER_ERROR;
      res.render(constants.VIEW.LOGIN, { title: constants.TITLE.LOGIN, error: msg});
      return;
    }
    res.redirect(constants.ROUTE.TAIRU);
    return;
  }
  logger.debug('updateTairu is success')
  logger.debug('query result :\n' + JSON.stringify(result));
  res.redirect(constants.ROUTE.TAIRU);
  return;
};

module.exports = router;
