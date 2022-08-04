const log4js = require('log4js');

log4js.configure({
  appenders: {
    out: {
      type: 'stdout'
    },
    system: {
      type: 'dateFile',
      filename: 'log/system.log',
      pattern: 'yyyyMMdd',
      keepFileExt: true,
      layout: {
        type: 'pattern',
        pattern: '%p %d{yyyy-MM-dd hh:mm:ss.SSS} %m'
      }
    },
    access: {
      type: 'dateFile',
      filename: 'log/access.log',
      pattern: 'yyyyMMdd',
      keepFileExt: true,
      layout: {
        type: 'pattern',
        pattern: '%d{yyyy-MM-dd hh:mm:ss.SSS} %m'
      }
    }
  },
  categories: {
    default: {
      appenders: ['out', 'system'],
      level: 'INFO'
    },
    system: {
      appenders: ['system'],
      level: 'INFO'
    },
    access: {
      appenders: ['access'],
      level: 'INFO'
    }
  }
});

exports.systemLogger = log4js.getLogger('system');
exports.accessLogger = log4js.getLogger('access');
