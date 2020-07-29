'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _helper = require('../helper');

var _bcrypt = require('bcrypt');

var _bcrypt2 = _interopRequireDefault(_bcrypt);

var _mongodb = require('mongodb');

var _immutable = require('immutable');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var saltRounds = 10;

var User = function () {
    function User(app) {
        _classCallCheck(this, User);

        this.app = app;
        this.users = new _immutable.OrderedMap();
    }

    _createClass(User, [{
        key: 'updateUserStatus',
        value: function updateUserStatus(userId) {
            var _this = this;

            var isOnline = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

            return new Promise(function (resolve, reject) {
                // Update status of user in cache this.users
                _this.users = _this.users.update(userId, function (user) {
                    if (user) {
                        user.online = isOnline;
                    }

                    return user;
                });

                var query = {
                    _id: new _mongodb.ObjectId(userId)
                };

                var update = {
                    $set: { online: isOnline }
                };

                _this.app.db.collection('users').updateMany(query, update, function (err, info) {
                    return err ? reject(err) : resolve(info);
                });
            });
        }
    }, {
        key: 'find',
        value: function find() {
            var query = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

            var _this2 = this;

            var project = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
            var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

            return new Promise(function (resolve, reject) {
                _this2.app.db.collection('users').find(query, options).project(project).toArray(function (err, users) {
                    return err ? reject(err) : resolve(users);
                });
            });
        }
    }, {
        key: 'search',
        value: function search() {
            var _this3 = this;

            var q = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";

            return new Promise(function (resolve, reject) {
                var regex = new RegExp(q, 'i');
                var query = {
                    $or: [{ name: { $regex: regex } }, { email: { $regex: regex } }]
                };
                _this3.app.db.collection('users').find(query, {
                    projection: {
                        _id: true,
                        name: true,
                        created: true
                    }
                }).toArray(function (err, results) {
                    if (err || !results || !results.length) {
                        return reject({ message: "User Not Found!" });
                    }
                    return resolve(results);
                });
            });
        }
    }, {
        key: 'login',
        value: function login(user) {
            var _this4 = this;

            var email = _lodash2.default.get(user, 'email', '');
            var password = _lodash2.default.get(user, 'password', '');

            return new Promise(function (resolve, reject) {
                if (!password || !email || !(0, _helper.isEmail)(email)) {
                    return reject({ message: "Login Error Occurred." });
                }
                _this4.findUserByEmail(email, function (err, result) {
                    if (err) {
                        return reject({ message: "Login Error." });
                    }

                    // User Found & Compare Password
                    var hashPassword = _lodash2.default.get(result, 'password');
                    var isPassword = _bcrypt2.default.compareSync(password, hashPassword);

                    if (!isPassword) {
                        return reject({ message: "Login Error." });
                    }

                    // Token for User after password match
                    var userId = result._id;
                    _this4.app.models.token.create(userId).then(function (token) {
                        token.user = result;
                        return resolve(token);
                    }).catch(function (err) {
                        return reject({ message: "Login Error." });
                    });
                });
            });
        }
    }, {
        key: 'findUserByEmail',
        value: function findUserByEmail(email) {
            var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};

            this.app.db.collection('users').findOne({ email: email }, function (err, result) {
                if (err || !result) {
                    return callback({ message: "User Not Found!" });
                }
                return callback(null, result);
            });
        }
    }, {
        key: 'load',
        value: function load(id) {
            var _this5 = this;

            return new Promise(function (resolve, reject) {
                // Search in cache to avoid db query
                var userInCache = _this5.users.get(id);
                if (userInCache) {
                    return resolve(userInCache);
                }

                _this5.findUserById(id, function (err, user) {
                    if (!err && user) {
                        _this5.users = _this5.users.set(id, user);
                    }
                    return err ? reject(err) : resolve(user);
                });
            });
        }
    }, {
        key: 'findUserById',
        value: function findUserById(id) {
            var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};

            if (!id) {
                return callback({ message: "User Not Found!" }, null);
            }
            var userId = new _mongodb.ObjectId(id);
            this.app.db.collection('users').findOne({ _id: userId }, function (err, result) {
                if (err || !result) {
                    return callback({ message: "User Not Found!" });
                }
                return callback(null, result);
            });
        }
    }, {
        key: 'beforeSave',
        value: function beforeSave(user) {
            var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};

            // Validation of user before saving

            var errors = [];

            var fields = ['name', 'email', 'password'];
            var validations = {
                name: {
                    errorMessage: 'Name is required.',
                    do: function _do() {
                        var name = _lodash2.default.get(user, 'name', '');
                        return name.length;
                    }
                },
                email: {
                    errorMessage: 'Check your Email ID & Try Again',
                    do: function _do() {
                        var email = _lodash2.default.get(user, 'email', '');
                        if (!email.length || !(0, _helper.isEmail)(email)) {
                            return false;
                        }

                        return true;
                    }
                },
                password: {
                    errorMessage: 'Password is required & should be more than 4 characters.',
                    do: function _do() {
                        var password = _lodash2.default.get(user, 'password', '');
                        if (!password.length || password.length < 4) {
                            return false;
                        }
                        return true;
                    }
                }
            };
            fields.forEach(function (field) {
                var fieldValidation = _lodash2.default.get(validations, field);

                if (fieldValidation) {
                    var isValid = fieldValidation.do();
                    var errMsg = fieldValidation.errorMessage;

                    if (!isValid) {
                        errors.push(errMsg);
                    }
                }
            });

            if (errors.length) {
                var err = _lodash2.default.join(errors, ', ');
                return callback(err, null);
            }

            var email = _lodash2.default.toLower(_lodash2.default.trim(_lodash2.default.get(user, 'email', '')));
            this.app.db.collection('users').findOne({ email: email }, function (err, result) {
                if (err || result) {
                    return callback({ message: "Email already exists!" }, null);
                }

                // Successfully Checked
                var password = _lodash2.default.get(user, 'password');
                var hashPassword = _bcrypt2.default.hashSync(password, saltRounds);

                var userFormatted = {
                    name: '' + _lodash2.default.trim(_lodash2.default.get(user, 'name')),
                    email: email,
                    password: hashPassword,
                    created: new Date()
                };

                return callback(null, userFormatted);
            });
        }
    }, {
        key: 'create',
        value: function create(user) {
            var _this6 = this;

            var db = this.app.db;
            return new Promise(function (resolve, reject) {
                _this6.beforeSave(user, function (err, user) {
                    if (err) {
                        return reject(err);
                    }

                    // Add user to db
                    db.collection('users').insertOne(user, function (err, info) {
                        if (err) {
                            return reject({ message: "An error saving user." });
                        }

                        var userId = _lodash2.default.get(user, '_id').toString();

                        _this6.users = _this6.users.set(userId, user);
                        return resolve(user);
                    });
                });
            });
        }
    }]);

    return User;
}();

exports.default = User;
//# sourceMappingURL=user.js.map