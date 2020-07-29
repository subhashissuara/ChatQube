'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _mongodb = require('mongodb');

var _immutable = require('immutable');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Token = function () {
    function Token(app) {
        _classCallCheck(this, Token);

        this.app = app;
        this.tokens = new _immutable.OrderedMap();
    }

    _createClass(Token, [{
        key: 'logout',
        value: function logout(token) {
            var _this = this;

            return new Promise(function (resolve, reject) {
                var tokenId = _lodash2.default.toString(token._id);

                // Remove token from cache
                _this.tokens = _this.tokens.remove(tokenId);

                // Delete token from DB
                _this.app.db.collection('tokens').deleteOne({
                    _id: new _mongodb.ObjectId(tokenId)
                }, function (err, info) {
                    return err ? reject(err) : resolve(info);
                });
            });
        }
    }, {
        key: 'loadUserByTokenId',
        value: function loadUserByTokenId(id) {
            var _this2 = this;

            return new Promise(function (resolve, reject) {
                _this2.load(id).then(function (token) {
                    var userId = '' + token.userId;
                    _this2.app.models.user.load(userId).then(function (user) {
                        token.user = user;
                        return resolve(token);
                    }).catch(function (err) {
                        return reject(err);
                    });
                }).catch(function (err) {
                    return reject(err);
                });
            });
        }
    }, {
        key: 'load',
        value: function load() {
            var _this3 = this;

            var id = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

            id = '' + id;
            return new Promise(function (resolve, reject) {

                // Checking cache for token
                var tokenFromCache = _this3.tokens.get(id);
                if (tokenFromCache) {
                    return resolve(tokenFromCache);
                }

                _this3.findTokenById(id, function (err, token) {
                    if (!err && token) {
                        var tokenId = '' + token._id;
                        _this3.tokens = _this3.tokens.set(id, token);
                    }
                    return err ? reject(err) : resolve(token);
                });
            });
        }
    }, {
        key: 'findTokenById',
        value: function findTokenById(id) {
            var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};

            var idObject = new _mongodb.ObjectId(id);
            var query = { _id: idObject };
            this.app.db.collection('tokens').findOne(query, function (err, result) {
                if (err || !result) {
                    return callback({ message: "Not Found!" }, null);
                }

                return callback(null, result);
            });
        }
    }, {
        key: 'create',
        value: function create(userId) {
            var _this4 = this;

            var expireTime = null;
            var token = {
                userId: userId,
                created: new Date(),
                expired: null
            };

            return new Promise(function (resolve, reject) {
                _this4.app.db.collection('tokens').insertOne(token, function (err, info) {
                    return err ? reject(err) : resolve(token);
                });
            });
        }
    }]);

    return Token;
}();

exports.default = Token;
//# sourceMappingURL=token.js.map