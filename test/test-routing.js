const assert = require('assert');
const should = require('chai').should();
const app = require('../app');
const loginRouter = require('../routes/login');
const request = require('supertest');
const constants = require('../constants');
const bannerModel = require('../models/banner-model');

const login_user = 'hokurikuit01';
const login_pass = 'appli010';

// ルーティングテスト
describe('routes', function() {
  describe(constants.ROUTE.LOGIN, function() {
    it('send GET request', function(done) {
      request(app)
        .get(constants.ROUTE.LOGIN)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          else return done();
        });
    });
    it('send POST request with no data', function(done) {
      // 送信データなしでPOST
      request(app)
        .post(constants.ROUTE.LOGIN)
        .expect(500)
        .end(function(err, res) {
          if (err) return done(err);
          else return done();
        });
    });
    it('send POST request with incorrect login info', function(done) {
      const ERROR_VALUE = 'incorrect_value';
      request(app)
        .post(constants.ROUTE.LOGIN)
        .send({
          name: ERROR_VALUE,
          password: ERROR_VALUE
        })
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          else return done();
        });
    });
    it('send POST request with correct login info', function(done) {
      request(app)
        .post(constants.ROUTE.LOGIN)
        .send({
          name: login_user,
          password: login_pass
        })
        .expect(302)
        .end(function(err, res) {
          if (err) return done(err);
          else return done();
        });
    });
  });
  describe(constants.ROUTE.BANNERS, function() {
    describe('without login', function() {
      it('send GET request', function(done) {
        // 未ログイン状態なので302リダイレクトがレスポンスされる。
        request(app)
          .get(constants.ROUTE.BANNERS)
          .expect(302)
          .expect(function(res) {
            res.text.should.include(constants.ROUTE.LOGIN);
          })
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
      it('send POST request', function(done) {
        // 未ログイン状態なので302リダイレクトがレスポンスされる。
        request(app)
          .post(constants.ROUTE.BANNERS)
          .expect(302)
          .expect(function(res) {
            res.text.should.include(constants.ROUTE.LOGIN);
          })
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
    });
    describe('with login', function() {
      // Cookieを使用する
      let cookie = null;
      before('execute login before test', function(done) {
        // ログイン状態にする。
        request(app)
          .post(constants.ROUTE.LOGIN)
          .send({
            name: login_user,
            password: login_pass
          })
          .end(function(err, res) {
            if (err) return done(err);
            else {
              cookie = res.header['set-cookie'];
              done();
            }
          });
      });
      it('send GET request', function(done) {
        request(app)
          .get(constants.ROUTE.BANNERS)
          .set('cookie', cookie)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
      it('send POST request', function(done) {
        request(app)
          .post(constants.ROUTE.BANNERS)
          .set('cookie', cookie)
          .expect(404)
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
    });
  });
  describe(constants.ROUTE.BANNERS + '/delete', function() {
    describe('without login', function() {
      it('send GET request', function(done) {
        // 未ログイン状態なので302リダイレクトがレスポンスされる。
        request(app)
          .get(constants.ROUTE.BANNERS + '/delete')
          .expect(302)
          .expect(function(res) {
            res.text.should.include(constants.ROUTE.LOGIN);
          })
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
      it('send POST request', function(done) {
        // 未ログイン状態なので302リダイレクトがレスポンスされる。
        request(app)
          .post(constants.ROUTE.BANNERS + '/delete')
          .expect(302)
          .expect(function(res) {
            res.text.should.include(constants.ROUTE.LOGIN);
          })
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
    });
    describe('with login', function() {
      // Cookieを使用する
      let cookie = null;
      before('execute login before test', function(done) {
        // ログイン状態にする。
        request(app)
          .post(constants.ROUTE.LOGIN)
          .send({
            name: login_user,
            password: login_pass
          })
          .end(function(err, res) {
            if (err) return done(err);
            else {
              cookie = res.header['set-cookie'];
              done();
            }
          });
      });
      it('send GET request', function(done) {
        request(app)
          .get(constants.ROUTE.BANNERS + '/delete')
          .set('cookie', cookie)
          .expect(404)
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
      it('send POST request with param（non exist targetId）', function(done) {
        // 実在しないIDを指定する。実在するIDの削除試験は手動により確認すること。
        const NON_EXIST_TARGET_ID = 0;
        request(app)
          .post(constants.ROUTE.BANNERS + '/delete')
          .send({
            targetId: NON_EXIST_TARGET_ID,
          })
          .set('cookie', cookie)
          .expect(404)
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
      it('send POST request without param', function(done) {
        request(app)
          .post(constants.ROUTE.BANNERS + '/delete')
          .set('cookie', cookie)
          .expect(404)
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
    });
  });
  describe(constants.ROUTE.UPDATE, function() {
    describe('without login', function() {
      it('send GET request', function(done) {
        // 未ログイン状態なので302リダイレクトがレスポンスされる。
        request(app)
          .get(constants.ROUTE.UPDATE)
          .expect(302)
          .expect(function(res) {
            res.text.should.include(constants.ROUTE.LOGIN);
          })
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
      it('send POST request', function(done) {
        // 未ログイン状態なので302リダイレクトがレスポンスされる。
        request(app)
          .post(constants.ROUTE.UPDATE)
          .expect(302)
          .expect(function(res) {
            res.text.should.include(constants.ROUTE.LOGIN);
          })
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
    });
    describe('with login', function() {
      // Cookieを使用する
      let cookie = null;
      before('execute login before test', function(done) {
        // ログイン状態にする。
        request(app)
          .post(constants.ROUTE.LOGIN)
          .send({
            name: login_user,
            password: login_pass
          })
          .end(function(err, res) {
            if (err) return done(err);
            else {
              cookie = res.header['set-cookie'];
              done();
            }
          });
      });
      it('send GET request with query', function(done) {
        request(app)
          .get(constants.ROUTE.UPDATE)
          .set('cookie', cookie)
          .query({
            bannerId: 1
          })
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
      it('send GET request without query', function(done) {
        request(app)
          .get(constants.ROUTE.UPDATE)
          .set('cookie', cookie)
          .expect(404)
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
      it('send POST request', function(done) {
        request(app)
          .post(constants.ROUTE.UPDATE)
          .set('cookie', cookie)
          .expect(404)
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
    });
  });
  describe(constants.ROUTE.REGISTER_BANNER, function() {
    describe('without login', function() {
      it('send GET request', function(done) {
        // 未ログイン状態なので302リダイレクトがレスポンスされる。
        request(app)
          .get(constants.ROUTE.REGISTER_BANNER)
          .expect(302)
          .expect(function(res) {
            res.text.should.include(constants.ROUTE.LOGIN);
          })
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
      it('send POST request', function(done) {
        // 未ログイン状態なので302リダイレクトがレスポンスされる。
        request(app)
          .post(constants.ROUTE.REGISTER_BANNER)
          .expect(302)
          .expect(function(res) {
            res.text.should.include(constants.ROUTE.LOGIN);
          })
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
    });
    describe('with login', function() {
      // Cookieを使用する
      let cookie = null;
      before('execute login before test', function(done) {
        // ログイン状態にする。
        request(app)
          .post(constants.ROUTE.LOGIN)
          .send({
            name: login_user,
            password: login_pass
          })
          .end(function(err, res) {
            if (err) return done(err);
            else {
              cookie = res.header['set-cookie'];
              done();
            }
          });
      });
      it('send GET request', function(done) {
        request(app)
          .get(constants.ROUTE.REGISTER_BANNER)
          .set('cookie', cookie)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
      it('send POST request with params(register)', function(done) {
        request(app)
          .post(constants.ROUTE.REGISTER_BANNER)
          .set('cookie', cookie)
          .field({
            title: 'banner for Unit Test',
            bannerPosition: 1,
            link: 'http://localhost:3000/front/top',
            publish_datetime_end: "1999/12/31 23:59",
          })
          .attach('image', 'dev/demo.jpg', 'demo.jpg')
          .expect(302)
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
      it('send POST request with params(update)', function(done) {
        request(app)
          .post(constants.ROUTE.REGISTER_BANNER)
          .set('cookie', cookie)
          .field({
            bannerId: 1,
            title: 'banner for Unit Test',
            bannerPosition: 1,
            link: 'http://localhost:3000/front/top',
            publish_datetime_end: "1999/12/31 23:59",
          })
          .attach('image', 'dev/demo.jpg', 'demo.jpg')
          .expect(302)
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
      it('send POST request without params', function(done) {
        request(app)
          .post(constants.ROUTE.REGISTER_BANNER)
          .set('cookie', cookie)
          .expect(404)
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
    });
  });
  describe(constants.ROUTE.REGISTER_BANNER + '/validate', function() {
    describe('without login', function() {
      it('send GET request', function(done) {
        // 未ログイン状態なので302リダイレクトがレスポンスされる。
        request(app)
          .get(constants.ROUTE.REGISTER_BANNER + '/validate')
          .expect(302)
          .expect(function(res) {
            res.text.should.include(constants.ROUTE.LOGIN);
          })
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
      it('send POST request', function(done) {
        // 未ログイン状態なので302リダイレクトがレスポンスされる。
        request(app)
          .post(constants.ROUTE.REGISTER_BANNER + '/validate')
          .expect(302)
          .expect(function(res) {
            res.text.should.include(constants.ROUTE.LOGIN);
          })
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
    });
    describe('with login', function() {
      // Cookieを使用する
      let cookie = null;
      before('execute login before test', function(done) {
        // ログイン状態にする。
        request(app)
          .post(constants.ROUTE.LOGIN)
          .send({
            name: login_user,
            password: login_pass
          })
          .end(function(err, res) {
            if (err) return done(err);
            else {
              cookie = res.header['set-cookie'];
              done();
            }
          });
      });
      it('send GET request', function(done) {
        request(app)
          .get(constants.ROUTE.REGISTER_BANNER + '/validate')
          .set('cookie', cookie)
          .expect(404)
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
      it('send POST request with params', function(done) {
        request(app)
          .post(constants.ROUTE.REGISTER_BANNER + '/validate')
          .set('cookie', cookie)
          .field({
            title: 'banner for Unit Test',
            bannerPosition: 1,
            link: 'http://localhost:3000/front/top',
          })
          .attach('image', 'dev/demo.jpg', 'demo.jpg')
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
      it('send POST request without params', function(done) {
        request(app)
          .post(constants.ROUTE.REGISTER_BANNER + '/validate')
          .set('cookie', cookie)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
    });
  });
  describe(constants.ROUTE.PASSWORD, function() {
    describe('without login', function() {
      it('send GET request', function(done) {
        // 未ログイン状態なので302リダイレクトがレスポンスされる。
        request(app)
          .get(constants.ROUTE.PASSWORD)
          .expect(302)
          .expect(function(res) {
            res.text.should.include(constants.ROUTE.LOGIN);
          })
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
      it('send POST request', function(done) {
        // 未ログイン状態なので302リダイレクトがレスポンスされる。
        request(app)
          .post(constants.ROUTE.PASSWORD)
          .expect(302)
          .expect(function(res) {
            res.text.should.include(constants.ROUTE.LOGIN);
          })
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
    });
    describe('with login', function() {
      // Cookieを使用する
      let cookie = null;
      before('execute login before test', function(done) {
        // ログイン状態にする。
        request(app)
          .post(constants.ROUTE.LOGIN)
          .send({
            name: login_user,
            password: login_pass
          })
          .end(function(err, res) {
            if (err) return done(err);
            else {
              cookie = res.header['set-cookie'];
              done();
            }
          });
      });
      it('send GET request', function(done) {
        request(app)
          .get(constants.ROUTE.PASSWORD)
          .set('cookie', cookie)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
      it('send POST request with params', function(done) {
        request(app)
          .post(constants.ROUTE.PASSWORD)
          .set('cookie', cookie)
          .send({
            currentPass: 'user',
            newPass: 'user',
            newPass2: 'user',
          })
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
      it('send POST request without params', function(done) {
        request(app)
          .post(constants.ROUTE.PASSWORD)
          .set('cookie', cookie)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            else return done();
          });
      });
    });
  });
  describe(constants.ROUTE.API + '/[version]]/banners/position/[positionId]', function() {
    const version = '/v1';
    let positionId = '1';
    let endPoint = null;
    beforeEach('set end point to default before each test', function(done) {
      endPoint = constants.ROUTE.API + version +  '/banners/position/' + positionId;
      done();
    });
    it('send GET request with existing positionId', function(done) {
      request(app)
        .get(endPoint)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          else {
            res.text.should.not.equal(null);
            return done();
          }
        });
    });
    it('send GET request with non existing positionId', function(done) {
      positionId = '0';
      endPoint = constants.ROUTE.API + version +  '/banners/position/' + positionId;
      request(app)
        .get(endPoint)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          else {
            res.text.should.not.equal(null);
            return done();
          }
        });
    });
    it('send GET request with positionId which is invalid format', function(done) {
      positionId = 'test';
      endPoint = constants.ROUTE.API + version +  '/banners/position/' + positionId;
      request(app)
        .get(endPoint)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          else {
            const result = JSON.parse(res.text).result;
            result.should.equal('1');
            return done();
          }
        });
    });
    it('send POST request', function(done) {
      request(app)
        .post(endPoint)
        .expect(404)
        .end(function(err, res) {
          if (err) return done(err);
          else return done();
        });
    });
  });
  describe(constants.ROUTE.API + '/[version]]/log/access', function() {
    const version = '/v1';
    let endPoint = null;
    beforeEach('set end point to default before each test', function(done) {
      endPoint = constants.ROUTE.API + version +  '/log/access';
      done();
    });
    it('send GET request', function(done) {
      request(app)
        .get(endPoint)
        .expect(404)
        .end(function(err, res) {
          if (err) return done(err);
          else {
            return done();
          }
        });
    });
    it('send POST request with userId', function(done) {
      request(app)
        .post(endPoint)
        .send({
          userId: '12345678',
          target: 'トップ画面'
        })
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          else {
            const result = JSON.parse(res.text).result;
            result.should.equal('0');
            return done();
          }
        });
    });
    it('send POST request without userId', function(done) {
      request(app)
        .post(endPoint)
        .send({
          target: 'トップ画面'
        })
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          else {
            const result = JSON.parse(res.text).result;
            result.should.equal('0');
            return done();
          }
        });
    });
    it('send POST request with bannerLink', function(done) {
      request(app)
        .post(endPoint)
        .send({
          userId: '12345678',
          target: constants.API.ACCESS_LOG.DISPLAY_BANNER_LINK,
          bennrLink: 'https://www.google.co.jp/'
        })
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          else {
            const result = JSON.parse(res.text).result;
            result.should.equal('0');
            return done();
          }
        });
    });
  });
  describe(constants.ROUTE.FRONT_TOP, function() {
    const DATA = '3YhJHdu92Y=AzM10jM0l2cvBXZEVmchh2UxwWYvd0Ow1WYm82ah5WYo1jMl1WYOt2Yp5UZyFGaTFDbh92R7AXbhZCMzUTPx QXaz9GclRUZyFGaTFDbh92R7AXbhZSaqV2ahRXPxUWbh50ajlmTlJXYoNVMsF2bHtDctFmJx0zZsZUZyFGaTFDbh92R7AXb hZSMwgDM3EDMy0TZ0FGRsF2bHFDbh92R7AXbhZCMwAzM9QXaz9GclR0dv5UMsF2bHBDMwATN9QXaz9GclREbh92RxwWYvdE jhiehXaeP5J3bnVGdhNUMsF2bHtDctFmJMGK6Fep5rK44qO44VO44iK449UWbh5UMsF2bHtDctFmJ4YzN9QWSul2avl3Ow1 WYmADMwADM0UTPlNmbhxWYC5War9We7AXbhZCOyYDM50zbuJXZ0NWYyRnbvNkbpt2b5tDctFmJ4AjM2gTPv5kclR3YhJHdu 92QxIWdztDctFmJ1QzMyETPv5kclR3YhJHdu92QulWYttDctFmJwpmLvNmLhRXYkRHduB0cppWZrFGd9wWah1kclR';
    it('send GET request', function(done) {
      request(app)
        .get(constants.ROUTE.FRONT_TOP)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          else return done();
        });
    });
    it('send POST request with param', function(done) {
      request(app)
        .post(constants.ROUTE.FRONT_TOP)
        .send({data: DATA})
        .expect(302)
        .end(function(err, res) {
          if (err) return done(err);
          else return done();
        });
    });
    it('send POST request without param', function(done) {
      request(app)
        .post(constants.ROUTE.FRONT_TOP)
        .expect(302)
        .end(function(err, res) {
          if (err) return done(err);
          else return done();
        });
    });
  });
});
