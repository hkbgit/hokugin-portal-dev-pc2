const Pool = require('pg-pool');
const logger = require('../submodules/logger').systemLogger;
const fs = require('fs')


//テスト環境(PostgreSQL-hokuriku-bank)
const config = {
    user: 'admin',
    password: 'b6c48d305dadeffe92eb5cabab7321aec7b0f0b2637acebb570',
    host: 'ad817309-9209-4b4d-993b-15fb2e12f64e.c8gao0tt0nr65snb1shg.databases.appdomain.cloud',
    port: 31629,
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
