import {OrderedMap} from 'immutable';
import _ from 'lodash';
// import avatarDefault from './images/avatarDefault.png';
import Service from './service';
import Realtime from './realtime';


class Store{
    constructor(appComponent){
        this.app = appComponent;
        this.service = new Service()
        this.messages = new OrderedMap();
        this.channels = new OrderedMap();
        this.activeChannelId = null;
        this.token = this.getTokenFromLocalStorage();
        this.user = null;
        this.users = new OrderedMap();
        this.search = {
            users: new OrderedMap(),
        }
        this.realtime = new Realtime(this);
        this.fetchUserChannels();
    }

    updateUserOnLoad(){
        this.user = this.getUserFromLocalStorage();
    }

    isConnected(){
        return this.realtime.isConnected;
    }

    fetchUserChannels(){
        const userToken = this.getUserTokenId();
        if(userToken){
            const options = {
                headers: {
                    authorization: userToken,
                }
            }

            this.service.get('api/me/channels', options).then((response) => {
                const channels = response.data;
                _.each(channels, (channel) => {
                    this.realtime.onAddChannel(channel);
                });

                const firstChannelId = _.get(channels, '[0]._id', null);
                this.fetchChannelMessages(firstChannelId);

            }).catch((err) => {
                console.log("Error in fetching user channels!")
            })
        }
    }
    
    addUserToCache(user){
        user.avatar = this.loadUserAvatar(user);
        const id = _.toString(user._id);
        this.users = this.users.set(id, user);

        return user;
    }

    getUserTokenId(){
        return _.get(this.token, '_id', null);
    }

    loadUserAvatar(user){
        let userId = _.get(user, '_id');    
        return `https://api.adorable.io/avatars/100/${userId}.png`;
        
    }

    startSearchUsers(query = ''){
        // Query backend to get users from search query
        const data = {search: query}
        this.search.users = this.search.users.clear()
        this.service.post('api/users/search', data).then((response) => {
            const users = _.get(response, 'data', []);
            _.each(users, (user) => {
                // Caching User
                user.avatar = this.loadUserAvatar(user);
                const userId = _.toString(user._id);
                this.users = this.users.set(userId, user);
                this.search.users = this.search.users.set(userId, user);
            });
            this.update();
        }).catch((err) => {
            console.log("Error in Searching: ", err);
        })
    }

    setUserToken(accessToken){
        if(!accessToken){
            this.localStorage.removeItem('token');
            this.token = null;
            return;
        }
        this.token = accessToken;
        localStorage.setItem('token', JSON.stringify(accessToken));
    }

    clearCacheData(){
        this.channels = this.channels.clear();
        this.messages = this.messages.clear();
        this.users = this.users.clear();
    }

    signOut(){
        const userId = _.toString(_.get(this.user, '_id', null));
        const tokenId = _.get(this.token, '_id', null);
        // Logout from backend
        const options = {
            headers: {
                authorization: tokenId,
            }
        };

        this.service.get('api/me/logout', options);

        this.user = null;
        localStorage.removeItem('me');
        localStorage.removeItem('token');

        this.clearCacheData();

        if(userId){
            this.users = this.users.remove(userId)
        }
        this.update();
    }

    getTokenFromLocalStorage(){
        if(this.token){
            return this.token;
        }

        let token = null;

        const data = localStorage.getItem('token');
        if(data){
            try{
                token = JSON.parse(data);
            }
            catch(err){
                console.log(err);
            }
        }

        return token;
    }

    getUserFromLocalStorage(){
        let user = null;
        const data = localStorage.getItem('me');
        try {
            user = JSON.parse(data);
        } catch (error) {
            console.log(error)
        }

        if(user){
            // Connect to server and verify user exists
            const token = this.getTokenFromLocalStorage();
            const tokenId = _.get(token, '_id');
            const options = {
                headers: {
                    authorization: tokenId,
                }
            }
            this.service.get('api/users/me', options).then((response) => {
                const accessToken = response.data;
                const user = _.get(accessToken, 'user');
                this.setCurrentUser(user); // Causes error not mounted
                this.setUserToken(accessToken);
            }).catch((err) => {
                this.signOut();
            })
        }

        return user;
    }

    setCurrentUser(user){

        // Temporary Avatar
        user.avatar = this.loadUserAvatar(user);
        this.user = user;
        if(user){
            localStorage.setItem('me', JSON.stringify(user));

            const userId = `${user._id}`;
            this.users = this.users.set(userId, user);
            this.update(); 
        }
    }

    register(user){
        return new Promise((resolve, reject) => {
            this.service.post('api/users', user).then((response) => {
                return resolve(response.data);
            }).catch((err) => {
                return reject("Error Creating Account!");
            })
        });
    }

