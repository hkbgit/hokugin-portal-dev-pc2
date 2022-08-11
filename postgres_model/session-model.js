
const logger = require('../submodules/logger').systemLogger;
const connection = require('../submodules/postgres');
/**
* insert session
* @param req リクエスト
* @param row session info
*/
exports.insertSession = async (req, row) => {
  return insert(req.session.id, row.id, row.name, '', '', row.last_password_updated_date, new Date().getTime())
};

/**
 * get session info from cloudant
 * @param req リクエスト
 */
exports.getSession = async (req) => {
  const sql = "SELECT * FROM session_info WHERE id = $1 ;";
  const values = [req.cookies.sessionId];
  logger.debug('execute auth query');
  var session =  await connection.query(sql, values);
  if (session.length > 0) {
    session[0].errorMsg = session[0].error_msg
  }
  return session;

};

exports.sessionAddErrorMsg = async (req, msg) => {
  logger.debug('execute sessionAddErrorMsg session query');
  this.getSession(req)
  const sql = "UPDATE session_info set error_msg = $1 where id = $2;";
  const values = [msg, req.cookies.sessionId];
  return await connection.query(sql, values);
};

/**
 * @param {*} session 
 * @param {*} msg 
 */
exports.addErrorMsg = async (session, msg) => {
  logger.debug('execute addErrorMsg session query');
  const sql = "UPDATE session_info set error_msg = $1 where id = $2 ;";
  session[0].errorMsg = msg;
  const values = [msg, session[0].id];
  return await connection.query(sql, values);

};

/**
 * 创建前台session
 * @param {*} req 
 */
exports.insertFrontSession = async (req, contracterNo) => {
  console.log("insertFrontSession start: ");
  return insert(req.session.id, null, '', '', contracterNo, '', new Date().getTime())
};
/**
 * 修改前台session
 * @param {*} req 
 */
exports.updateFrontSession = async (row, req) => {

  const sql = "UPDATE session_info set contracter_no = '' where id = $1 ;";
  const values = [row.id];
  logger.debug('execute addErrorMsg session query');
  return await connection.query(sql, values);

};

exports.updateSession = async (row) => {
  logger.info("updateSession start ");
  if (row.errorMsg && row.errorMsg !== null) {
    row.errorMsg = null;
    row.error_msg = null;
  }

  return await update(row);

};


/**
 * 删除session
 * @param {*} req 
 */
exports.deleteSession = async (id) => {
  logger.info('deleteSession start');
  deleteQuery(id)
  logger.info('deleteSession end');
}

async function insert(id, user_id, user_name, error_msg, contracter_no, update_date, date) {

  const sql = `
    INSERT INTO session_info
      ( id,
        user_id,
        user_name,
        error_msg,
        contracter_no,
        user_last_password_updated_date,
        date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7);
    `;
  const values = [
    id,
    user_id,
    user_name,
    error_msg,
    contracter_no,
    update_date,
    date
  ];
  logger.debug('execute session insert query');
  return await connection.query(sql, values);
}

async function update(session) {

  const sql = `
    UPDATE session_info
    SET user_id=$1, user_name=$2, error_msg=$3, contracter_no=$4, user_last_password_updated_date=$5, date=$6
    WHERE id=$7
    `;
  const values = [
    session.user_id,
    session.user_name,
    session.error_msg,
    session.contracter_no,
    session.user_last_password_updated_date,
    session.date,
    session.id
  ];
  logger.debug('execute session update query');
  return await connection.query(sql, values);
}

async function deleteQuery(id) {
  const sql = `DELETE FROM session_info WHERE id=$1 ;`;
  logger.debug('execute session delete query');
  return await connection.query(sql, [id]);
}