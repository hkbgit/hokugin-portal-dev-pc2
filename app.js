const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');

const login = require('./routes/login');
const logout = require('./routes/logout');
const banners = require('./routes/banner');
const bannerForm = require('./routes/banner-form');
const passwordForm = require('./routes/password-form');
const image = require('./routes/image');
const topBanners = require('./routes/top-banner');
const extend = require('./routes/extend');
const extendForm = require('./routes/extend-form');
const topBannerForm = require('./routes/top-banner-form');
const comment = require('./routes/comment');
const commentForm = require('./routes/comment-form');
const kyara = require('./routes/kyara');
const kyaraForm = require('./routes/kyara-form');
const tairu = require('./routes/tairu');
const tairuForm = require('./routes/tairu-form');


const uuidv1 = require('uuid');

const sessionManager = require('./submodules/session-manager');
const logger = require('./submodules/logger').systemLogger;

const constants = require('./constants');

// 设置端口号
var ServerConf=require("./config/serverConf");

process.env.PORT=ServerConf.ServicePort; //设置端口号，不要占用了。

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(morgan('dev', {
    stream: {
      write: function(log) {
        // 末尾の改行文字を削除
        log = log.slice(0, -1);
        // console.log(log);
        // ログに出力する場合は以下のコメントを外す
        // logger.debug(log);
      }
    }
  }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ limit: '50mb', extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'bower_components')));

// express-session設定
app.use(session({
  genid: function(req) {
    return uuidv1.v1().replace(/-/g,'')
    // genuuid() 
    // use UUIDs for session IDs
  },
  secret: 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 180 * 60 * 1000 // 分 * 秒 * ミリ秒
  }
}));

app.use(constants.ROUTE.LOGIN, login);
app.use(constants.BANNER_ROOT_PATH, image);
app.use(constants.ROUTE.BACK, sessionManager.sessionCheck);
app.use(constants.ROUTE.LOGOUT, logout);
app.use(constants.ROUTE.BANNERS, banners);
app.use(constants.ROUTE.REGISTER_BANNER, bannerForm);
app.use(constants.ROUTE.PASSWORD, passwordForm);
app.use(constants.ROUTE.TOP_BANNERS, topBanners);
app.use(constants.ROUTE.EXTEND, extend);
app.use(constants.ROUTE.EXTEND_REGISTER, extendForm);
app.use(constants.ROUTE.REGISTER_DEFAULT_TOP_BANNER, topBannerForm);
app.use(constants.ROUTE.REGISTER_CONTRACT_TOP_BANNER, topBannerForm);
app.use(constants.ROUTE.COMMENT, comment);
app.use(constants.ROUTE.COMMENT_REGISTER, commentForm);
app.use(constants.ROUTE.KYARA, kyara);
app.use(constants.ROUTE.KYARA_REGISTER, kyaraForm);
app.use(constants.ROUTE.TAIRU, tairu);
app.use(constants.ROUTE.TAIRU_REGISTER, tairuForm);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