    login(email = null, password = null){
        const userEmail = _.toLower(email);
        
        const user = {
            email: userEmail,
            password: password,
        }

        return new Promise((resolve, reject) => {
            // Call backend to login the user
            this.service.post('api/users/login', user).then((response) => {
                // Success in Login
                const accessToken = _.get(response, 'data');
                const user = _.get(accessToken, 'user');

                this.setCurrentUser(user);
                this.setUserToken(accessToken);

                // Call realtime and connect this user to socket server
                this.realtime.connect();
                
                // Fetch User Channels
                this.fetchUserChannels();
            }).catch((err) => {
                const message = _.get(err, 'response.data.error.message', "Login Error!");
                return reject(message);
            })
        })
    }
    removeMemberFromChannel(channel = null, user = null){
        if(!channel || !user){
            return;
        }
        
        const userId = _.get(user, '_id');
        const channelId = _.get(channel, '_id')

        channel.members = channel.members.remove(userId);
        this.channels = this.channels.set(channelId, channel);
        this.update();

    }

    addUserToChannel(channelId, userId){
        const channel = this.channels.get(channelId);

        if(channel){
            channel.members = channel.members.set(userId, true);
            this.channels = this.channels.set(channelId, channel);
            this.update();
        }
    }

    getSearchUsers(){
        return this.search.users.valueSeq();
    }

    getCurrentUser(){
        return this.user;
    }

    fetchChannelMessages(channelId){
        let channel = this.channels.get(channelId);
        if (channel && !_.get(channel, 'isFetchedMessages')){
            const token = _.get(this.token, '_id');
            const options = {
                headers: {
                    authorization: token,
                }
            }

            this.service.get(`api/channels/${channelId}/messages`, options).then((response) => {
                channel.isFetchedMessages = true;
                const messages = response.data;
                _.each(messages, (message) => {
                    this.realtime.onAddMessage(message);
                });
                this.channels = this.channels.set(channelId, channel);
            }).catch((err) => {
                console.log("Error in Fetching Messages from Channel! ", err);
            });
        }
    }

    setActiveChannelId(id){
        this.activeChannelId = id;
        this.fetchChannelMessages(id);
        this.update();
    }

    getActiveChannel(){
        const channel = this.activeChannelId ? this.channels.get(this.activeChannelId) : this.channels.first();
        return channel;
    }

    setMessage(message, notify = false){
        const id = _.toString(_.get(message, '_id'));
        this.messages = this.messages.set(id, message);
        const channelId = _.toString(message.channelId);
        const channel = this.channels.get(channelId);

        if(channel){
            channel.messages = channel.messages.set(id, true);
            channel.lastMessage = _.get(message, 'body', '');
            channel.notify = notify;
            this.channels = this.channels.set(channelId, channel);
        }
        else{
            // Fetch channel info from server
            this.service.get(`api/channels/${channelId}`).then((response) => {
                const channel = _.get(response, 'data');
                /*const users = _.get(channel, 'users');
                _.each(users, (user) => {
                    this.addUserToCache(user);
                });*/

                this.realtime.onAddChannel(channel);
            })
        }
        this.update();
    }

    addMessage(id, message = {}){
        const user = this.getCurrentUser();
        message.user = user;

        this.messages = this.messages.set(id, message);
        const channelId = _.get(message, 'channelId');
        if(channelId){
            let channel = this.channels.get(channelId);
            
            channel.lastMessage = _.get(message, 'body', '');
            // Sending channel information to server
            const obj = {
                action: 'create_channel',
                payload: channel,
            }
            this.realtime.send(obj);

            // Send message to all members vis ws
            this.realtime.send({
                action: 'create_message',
                payload: message,
            })

            channel.messages = channel.messages.set(id, true);
            channel.isNew = false;
            this.channels = this.channels.set(channelId, channel);
        }
        this.update();
    }

    getMessages(){
        return this.messages.valueSeq();
    }

    getMessagesFromChannel(channel){
        let messages = new OrderedMap();
        if(channel){
            channel.messages.forEach((value, key) => {
                const message = this.messages.get(key);
                messages = messages.set(key, message);
            })
        }
        return messages.valueSeq();
    }

    getMembersFromChannel(channel){
        let members = new OrderedMap();

        if(channel){
            channel.members.forEach((value, key) => {
                const userId = `${key}`;
                const user = this.users.get(userId);
                const loggedUser = this.getCurrentUser();
                if(_.get(loggedUser, '_id') !== _.get(user, '_id')){
                    members = members.set(key, user);
                }
            })
        }

        return members.valueSeq();
    }

    onCreateNewChannel(channel = {}){
        const channelId = _.get(channel, '_id');
        this.addChannel(channelId, channel);
        this.setActiveChannelId(channelId);
    }

    addChannel(channelId, channel = {}){
        this.channels = this.channels.set(`${channelId}`, channel);
        this.update();
    }

    getChannels(){
        this.channels = this.channels.sort((a, b) => a.updated < b.updated);
        return this.channels.valueSeq();
    }

    update(){
        this.app.forceUpdate();
    }
}

export default Store;