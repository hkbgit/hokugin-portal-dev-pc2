const connection = require('../submodules/db-connection');
const logger = require('../submodules/logger').systemLogger;

/**
 * 画像データを取得する
 * @param req リクエスト
 * @param res レスポンス
 * @param callback SQL実行後に呼ばれるコールバック
 * @param filepath 取得対象の画像データへのパス
 * @param next next()関数
 */
exports.getImageBinary = function(req, res, callback, filepath, next) {
  const sql = `
    SELECT image_binary
    FROM images
    WHERE image_path = ?;
  `;
  const values = [filepath];
  logger.debug('execute getImageBinary query');
  connection.query(sql, values, function(err, rows) {
    callback(err, req, res, rows, next);
  });
};

/**
 * 画像データ保存
 * @param filepath 画像データへの論理パス
 * @param binary 画像のバイナリデータ
 * @param callback コールバック関数
 */
exports.insertImageData = function(filepath, binary, callback) {
  const sql = `
    INSERT INTO images
      (image_path, image_binary)
    VALUES
      (?, ?);
  `;
  const values = [filepath, binary];
  logger.debug('execute createImageData query');
  connection.query(sql, values, function(err, result) {
    callback(err, result);
  });
};

/**
 * 画像データ削除
 * @param filepath 画像データへの論理パス
 * @param callback コールバック関数
 */
exports.deleteImageData = async (connection, filepath) => {
  const sql = `
    DELETE FROM images
    WHERE image_path = ?;
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
exports.insertImageDataSync = async function(connection, filepath, binary) {
  const sql = `
    INSERT INTO images
      (image_path, image_binary)
    VALUES
      (?, ?);
  `;
  const values = [filepath, binary];
  logger.debug('execute insertImageDataSync query');
  return await connection.query(sql, values);
};

/**
 * 画像データ更新(同期処理)
 * @param connection
 * @param filepath 画像データへの論理パス
 * @param binary 画像のバイナリデータ
 * @param targetImagePath 元画像データの論理パス
 */
exports.updateImageDataSync = async function(connection, filepath, binary, targetImagePath) {
  const sql = `
    UPDATE images
    SET
      image_path = ?,
      image_binary = ?
    WHERE
      image_path = ?
    ;
  `;
  const values = [filepath, binary, targetImagePath];
  logger.debug('execute updateImageDataSync query');
  return await connection.query(sql, values);
};
