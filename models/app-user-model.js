const logger = require('../submodules/logger').systemLogger;
require('array-foreach-async');

/**
 * 新規の契約者通番をマスタに追加(重複は追加スキップ)
 * @param connection 
 * @param contractNumbers　契約者通番
 */
exports.insertContractNumbers = async (connection, contractNumbers) => {
  let count = 0;
  logger.debug('execute insertContractNumbers query');
  logger.debug('insert target contractNumbers => ' + contractNumbers.length);
  await contractNumbers.forEachAsync(async contractNumber => {
    let sql = `
    INSERT IGNORE INTO app_users (contract_no)
    VALUES (?);
    `;
    const values = [contractNumber];
    const result = await connection.query(sql, values);
    if (result) {
      count++;
    }
  });

  return count;
};

/**
 * 契約者通番マスタ存在チェック
 */
exports.findUser = async (connection, contractNumber) => {
  logger.debug('execute findUser query');
  let sql = `SELECT contract_no FROM app_users WHERE app_users.contract_no = ?`
  const values = [contractNumber];
  const result = await connection.query(sql, values);
  return result.length !== 0;
};

