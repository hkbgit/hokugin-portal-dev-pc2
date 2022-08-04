const logger = require('../submodules/logger').systemLogger;
require('array-foreach-async');
const connection = require('../submodules/postgres');
/**
 * 新規の契約者通番をマスタに追加(重複は追加スキップ)
 * @param connection 
 * @param contractNumbers　契約者通番
 */
exports.insertContractNumbers = async ( contractNumbers) => {

  let count = 0;
  logger.debug('execute insertContractNumbers query');
  logger.debug('insert target contractNumbers => ' + contractNumbers.length);
  await contractNumbers.forEachAsync(async contractNumber => {
    let sql = `
    INSERT INTO app_users (contract_no)
    VALUES ($1);
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
exports.findUser = async (contractNumber) => {

  logger.debug('execute findUser query');
  let sql = `SELECT contract_no FROM app_users WHERE app_users.contract_no = $1`
  const values = [contractNumber];
  const result = await connection.query(sql, values);
  return result.length !== 0;
};

/**
 * 20210422
 */

 exports.findAccountFlagById = async (contractNumber) => {

  logger.debug('execute findAccountFlagById query');
  try {
    if (contractNumber != null && contractNumber != undefined && contractNumber != "") {
      let sql = `SELECT flag FROM user_account_show_hide WHERE contract_number = $1`;
      const values = [contractNumber];
      const rows = await connection.query(sql, values);
      var flag ;
      if (rows.length > 0) {
        flag = rows[0].flag;
      } else {
        const upd_sql = `
          INSERT INTO user_account_show_hide (contract_number, flag)
          values($1, $2)
          ON CONFLICT (contract_number)
            DO UPDATE SET flag = $2;
        `;
        const upd_values = [contractNumber,"0"];
        const result = await connection.query(upd_sql, upd_values);
      }
      return flag;
    }
  } catch (e) {
    console.log(e);
  }
};

exports.updateAccountFlagById = async (contractNumber) => {
  


  let userSortRecord = null;
  try{
    let sql = `SELECT flag FROM user_account_show_hide WHERE contract_number = $1`;
    const values = [contractNumber];
    const rows = await connection.query(sql, values);
    var flag ;
    if (rows.length > 0) {
      flag = rows[0].flag;
      flag = flag == "0" ? "1":"0"
    } else {
      flag = "0"
    }

    const upd_sql = `
          INSERT INTO user_account_show_hide (contract_number, flag)
          values($1, $2)
          ON CONFLICT (contract_number)
            DO UPDATE SET flag = $2;
        `;
    const upd_values = [contractNumber,flag];
    const result = await connection.queryCount(upd_sql, upd_values);

    return flag
    
  }catch(e){
    console.log(e);
  }
};
