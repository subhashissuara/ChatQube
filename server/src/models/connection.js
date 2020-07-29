import {OrderedMap} from 'immutable';
import { ObjectID } from 'mongodb';
import _ from 'lodash';

class Connection{
    constructor(app){
        this.app = app;
        this.connections = OrderedMap();
        this.modelDidLoad();
    }

    decodeMessage(msg){
        let messageObject = null
        try {
            messageObject = JSON.parse(msg);
        } catch (error) {
            console.log("Error in decoding message: ", msg)
        }
        return messageObject;
    }

    sendToMembers(userId, obj){
        
        const query = [
            {
                $match: {
                    members: {$all: [new ObjectID(userId)]}
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'members',
                    foreignField: '_id',
                    as: 'users'
                }
            },
            {
                $unwind: {
                    path: '$users'
                }
            },
            {
                $match: {
                    'users.online': {
                        $eq: true
                    }
                }
            },
            {
                $group: {
                    _id: "$users._id"
                }
            }
        ];

        const users = [];

        this.app.db.collection('channels').aggregate(query).toArray((err, results) => {
            if (err === null && results){
                _.each(results, (result) => {
                    const uid = _.toString(_.get(result, '_id'));
                    
                    if(uid){
                        users.push(uid);
                    }
                });

                // All connections of current user
                const memberConnections = this.connections.filter((conn) => _.includes(users, _.toString(_.get(conn, 'userId'))));

                if(memberConnections.size){
                    memberConnections.forEach((connection, key) => {
                        const ws = connection.ws;
                        this.send(ws, obj);
                    });
                }
            }
        });
    }

    
    sendAll(obj){
        // Send socket message to all clients
        this.connections.forEach((conn, key) => {
            const ws = conn.ws;
            this.send(ws, obj);
        })
    }

    send(ws, obj){
        const message = JSON.stringify(obj);
        ws.send(message);
    }

    doTheJob(socketId, msg){
        const action = _.get(msg, 'action');
        const payload = _.get(msg, 'payload');
        const userConnection = this.connections.get(socketId);

        switch (action) {
            case 'create_message':
                if(userConnection.isAuthenticated){
                    let messageObject = payload;
                    messageObject.userId = _.get(userConnection, 'userId');
                    this.app.models.message.create(messageObject).then((message) => {
                        const channelId = _.toString(_.get(message, 'channelId'));
                        
                        this.app.models.channel.load(channelId).then((channel) => {
                            const memberIds = _.get(channel, 'members', []);
                            _.each(memberIds, (memberId) => {
                                memberId = _.toString(memberId);
                                const memberConnection = this.connections.filter((c) => _.toString(c.userId) === memberId);
                                memberConnection.forEach((connection) => {
                                    const ws = connection.ws;
                                    this.send(ws, {
                                        action: 'message_added',
                                        payload: message,
                                    })
                                })
                            })
                        })

                        // Message created Succesfully
                    }).catch((err) => {
                        // Send back to message owner
                        const ws = userConnection.ws;
                        this.send(ws, {
                            action: create_message_error,
                            payload: payload,
                        });
                    });
                }
                break;
            case 'create_channel':
                let channel = payload;
                
                const userId = userConnection.userId; // Not directly using from channel object because someone can fake it
                channel.userId = userId;
                this.app.models.channel.create(channel).then((channelObject) => {
                    // Successfully created channel
                    // Add and send message to all users in new channel
                    let memberConnections = [];

                    const memberIds = _.get(channelObject, 'members', []);

                    // Fetch all users from memberIds
                    const query = {
                        _id: {$in: memberIds}
                    };
                    const queryOptions = {
                        _id: 1,
                        name: 1,
                        created: 1,
                    }
                    this.app.models.user.find(query, queryOptions).then((users) => {
                        channelObject.users = users;
                        _.each(memberIds, (id) => {
                            const userId = id.toString();
                            const memberConnection = this.connections.filter((conn) => `${conn.userId}` === userId);
                            
                            if(memberConnection.size){
                                memberConnection.forEach((conn) => {
                                    const ws = conn.ws;
                                    const obj = {
                                        action: 'channel_added',
                                        payload: channelObject,
                                    }
    
                                    // Send to ws client with matching userID from channel members
                                    this.send(ws, obj);
                                });
                            }
                        });
                        });
                    });
                break;

            case 'auth':
                const userTokenId = payload;
                const connectionAuth = this.connections.get(socketId);

                if(connectionAuth){
                    // Finding user using token ID and verifying
                    this.app.models.token.loadUserByTokenId(userTokenId).then((token) => {
                        const userId = token.userId;
                        connectionAuth.isAuthenticated = true;
                        connectionAuth.userId = `${userId}`;

                        this.connections = this.connections.set(socketId, connectionAuth);

                        // Tell client that it is verified
                        const obj = {
                            action: 'auth_success',
                            payload: "You are verified!",
                        };
                        this.send(connectionAuth.ws, obj);

                        const userIdString = _.toString(userId);
                        // Send all ws connections
                        this.sendToMembers(userIdString, {
                            action: 'user_online',
                            payload: userIdString,
                        });

                        /*this.sendAll({
                            action: 'user_online',
                            payload: userIdString,
                        });*/

                        this.app.models.user.updateUserStatus(userIdString, true);

                    }).catch((err) => {
                        const obj = {
                            action: 'auth_error',
                            payload: "Authentication Error! Your current token ID: " + userTokenId,
                        };
                        this.send(connectionAuth.ws, obj);
                    })
                }
                break;
        
            default:
                break;
        }
    }

    modelDidLoad(){
        this.app.wsServer.on('connection', (ws) => {
            const socketId = new ObjectID().toString();
            const clientConnection = {
                _id: `${socketId}`,
                ws: ws,
                userId: null,
                isAuthenticated: false,
            }

            // Save connections to cache
            this.connections = this.connections.set(socketId, clientConnection);
            
            // Listen all messages from websocket clients
            ws.on('message', (msg) => {
                const message = this.decodeMessage(msg);
                this.doTheJob(socketId, message);
            })
            ws.on('close', () => {
                const closeConnection = this.connections.get(socketId);
                const userId = _.toString(_.get(closeConnection, 'userId', null));
                // Remove socket of client from connections
                this.connections = this.connections.remove(socketId);

                if(userId){
                    // Find all ws clients with matching userId
                    const userConnections = this.connections.filter((conn) => _.toString(_.get(conn, 'userId')) === userId)
                    
                    if(userConnections.size == 0){
                        // This userId ws client is offline
                        this.sendToMembers(userId, {
                            action: 'user_offline',
                            payload: userId,
                        });

                        /*this.sendAll({
                            action: 'user_offline',
                            payload: userId,
                        });*/

                        // Update user status to DB

                        this.app.models.user.updateUserStatus(userId, false);
                    }
                }
            });
        });
    }
}

export default Connection;