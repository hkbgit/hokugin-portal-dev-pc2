const connection = require('../submodules/postgres');
const logger = require('../submodules/logger').systemLogger;

/**
 * 画像データを取得する
 * @param req リクエスト
 * @param res レスポンス
 * @param callback SQL実行後に呼ばれるコールバック
 * @param filepath 取得対象の画像データへのパス
 * @param next next()関数
 */
exports.getImageBinary = (req, res, callback, filepath, next)=> {
  const sql = `SELECT image_binary FROM images WHERE image_path = $1;`;
  const values = [filepath];
  logger.debug('execute getImageBinary query');
  connection.queryCallBack(sql, values, function(err, rows) {
    callback(err, req, res, rows, next);
  });
  
};

/**
 * 画像データ保存
 * @param filepath 画像データへの論理パス
 * @param binary 画像のバイナリデータ
 * @param callback コールバック関数
 */
exports.insertImageData = async (filepath, binary, callback) => {
  //没有进行异常捕获
  logger.debug('execute createImageData query');

  const sql = `
    INSERT INTO images
      (image_path, image_binary)
    VALUES
      ($1, $2);
  `;
  const values = [filepath, binary];
  logger.debug('execute createImageData query');
  connection.queryCallBack(sql, values, function(err, result) {
    callback(err, result);
  });
};

/**
 * 画像データ削除
 * @param filepath 画像データへの論理パス
 * @param callback コールバック関数
 */
exports.deleteImageData = async (filepath) => {

    const sql = `
      DELETE FROM images
      WHERE image_path = $1;
    `;
    const values = [filepath];
    logger.debug('execute deleteImageData query');
    return await connection.query(sql, values);
};

/**
 * 画像データ保存(同期処理)
 * @param connection
 * @param filepath 画像データへの論理パス
 * @param binary 画像のバイナリデータ
 */
exports.insertImageDataSync = async (filepath, binary) => {

  const sql = `
    INSERT INTO images
      (image_path, image_binary)
    VALUES
      ($1, $2);
  `;
  const values = [filepath, binary];
  logger.debug('execute insertImageDataSync query');
  return await connection.query(sql, values);
};

exports.insertImageDataSync2 = async (req,filepath, binary,filepath1, binary1) => {

  var result;
  try{
    const sql = ` INSERT INTO images (image_path, image_binary)  VALUES ($1, $2); `;
    const values = [filepath, binary];
    const values1 = [filepath1, binary1];
    logger.debug('execute createImageData query');
    
    result = await connection.query(sql, values);
    return result = await connection.query(sql, values1);
  }catch(err){
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
};

exports.insertImageDataSync3 = async (filepath, binary) => {

  const sql = ` INSERT INTO images (image_path, image_binary)  VALUES ($1, $2); `;
  const values = [filepath, binary];
  logger.debug('execute createImageData query');
  
  return result = await connection.query(sql, values);
};

exports.updateImageDataSync2 = async (req,filepath, binary, targetImagePath,filepath1, binary1, targetImagePath1) => {
  // logger.debug('execute updateImageDataSync query');

  const sql = ` UPDATE images SET image_path = ?, image_binary = ? WHERE image_path = ? ; `;
  

   var str = "";
   var str1 = "";
   var str2 = "";
   try{
   if("" != filepath1){
    const values = [filepath1, binary1, targetImagePath1];
    str1 = await connection.query(sql, values);
   }
  
   if("" != filepath){
    const values = [filepath, binary, targetImagePath];
    str = await connection.query(sql, values);
   }
   if("" != filepath && ""!= filepath1){
     if("" != str && "" != str1){
      str2 = str
     }

   }
   if("" != filepath){
    if("" != str){
      str2 = str
     }
   }
   if("" != filepath1){
    if("" != str1){
      str2 = str1
     }
   }
   return str2;
  }catch(err){
    // return "0";
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
  }
  
   
};

exports.updateImageDataSync3 = async (filepath, binary, targetImagePath) => {
  logger.debug('execute updateImageDataSync query');

  const sql = `UPDATE images SET image_path = $1,image_binary = $2 WHERE image_path = $3;`;
  const values = [filepath, binary, targetImagePath];
  return await connection.query(sql, values);

};

/**
 * 画像データ更新(同期処理)
 * @param connection
 * @param filepath 画像データへの論理パス
 * @param binary 画像のバイナリデータ
 * @param targetImagePath 元画像データの論理パス
 */
exports.updateImageDataSync = async (filepath, binary, targetImagePath) => {
  logger.debug('execute updateImageDataSync query');
  
  const sql = `UPDATE images SET image_path = $1,image_binary = $2 WHERE image_path = $3;`;
  const values = [filepath, binary, targetImagePath];
  return await connection.query(sql, values);
   
};


