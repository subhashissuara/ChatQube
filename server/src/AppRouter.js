import moment from 'moment'
import _, { toUpper } from 'lodash';

export const START_TIME = new Date();

class AppRouter{
    constructor(app){
        this.app = app;
        this.setupRouter = this.setupRouter.bind(this);
        this.setupRouter();
    }

    setupRouter(){
        const app = this.app;
        
        /*
        - @endpoint: /
        - @method: GET
        */

        app.get('/', (req, res, next) => {
            return res.json({ 
                started: moment(START_TIME).fromNow(),
            });
        });

        /*
        - @endpoint: /api/users
        - @method: POST
        */

        app.post('/api/users', (req, res, next) => {
            const body = req.body;
            app.models.user.create(body).then((user) => {
                _.unset(user, 'password');
                return res.status(200).json(user);
            }).catch((err) => {
                return res.status(503).json({error: err})
            });
            
        });

         /*
        - @endpoint: /api/users/me
        - @method: GET
        */

        app.get('/api/users/me', (req, res, next) => {
            let tokenId = req.get('authorization');
            if(!tokenId){
                // Get token from query
                tokenId = _.get(req, 'query.auth');
            }
            
            app.models.token.loadUserByTokenId(tokenId).then((token) => {
                _.unset(token, "user.password");
                return res.json(token);
            }).catch(err => {
                return res.status(401).json({
                    error: err
                });
            });
        });

        /*
        - @endpoint: /api/users/me
        - @method: GET
        */

        app.post('/api/users/search', (req, res, next) => {
            const keyword = _.get(req, 'body.search', '')
            app.models.user.search(keyword).then((results) => {
                return res.status(200).json(results);
            }).catch((err) => {
                return res.status(404).json({
                    error: 'User Not Found!'
                });
            });
        });

        /*
        - @endpoint: /api/users/:id
        - @method: GET
        */

        app.get('/api/users/:id', (req, res, next) => {
            const userId = _.get(req, 'params.id');
            app.models.user.load(userId).then((user) => {
                _.unset(user, 'password');
                return res.status(200).json(user);
            }).catch(err => {
                return res.status(404).json({
                    error: err,
                });
            });
        });

        /*
        - @endpoint: /api/users/login
        - @method: POST
        */

        app.post('/api/users/login', (req, res, next) => {
            const body = _.get(req, 'body');
            app.models.user.login(body).then((token) => {
                _.unset(token, 'user.password');
                return res.status(200).json(token);
            }).catch(err => {
                return res.status(401).json({
                    error: err,
                });
            });
        });

        /*
        - @endpoint: /api/me/logout
        - @method: GET
        */

        app.get('/api/me/logout', (req, res, next) => {
            let tokenId = req.get('authorization');
            if(!tokenId){
                // Get token from query
                tokenId = _.get(req, 'query.auth');
            }
            
            app.models.token.loadUserByTokenId(tokenId).then((token) => {
                app.models.token.logout(token);

                return res.status(200).json({
                    message: 'Logged Out Successfully!'
                })
            }).catch((err) => {
                return res.status(401).json({error: {message: 'Access Denied!'}});
            });
        })

        /*
        - @endpoint: /api/channels/:id
        - @method: GET
        */

        app.get('/api/channels/:id', (req, res, next) => {
            const channelId = _.get(req, 'params.id');
            if(!channelId){
                return res.status(404).json({error: {message: "Channel Not Found!"}});
            }

            app.models.channel.load(channelId).then((channel) => {
                // Fetch all users from membersIds
                const members = channel.members;
                const query = {
                    _id: {$in: members},
                }
                const options = {
                    _id: 1,
                    name: 1,
                    created: 1,
                }
                app.models.user.find(query, options).then((users) => {
                    channel.users = users;
                    return res.status(200).json(channel);
                }).catch((err) => {
                    return res.status(404).json({error: {message: "Channel Not Found!"}});
                });
                
            }).catch((err) => {
                return res.status(404).json({error: {message: "Channel Not Found!"}});
            });
        });

        /*
        - @endpoint: /api/me/channels/:id/messages
        - @method: GET
        */

       app.get('/api/channels/:id/messages', (req, res, next) => {
        let tokenId = req.get('authorization');

        if (!tokenId) {
            tokenId = _.get(req, 'query.auth');
        }

        app.models.token.loadUserByTokenId(tokenId).then((token) => {
            const userId = token.userId;

            // Ensure user is logged in & in channel members
            let filter = _.get(req, 'query.filter', null);
            if (filter) {
                filter = JSON.parse(filter);
                console.log(filter);
            }

            const channelId = _.toString(_.get(req, 'params.id'));
            const limit = _.get(filter, 'limit', 50);
            const offset = _.get(filter, 'offset', 0);

            // Load channel
            this.app.models.channel.load(channelId).then((c) => {
                const memberIds = _.get(c, 'members');
                const members = [];

                _.each(memberIds, (id) => {
                    members.push(_.toString(id));
                })

                if (!_.includes(members, _.toString(userId))) {
                    return res.status(401).json({error: {message: "Access denied"}});
                }

                this.app.models.message.getChannelMessages(channelId, limit, offset).then((messages) => {
                    return res.status(200).json(messages);
                }).catch((err) => {
                    return res.status(404).json({error: {message: "Not found."}});
                })
            }).catch((err) => {
                return res.status(404).json({error: {message: "Not found."}});
            })
        }).catch((err) => {
            return res.status(401).json({error: {message: "Access denied"}});
        });
    });
            
            

        /*
        - @endpoint: /api/me/channels
        - @method: GET
        */

        app.get('/api/me/channels', (req, res, next) => {
            let tokenId = req.get('authorization');
            if(!tokenId){
                // Get token from query
                tokenId = _.get(req, 'query.auth');
            }
            
            app.models.token.loadUserByTokenId(tokenId).then((token) => {
                _.unset(token, "user.password");
                const userId = token.userId;

                const query = [
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'members',
                            foreignField: '_id',
                            as: 'users',
                        }
                    },
                    {
                        $match: {
                            members: {$all: [userId]}
                        }
                    },
                    {
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
                                online: true,
                            },
                        }
                    },
                    {
                        $sort: {
                            updated: -1,
                            created: -1,
                        },
                    },
                    {
                        $limit: 50,
                    },
                ];

                app.models.channel.aggregate(query).then((channels) => {
                    return res.status(200).json(channels);
                }).catch((err) => {
                    console.log(err);
                    return res.status(404).json({error: {message: "Not Found!"}});
                })
            }).catch(err => {
                return res.status(401).json({
                    error: "Access Denied!",
                });
            });
        })

    }
}
export default AppRouter;