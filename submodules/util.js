const constants = require('../constants');
const fs = require('fs');
const fse = require('fs-extra');
const util = require('util');
const logger = require('../submodules/logger').systemLogger;
const sessionModel = require('../postgres_model/session-model');
const cloudantImageModel = require('../postgres_model/image-model');
const multer  = require('multer');
exports.readFile = util.promisify(fs.readFile);
exports.unlink = util.promisify(fs.unlink);

/**
 * 対象ディレクトリを生成する。既に存在している場合は何もしない。
 */
exports.mkdirIfNotExists = async (path) => {
  const access = util.promisify(fs.access);
  try {
    try {
      // ディレクトリ存在チェック
      await access(path, fs.constants.F_OK);
    } catch (e) {
      // ディレクトリがない場合、再帰的に作成
      await fse.ensureDir(path);
    }
  } catch (e) {
    // DO NOTHING
  }
}

/**
 * 現在日付をYYYY/MM/DD形式で返す
 */
exports.getCurrentDate = function() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = ("00" + (currentDate.getMonth()+1)).slice(-2);
  const date = ("00" + currentDate.getDate()).slice(-2);
  return year + "/" + month + "/" + date;
};

/**
 * 現在日時をYYYY/MM/DD hh:mm形式で返す
 */
const getCurrentDateTime = function() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = ("00" + (currentDate.getMonth()+1)).slice(-2);
  const date = ("00" + currentDate.getDate()).slice(-2);
  const hour = ("00" + currentDate.getHours()).slice(-2);
  const minute = ("00" + currentDate.getMinutes()).slice(-2);
  return year + "/" + month + "/" + date + " " + hour + ":" + minute;
};

exports.getCurrentDateTime = getCurrentDateTime;

/**
 * 現在日時をYYYY/MM/DD hh:mm:ss形式で返す
 */
exports.getCurrentDateTimeWithSeconds = function() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = ("00" + (currentDate.getMonth()+1)).slice(-2);
  const date = ("00" + currentDate.getDate()).slice(-2);
  const hour = ("00" + currentDate.getHours()).slice(-2);
  const minute = ("00" + currentDate.getMinutes()).slice(-2);
  const second = ("00" + currentDate.getSeconds()).slice(-2);
  return year + "/" + month + "/" + date + " " + hour + ":" + minute + ":" + second;
};

/**
 * YYYY/MM/DD hh:mm:ss形式の日時を比較する
 * @param dt1 比較元の日時
 * @param dt2 比較相手の日時
 * @return 1: 比較元の方が大きい場合
 *         0: 同じ値
 *        -1: 比較元の方が小さい場合
 */
exports.compareDateTime = function(dt1, dt2) {
  const datetime1 = new Date(dt1);
  const datetime2 = new Date(dt2);
  if (datetime1.getTime() > datetime2.getTime()) {
    return 1;
  } else if (datetime1.getTime() < datetime2.getTime()) {
    return -1;
  } else {
    return 0;
  }
};

/**
 * 現在時刻と、YYYY/MM/DD hh:mm形式の日時に経過時間を追加した日時を比較する
 * @param dt 比較対象の日時
 * @param minutes 比較対象の日時からの経過時間(分)
 * @return 1: 現在時刻の方が大きい場合
 *         0: 同じ値
 *        -1: 現在時刻の方が小さい場合
 */
exports.compareDateTimeWhetherSpentMinutes = function(dt, minutes) {
  const datetime1 = new Date(getCurrentDateTime());
  const datetime2 = new Date(dt);
  datetime2.setMinutes(datetime2.getMinutes() + minutes);
  if (datetime1.getTime() > datetime2.getTime()) {
    return 1;
  } else if (datetime1.getTime() < datetime2.getTime()) {
    return -1;
  } else {
    return 0;
  }
};

/**
 * YYYY/MM/DD形式の間の経過日数を比較する
 * @param originDate 比較元の年月日
 * @param targetDate 比較相手の年月日
 * @return originDateからtargetDateの経過日数
 *         異常時は-1を返す。
 */
exports.countPassedDays = function(originDate, targetDate) {
  const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;
  const origin = new Date(originDate);
  const target = new Date(targetDate);
  const diffMilliSeconds = target.getTime() - origin.getTime();
  if (diffMilliSeconds < 0) {
    return -1;
  }
  return diffMilliSeconds / DAY_MILLISECONDS;
}

/**
 * ビューを描画する。
 * 描画時、セッションからログイン名、パスワード更新日情報をビューに渡す。
 * @param req リクエスト
 * @param res レスポンス
 * @param viewname ビュー名
 * @param additionalInfo ビューに描画するメッセージ情報
 */
exports.renderWithBaseInfo = function(req, res, viewName, additionalInfo, session) {
  // console.log("name : "+session[0].user_name);
  const baseInfo = {
    name: session[0].user_name,
    updateDate: session[0].user_last_password_updated_date,
  };
  const passedDays = this.countPassedDays(session[0].user_last_password_updated_date, this.getCurrentDate());
    if (constants.UPDATE_PASSWORD_LIMIT_DAYS <= passedDays) {
    // パスワード最終更新日から指定日数経過時、ビューに通知する
    baseInfo.passwordLimitDays = constants.UPDATE_PASSWORD_LIMIT_DAYS;
    baseInfo.password_pop = 'password_pop';
  }
  const info = Object.assign({}, baseInfo, additionalInfo);
  res.render(viewName, info);
  logger.debug('renderWithBaseInfo :' + viewName + ' is rendered');
}


/**
 * 異常のメッセージを取得
 */
 exports.getCatchMessage = function(err) {
  let msg = '';
  if(err.message === constants.CLOUDANT.ERROR_MESSAGE.ECONNREFUSED){
    msg = constants.CLOUDANT.RES_MESSAGE.DB_NOT_AVAILABLE;
    logger.fatal('cloudant server is not available.');
  }else{
    msg = constants.CLOUDANT.RES_MESSAGE.DB_ERROR_COMMON;
    logger.error('failed to query');
  }
  logger.error('error info : \n' + err);
  return msg;
};

exports.getContentImagePath = function(content) {
  var results = []
  var contentArray = content.split("<img src=")
  for (var i = 0; i< contentArray.length;i ++) {
    if (contentArray[i].length > 10 ) {
      var title = contentArray[i].substring(1,6);
      if (title == "/img/") {
        var imgArray = contentArray[i].split(".png")
        var imgPathArray = imgArray[0].split("/")
        if (imgPathArray.length == 3) {
          imgPath = "/img/" + imgPathArray[2] + '.png';
          console.log(imgPath);
          results.push(imgPath);
        }
      }
    } 
  }
  return results;
}