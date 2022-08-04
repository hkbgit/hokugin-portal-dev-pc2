const Cloudant = require('@cloudant/cloudant');
const constants = require('../constants');
const cloudant = Cloudant(constants.CLOUDANT.URL);
const db = cloudant.db.use(constants.CLOUDANT.DATABSENAME);

module.exports = db;

