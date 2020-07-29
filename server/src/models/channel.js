import _, { result } from 'lodash';
import {toString} from '../helper';
import { ObjectId } from 'mongodb';
import { OrderedMap } from 'immutable';

class Channel{
    constructor(app){
        this.app = app;
        this.channels = new OrderedMap();
    }

    aggregate(query){
        return new Promise((resolve, reject) => {
            this.app.db.collection('channels').aggregate(query).toArray((err, results) => {
                return err ? reject(err) : resolve(results);
            });
        });
    }

    find(query, project = null, options = null){
        return new Promise((resolve, reject) => {
            this.app.db.collection('channels').find(query, options).project(project).toArray((err, results) => {
                return err ? reject(err) : resolve(results);
            })
        });
    }

    load(id){
        return new Promise((resolve, reject) => {
            id = _.toString(id);
        
            // Find in cache
            const channelFromCache = this.channels.get(id);
            if(channelFromCache){
                    return resolve(channelFromCache);
            }

            // Otherwise find in DB
            this.findById(id).then((channel) => {
                this.channels = this.channels.set(id, channel);
                return resolve(channel);
            }).catch((err) => {
                return reject(err);
            })
        })
        
    }

    findById(id){
        return new Promise((resolve, reject) => {
            this.app.db.collection('channels').findOne({_id: new ObjectId(id)}, (err, result) => {
                if(err || !result){
                    return reject(err ? err : "ID Not Found!");
                }
                return resolve(result);
            });
        })
    }

    create(obj){
        return new Promise((resolve, reject) => {
            let id = toString(_.get(obj, '_id'));
            let idObject = id ? new ObjectId(id) : new ObjectId();

            let members = [];
            _.each(_.get(obj, 'members', []), (value, key) => {
                const memberObjectId = new ObjectId(key);
                members.push(memberObjectId);
            });

            let userIdObject = null;
            let userId = _.get(obj, 'userId', null);
            if(userId){
                userIdObject = new ObjectId(userId);
            }

            const channel = {
                _id: idObject,
                title: _.get(obj, 'title', ''),
                lastMessage: _.get(obj, 'lastMessage', ''),
                created: new Date(),
                userId: userIdObject,
                members: members,
            } 

            this.app.db.collection('channels').insertOne(channel, (err, info) => {
                if(!err){
                    const channelId = channel._id.toString();
                    this.channels = this.channels.set(channelId, channel);
                }
                return err ? reject(err) : resolve(channel);
            });
        });
        
    }
}

export default Channel;