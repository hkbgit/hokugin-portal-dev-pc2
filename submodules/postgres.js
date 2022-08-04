const Pool = require('pg-pool');
const logger = require('../submodules/logger').systemLogger;
const fs = require('fs')

// 本番環境
// const config = {
//     user: 'admin',
//     password: '9e5eae758547a39204e67d862881f0166da5d5ba08f24d4661',
//     host: '2bb0f728-7142-4655-9dbf-a418e493013d.c437f5ab8b3840e99a1a93dffcce078d.databases.appdomain.cloud',
//     port: 31389,
//     database: 'hokuriku_portal',
//     // ssl: true
// };

//テスト環境
const config = {
    user: 'admin',
    password: '9e5eae758547a39204e67d862881f0166da5d5ba08f24d4661',
    host: '2bb0f728-7142-4655-9dbf-a418e493013d.c437f5ab8b3840e99a1a93dffcce078d.databases.appdomain.cloud',
    port: 31389,
    database: 'hokuriku_portal',
    ssl: true,
    ssl: {
        ca: fs.readFileSync('ssl/dev-certificate'),
        rejectUnauthorized: true,
      }
};


// const config = {
//     user: 'postgres',
//     password: 'postgres',
//     host: 'localhost',
//     port: 5432,
//     database: 'postgres',
//     // ssl: true
// };

const pool = new Pool(config);

// module.exports = pool;

exports.queryCallBack = (SQL, value, callback) =>{
    
        pool.connect((err,client) => {
            if(err){
                callback(err, null);
            } else {
                try{
                    client.query(SQL, value, (err, res) => {
                        client.release();
                        if(err){
                            logger.info(err);
                            callback(err, res); 
                        } else {
                            var rows = [];
                            if (res.rows.length > 0 ) rows = res.rows
                            callback(err, rows);
                        }
                        
                    });
                }catch(err){
                    logger.info(err);
                    callback(err, []);
                }
            }
        });
    
    
};

exports.queryResCallBack = (SQL, value, callback) =>{
    
    pool.connect((err,client) => {
        if(err){
            callback(err, null);
        }else{
            try{
                client.query(SQL, value, (err, res) => {
                    client.release();
                    callback(err, res);
                });
            }catch(err){
                logger.info(err);
                callback(err, []);
            }
        }
        
    });
};

exports.query = (SQL, value) =>{
    
    return new Promise((resolve, reject) => {
        pool.connect((err,client) => {
            if(err){
                reject(err);
            }else{
                try{
                    client.query(SQL, value, (err, res) => {
                        client.release();
                        if (err) {
                            logger.error(err);
                            reject(err);
                        } else {
                            resolve(res.rows);
                        }
                    });
                }catch(err){
                    logger.info(err);
                }
            }
        });
    });
    
};

exports.queryCount = (SQL, value) =>{
    
    return new Promise((resolve, reject) => {
        pool.connect((err,client) => {
            if(err){
                reject(err);
            }else{
                try{
                    client.query(SQL, value, (err, res) => {
                        client.release();
                        if (err) {
                            logger.error(err);
                            reject(err);
                        } else {
                            resolve(res.rowCount);
                        }
                    });
                }catch(err){
                    logger.info(err);
                }
            }
            
        });
    });
    
};
