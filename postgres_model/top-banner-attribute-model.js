const connection = require('../submodules/postgres');
const logger = require('../submodules/logger').systemLogger;
/**
* TOP画面バナー属性情報を取得する
* @param req リクエスト
* @param res レスポンス
* @param callback SQL実行後に呼ばれるコールバック
* @param bannerInfo バナー編集情報保持オブジェクト
*/
exports.getAllTopBannerAttributes = async(req, res, session, callback, bannerInfo = null) =>{
  
  const sql = "SELECT * FROM top_banner_attributes ORDER BY id desc;";
  logger.debug('execute getAllTopBannerAttributes query');
  logger.debug('getAllTopBannerAttributes' + bannerInfo);
  connection.queryCallBack(sql,[], function(err, rows) {
    if (null != bannerInfo) {
      callback(err, req, res,session, rows, bannerInfo);
    } else {
      callback(err, req, res, session);
    }
  });

  
}; 

