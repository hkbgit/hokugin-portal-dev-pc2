const Cloudant = require('cloudant-quickstart');
const constants = require('../constants');
var url = constants.CLOUDANT.URL;
//需要给url拼接一个数据库
exports.Databse = function(databaseName){
    const cloudant = Cloudant(url,databaseName);
    return cloudant;
};