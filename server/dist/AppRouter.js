'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.START_TIME = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var START_TIME = exports.START_TIME = new Date();

var AppRouter = function () {
    function AppRouter(app) {
        _classCallCheck(this, AppRouter);

        this.app = app;
        this.setupRouter = this.setupRouter.bind(this);
        this.setupRouter();
    }

    _createClass(AppRouter, [{
        key: 'setupRouter',
        value: function setupRouter() {
            var _this = this;

            var app = this.app;

            // /*
            // - @endpoint: /
            // - @method: GET
            // */

            // app.get('/', (req, res, next) => {
            //     return res.json({ 
            //         started: moment(START_TIME).fromNow(),
            //     });
            // });

            /*
            - @endpoint: /api/users
            - @method: POST
            */

            app.post('/api/users', function (req, res, next) {
                var body = req.body;
                app.models.user.create(body).then(function (user) {
                    _lodash2.default.unset(user, 'password');
                    return res.status(200).json(user);
                }).catch(function (err) {
                    return res.status(503).json({ error: err });
                });
            });

            /*
            - @endpoint: /api/users/me
            - @method: GET
            */

            app.get('/api/users/me', function (req, res, next) {
                var tokenId = req.get('authorization');
                if (!tokenId) {
                    // Get token from query
                    tokenId = _lodash2.default.get(req, 'query.auth');
                }

                app.models.token.loadUserByTokenId(tokenId).then(function (token) {
                    _lodash2.default.unset(token, "user.password");
                    return res.json(token);
                }).catch(function (err) {
                    return res.status(401).json({
                        error: err
                    });
                });
            });

            /*
            - @endpoint: /api/users/me
            - @method: GET
            */

            app.post('/api/users/search', function (req, res, next) {
                var keyword = _lodash2.default.get(req, 'body.search', '');
                app.models.user.search(keyword).then(function (results) {
                    return res.status(200).json(results);
                }).catch(function (err) {
                    return res.status(404).json({
                        error: 'User Not Found!'
                    });
                });
            });

            /*
            - @endpoint: /api/users/:id
            - @method: GET
            */

            app.get('/api/users/:id', function (req, res, next) {
                var userId = _lodash2.default.get(req, 'params.id');
                app.models.user.load(userId).then(function (user) {
                    _lodash2.default.unset(user, 'password');
                    return res.status(200).json(user);
                }).catch(function (err) {
                    return res.status(404).json({
                        error: err
                    });
                });
            });

            /*
            - @endpoint: /api/users/login
            - @method: POST
            */

            app.post('/api/users/login', function (req, res, next) {
                var body = _lodash2.default.get(req, 'body');
                app.models.user.login(body).then(function (token) {
                    _lodash2.default.unset(token, 'user.password');
                    return res.status(200).json(token);
                }).catch(function (err) {
                    return res.status(401).json({
                        error: err
                    });
                });
            });

            /*
            - @endpoint: /api/me/logout
            - @method: GET
            */

            app.get('/api/me/logout', function (req, res, next) {
                var tokenId = req.get('authorization');
                if (!tokenId) {
                    // Get token from query
                    tokenId = _lodash2.default.get(req, 'query.auth');
                }

                app.models.token.loadUserByTokenId(tokenId).then(function (token) {
                    app.models.token.logout(token);

                    return res.status(200).json({
                        message: 'Logged Out Successfully!'
                    });
                }).catch(function (err) {
                    return res.status(401).json({ error: { message: 'Access Denied!' } });
                });
            });

            /*
            - @endpoint: /api/channels/:id
            - @method: GET
            */

            app.get('/api/channels/:id', function (req, res, next) {
                var channelId = _lodash2.default.get(req, 'params.id');
                if (!channelId) {
                    return res.status(404).json({ error: { message: "Channel Not Found!" } });
                }

                app.models.channel.load(channelId).then(function (channel) {
                    // Fetch all users from membersIds
                    var members = channel.members;
                    var query = {
                        _id: { $in: members }
                    };
                    var options = {
                        _id: 1,
                        name: 1,
                        created: 1
                    };
                    app.models.user.find(query, options).then(function (users) {
                        channel.users = users;
                        return res.status(200).json(channel);
                    }).catch(function (err) {
                        return res.status(404).json({ error: { message: "Channel Not Found!" } });
                    });
                }).catch(function (err) {
                    return res.status(404).json({ error: { message: "Channel Not Found!" } });
                });
            });

            /*
            - @endpoint: /api/me/channels/:id/messages
            - @method: GET
            */

            app.get('/api/channels/:id/messages', function (req, res, next) {
                var tokenId = req.get('authorization');

                if (!tokenId) {
                    tokenId = _lodash2.default.get(req, 'query.auth');
                }

                app.models.token.loadUserByTokenId(tokenId).then(function (token) {
                    var userId = token.userId;

                    // Ensure user is logged in & in channel members
                    var filter = _lodash2.default.get(req, 'query.filter', null);
                    if (filter) {
                        filter = JSON.parse(filter);
                    }

                    var channelId = _lodash2.default.toString(_lodash2.default.get(req, 'params.id'));
                    var limit = _lodash2.default.get(filter, 'limit', 50);
                    var offset = _lodash2.default.get(filter, 'offset', 0);

                    // Load channel
                    _this.app.models.channel.load(channelId).then(function (c) {
                        var memberIds = _lodash2.default.get(c, 'members');
                        var members = [];

                        _lodash2.default.each(memberIds, function (id) {
                            members.push(_lodash2.default.toString(id));
                        });

                        if (!_lodash2.default.includes(members, _lodash2.default.toString(userId))) {
                            return res.status(401).json({ error: { message: "Access denied" } });
                        }

                        _this.app.models.message.getChannelMessages(channelId, limit, offset).then(function (messages) {
                            return res.status(200).json(messages);
                        }).catch(function (err) {
                            return res.status(404).json({ error: { message: "Not found." } });
                        });
                    }).catch(function (err) {
                        return res.status(404).json({ error: { message: "Not found." } });
                    });
                }).catch(function (err) {
                    return res.status(401).json({ error: { message: "Access denied" } });
                });
            });

            /*
            - @endpoint: /api/me/channels
            - @method: GET
            */

            app.get('/api/me/channels', function (req, res, next) {
                var tokenId = req.get('authorization');
                if (!tokenId) {
                    // Get token from query
                    tokenId = _lodash2.default.get(req, 'query.auth');
                }

                app.models.token.loadUserByTokenId(tokenId).then(function (token) {
                    _lodash2.default.unset(token, "user.password");
                    var userId = token.userId;

                    var query = [{
                        $lookup: {
                            from: 'users',
                            localField: 'members',
                            foreignField: '_id',
                            as: 'users'
                        }
                    }, {
                        $match: {
                            members: { $all: [userId] }
                        }
                    }, {
                        $project: {
                            _id: true,
                            title: true,
                            lastMessage: true,
                            created: true,
                            updated: true,
                            userId: true,
                            members: true,
                            users: {
                                _id: true,
                                name: true,
                                created: true,
                                online: true
                            }
                        }
                    }, {
                        $sort: {
                            updated: -1,
                            created: -1
                        }
                    }, {
                        $limit: 50
                    }];

                    app.models.channel.aggregate(query).then(function (channels) {
                        return res.status(200).json(channels);
                    }).catch(function (err) {
                        return res.status(404).json({ error: { message: "Not Found!" } });
                    });
                }).catch(function (err) {
                    return res.status(401).json({
                        error: "Access Denied!"
                    });
                });
            });
        }
    }]);

    return AppRouter;
}();

exports.default = AppRouter;
//# sourceMappingURL=AppRouter.js.map