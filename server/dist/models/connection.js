'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _immutable = require('immutable');

var _mongodb = require('mongodb');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Connection = function () {
    function Connection(app) {
        _classCallCheck(this, Connection);

        this.app = app;
        this.connections = (0, _immutable.OrderedMap)();
        this.modelDidLoad();
    }

    _createClass(Connection, [{
        key: 'decodeMessage',
        value: function decodeMessage(msg) {
            var messageObject = null;
            try {
                messageObject = JSON.parse(msg);
            } catch (error) {
                console.log("Error in decoding message: ", msg);
            }
            return messageObject;
        }
    }, {
        key: 'sendToMembers',
        value: function sendToMembers(userId, obj) {
            var _this = this;

            var query = [{
                $match: {
                    members: { $all: [new _mongodb.ObjectID(userId)] }
                }
            }, {
                $lookup: {
                    from: 'users',
                    localField: 'members',
                    foreignField: '_id',
                    as: 'users'
                }
            }, {
                $unwind: {
                    path: '$users'
                }
            }, {
                $match: {
                    'users.online': {
                        $eq: true
                    }
                }
            }, {
                $group: {
                    _id: "$users._id"
                }
            }];

            var users = [];

            this.app.db.collection('channels').aggregate(query).toArray(function (err, results) {
                if (err === null && results) {
                    _lodash2.default.each(results, function (result) {
                        var uid = _lodash2.default.toString(_lodash2.default.get(result, '_id'));

                        if (uid) {
                            users.push(uid);
                        }
                    });

                    // All connections of current user
                    var memberConnections = _this.connections.filter(function (conn) {
                        return _lodash2.default.includes(users, _lodash2.default.toString(_lodash2.default.get(conn, 'userId')));
                    });

                    if (memberConnections.size) {
                        memberConnections.forEach(function (connection, key) {
                            var ws = connection.ws;
                            _this.send(ws, obj);
                        });
                    }
                }
            });
        }
    }, {
        key: 'sendAll',
        value: function sendAll(obj) {
            var _this2 = this;

            // Send socket message to all clients
            this.connections.forEach(function (conn, key) {
                var ws = conn.ws;
                _this2.send(ws, obj);
            });
        }
    }, {
        key: 'send',
        value: function send(ws, obj) {
            var message = JSON.stringify(obj);
            ws.send(message);
        }
    }, {
        key: 'doTheJob',
        value: function doTheJob(socketId, msg) {
            var _this3 = this;

            var action = _lodash2.default.get(msg, 'action');
            var payload = _lodash2.default.get(msg, 'payload');
            var userConnection = this.connections.get(socketId);

            switch (action) {
                case 'create_message':
                    if (userConnection.isAuthenticated) {
                        var messageObject = payload;
                        messageObject.userId = _lodash2.default.get(userConnection, 'userId');
                        this.app.models.message.create(messageObject).then(function (message) {
                            var channelId = _lodash2.default.toString(_lodash2.default.get(message, 'channelId'));

                            _this3.app.models.channel.load(channelId).then(function (channel) {
                                var memberIds = _lodash2.default.get(channel, 'members', []);
                                _lodash2.default.each(memberIds, function (memberId) {
                                    memberId = _lodash2.default.toString(memberId);
                                    var memberConnection = _this3.connections.filter(function (c) {
                                        return _lodash2.default.toString(c.userId) === memberId;
                                    });
                                    memberConnection.forEach(function (connection) {
                                        var ws = connection.ws;
                                        _this3.send(ws, {
                                            action: 'message_added',
                                            payload: message
                                        });
                                    });
                                });
                            });

                            // Message created Succesfully
                        }).catch(function (err) {
                            // Send back to message owner
                            var ws = userConnection.ws;
                            _this3.send(ws, {
                                action: create_message_error,
                                payload: payload
                            });
                        });
                    }
                    break;
                case 'create_channel':
                    var channel = payload;

                    var userId = userConnection.userId; // Not directly using from channel object because someone can fake it
                    channel.userId = userId;
                    this.app.models.channel.create(channel).then(function (channelObject) {
                        // Successfully created channel
                        // Add and send message to all users in new channel
                        var memberConnections = [];

                        var memberIds = _lodash2.default.get(channelObject, 'members', []);

                        // Fetch all users from memberIds
                        var query = {
                            _id: { $in: memberIds }
                        };
                        var queryOptions = {
                            _id: 1,
                            name: 1,
                            created: 1
                        };
                        _this3.app.models.user.find(query, queryOptions).then(function (users) {
                            channelObject.users = users;
                            _lodash2.default.each(memberIds, function (id) {
                                var userId = id.toString();
                                var memberConnection = _this3.connections.filter(function (conn) {
                                    return '' + conn.userId === userId;
                                });

                                if (memberConnection.size) {
                                    memberConnection.forEach(function (conn) {
                                        var ws = conn.ws;
                                        var obj = {
                                            action: 'channel_added',
                                            payload: channelObject

                                            // Send to ws client with matching userID from channel members
                                        };_this3.send(ws, obj);
                                    });
                                }
                            });
                        });
                    });
                    break;

                case 'auth':
                    var userTokenId = payload;
                    var connectionAuth = this.connections.get(socketId);

                    if (connectionAuth) {
                        // Finding user using token ID and verifying
                        this.app.models.token.loadUserByTokenId(userTokenId).then(function (token) {
                            var userId = token.userId;
                            connectionAuth.isAuthenticated = true;
                            connectionAuth.userId = '' + userId;

                            _this3.connections = _this3.connections.set(socketId, connectionAuth);

                            // Tell client that it is verified
                            var obj = {
                                action: 'auth_success',
                                payload: "You are verified!"
                            };
                            _this3.send(connectionAuth.ws, obj);

                            var userIdString = _lodash2.default.toString(userId);
                            // Send all ws connections
                            _this3.sendToMembers(userIdString, {
                                action: 'user_online',
                                payload: userIdString
                            });

                            /*this.sendAll({
                                action: 'user_online',
                                payload: userIdString,
                            });*/

                            _this3.app.models.user.updateUserStatus(userIdString, true);
                        }).catch(function (err) {
                            var obj = {
                                action: 'auth_error',
                                payload: "Authentication Error! Your current token ID: " + userTokenId
                            };
                            _this3.send(connectionAuth.ws, obj);
                        });
                    }
                    break;

                default:
                    break;
            }
        }
    }, {
        key: 'modelDidLoad',
        value: function modelDidLoad() {
            var _this4 = this;

            this.app.wsServer.on('connection', function (ws) {
                var socketId = new _mongodb.ObjectID().toString();
                var clientConnection = {
                    _id: '' + socketId,
                    ws: ws,
                    userId: null,
                    isAuthenticated: false

                    // Save connections to cache
                };_this4.connections = _this4.connections.set(socketId, clientConnection);

                // Listen all messages from websocket clients
                ws.on('message', function (msg) {
                    var message = _this4.decodeMessage(msg);
                    _this4.doTheJob(socketId, message);
                });
                ws.on('close', function () {
                    var closeConnection = _this4.connections.get(socketId);
                    var userId = _lodash2.default.toString(_lodash2.default.get(closeConnection, 'userId', null));
                    // Remove socket of client from connections
                    _this4.connections = _this4.connections.remove(socketId);

                    if (userId) {
                        // Find all ws clients with matching userId
                        var userConnections = _this4.connections.filter(function (conn) {
                            return _lodash2.default.toString(_lodash2.default.get(conn, 'userId')) === userId;
                        });

                        if (userConnections.size == 0) {
                            // This userId ws client is offline
                            _this4.sendToMembers(userId, {
                                action: 'user_offline',
                                payload: userId
                            });

                            /*this.sendAll({
                                action: 'user_offline',
                                payload: userId,
                            });*/

                            // Update user status to DB

                            _this4.app.models.user.updateUserStatus(userId, false);
                        }
                    }
                });
            });
        }
    }]);

    return Connection;
}();

exports.default = Connection;
//# sourceMappingURL=connection.js.map