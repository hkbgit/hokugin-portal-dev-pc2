const connection = require('../submodules/db-connection');
const logger = require('../submodules/logger').systemLogger;

/**
* バナー配置場所情報を取得する。 TOP画面バナー配置場所情報は取得しない
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
* @param bannerInfo バナー編集情報保持オブジェクト
*/
exports.getAllBannerPositions = function(req, res, callback, bannerInfo = null) {
  const sql = "SELECT * FROM banner_position WHERE id NOT IN ('7');";
  logger.debug('execute getAllBannerPositions query');
  //logger.debug('execute getAllBannerPositions query : ' + bannerInfo);
  //logger.debug('execute getAllBannerPositions query : ' + bannerInfo.title);
  //logger.debug('execute getAllBannerPositions query : ' + bannerInfo.is_default);
  connection.query(sql, function(err, rows) {
    if (null != bannerInfo) {
      callback(err, req, res, rows, bannerInfo);
    } else {
      callback(err, req, res, rows);
    }
  });
};
