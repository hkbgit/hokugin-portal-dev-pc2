const connection = require('../submodules/db-connection');
const logger = require('../submodules/logger').systemLogger;

/**
* TOP画面バナー属性情報を取得する
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
* @param bannerInfo バナー編集情報保持オブジェクト
*/
exports.getAllTopBannerAttributes = function(req, res, callback, bannerInfo = null) {
  const sql = "SELECT * FROM top_banner_attributes ORDER BY id;";
  logger.debug('execute getAllTopBannerAttributes query');
  logger.debug('getAllTopBannerAttributes' + bannerInfo);
  connection.query(sql, function(err, rows) {
    if (null != bannerInfo) {
      callback(err, req, res, rows, bannerInfo);
    } else {
      callback(err, req, res, rows);
    }
  });
}; 