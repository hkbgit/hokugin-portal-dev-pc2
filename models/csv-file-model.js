const connection = require('../submodules/db-connection');
const logger = require('../submodules/logger').systemLogger;
const util = require('../submodules/util');
const constants = require('../constants');

/**
 * csvから契約者通番を読み取って配列に変換
 * @param csvfile csvファイルオブジェクト
 */
exports.getContractNumbersFromCsv = async function(csvFile) {
  logger.debug('getContractNumbersFromCsv() called');
  logger.debug('csv filename => '+ csvFile.filename);
  // csvファイルのデータ取得
  try {
    // sjisだが、半角英数のみであればutf8として読み込める。sjisで読む必要がない限りこれで問題ない
    const data = await util.readFile(csvFile.path, {encoding: 'utf8'});
    // 改行区切りで配列にし、ヘッダ行を削除
    const rows = data.split('\r\n');
    rows.shift();
    const contractNumbers = [];
    rows.forEach(row => {
      const values = row.split(',');
      let contractNumber = null;
      if (!values) {
        // csv形式では無い場合、行をそのまま挿入する
        contractNumber = row;
      } else {
        // csv形式の場合、1つ目の要素を契約者通番として取得する
        contractNumber = values[0];
      }
      if (contractNumber) {
        // 空文字では無い場合に契約者通番を取得する
        contractNumbers.push(contractNumber);
      }
    });
    // ファイルアップロード先に保存された一時ファイルを削除
    try {
      await util.unlink(csvFile.path);
    } catch (error) {
      logger.error('deleting attached csvfile failed.');
      logger.fatal('attached csvfile('+ csvFile.path +') has been no longer used. please delete it manually');
      throw error;
    }
    logger.debug('contractNumbers count => ' + contractNumbers.length);
    return contractNumbers;
  } catch (error) {
    logger.error('reading csvfile failed.');
    if (constants.ERROR.ENOENT === error.code) {
      logger.fatal('no such csvfile or directory. path : ' + csvFile.path);
    }
    try {
      await util.unlink(csvFile.path);
    } catch (e) {
      // DO NOTHING
    }
    throw error;
  }
};
