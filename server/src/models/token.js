import _ from 'lodash';
import {ObjectId} from 'mongodb';
import {OrderedMap} from 'immutable';

class Token{
    constructor(app){
        this.app = app;
        this.tokens = new OrderedMap();
    }

    logout(token){
        return new Promise((resolve, reject) => {
            const tokenId = _.toString(token._id);

            // Remove token from cache
            this.tokens = this.tokens.remove(tokenId);

            // Delete token from DB
            this.app.db.collection('tokens').deleteOne({
                _id: new ObjectId(tokenId)
            }, (err, info) => {
                return err ? reject(err) : resolve(info);
            });
        })
    }

    loadUserByTokenId(id){
        return new Promise((resolve, reject) => {
            this.load(id).then((token) => {
                const userId = `${token.userId}`;
                this.app.models.user.load(userId).then((user) => {
                    token.user = user;
                    return resolve(token);
                }).catch((err) => {
                    return reject(err);
                })
            }).catch((err) => {
                return reject(err);
            })
        })
    }

    load(id = null){
        id = `${id}`
        return new Promise((resolve, reject) => {

            // Checking cache for token
            const tokenFromCache = this.tokens.get(id);
            if(tokenFromCache){
                return resolve(tokenFromCache);
            }

            this.findTokenById(id, (err, token) => {
                if(!err && token){
                    const tokenId = `${token._id}`;
                    this.tokens = this.tokens.set(id, token);
                }
                return err ? reject(err) : resolve(token);
            })
        })
    }

    findTokenById(id, callback = () => {}){
        const idObject = new ObjectId(id);
        const query = {_id: idObject};
        this.app.db.collection('tokens').findOne(query, (err, result) => {
            if(err || !result){
                return callback({message: "Not Found!"}, null);
            }

            return callback(null, result);
        })
    }

    create(userId){
        const expireTime = null;
        const token = {
            userId: userId,
            created: new Date(),
            expired: null,
        }
        
        return new Promise((resolve, reject) => {
            this.app.db.collection('tokens').insertOne(token, (err, info) => {
                return err ? reject(err) : resolve(token);
            })
        })
    }
}

export default Token;