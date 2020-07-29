import _ from 'lodash';
import {isEmail} from '../helper';
import bcrypt from 'bcrypt';
import {ObjectId} from 'mongodb';
import {OrderedMap} from 'immutable';

const saltRounds = 10;

class User {
    constructor(app){
        this.app = app;
        this.users = new OrderedMap;
    }

    updateUserStatus(userId, isOnline = false){
        return new Promise((resolve, reject) => {
            // Update status of user in cache this.users
            this.users = this.users.update(userId, (user) => {
                if(user) {
                    user.online = isOnline;
                }
                
                return user;
            })

            const query = {
                _id: new ObjectId(userId),
            };

            const update = {
                $set: {online: isOnline},
            };
            
            this.app.db.collection('users').updateMany(query, update, (err, info) => {
                return err ? reject(err) : resolve(info);
            });
        })
    }

    find(query = {}, project = {}, options = {}){
        return new Promise((resolve, reject) => {
            this.app.db.collection('users').find(query, options).project(project).toArray((err, users) => {
                return err ? reject(err) : resolve(users);
            })
        })
    }

    search(q = ""){
        return new Promise((resolve, reject) => {
            const regex = new RegExp(q, 'i');
            const query = {
                $or: [
                    {name: {$regex: regex}},
                    {email: {$regex: regex}}
                ],
            };
            this.app.db.collection('users').find(query, {
                projection: 
                {
                    _id: true, 
                    name: true, 
                    created: true, 
                }
            }).toArray((err, results) => {
                if(err || !results || !results.length){
                    return reject({message: "User Not Found!"})
                }
                return resolve(results);
            });
        });
    }

    login(user){
        const email = _.get(user, 'email', '');
        const password = _.get(user, 'password', '');

        return new Promise((resolve, reject) => {
            if(!password || !email || !isEmail(email)){
                return reject({message: "Login Error Occurred."})
            }
            this.findUserByEmail(email, (err, result) => {
                if(err){
                    return reject({message: "Login Error."})
                }

                // User Found & Compare Password
                const hashPassword = _.get(result, 'password');
                const isPassword = bcrypt.compareSync(password, hashPassword);

                if(!isPassword){
                    return reject({message: "Login Error."})
                }

                // Token for User after password match
                const userId = result._id;
                this.app.models.token.create(userId).then((token) => {
                    token.user = result;
                    return resolve(token);
                }).catch(err => {
                    return reject({message: "Login Error."});
                });
            });
        })
    }

    findUserByEmail(email, callback = () => {}){
        this.app.db.collection('users').findOne({email: email}, (err, result) => {
            if(err || !result){
                return callback({message: "User Not Found!"});
            }
            return callback(null, result);
        })
    }
    load(id){
        return new Promise((resolve, reject) => {
            // Search in cache to avoid db query
            const userInCache = this.users.get(id);
            if(userInCache){
                return resolve(userInCache);
            }
            
            this.findUserById(id, (err, user) => {
                if(!err && user){
                    this.users = this.users.set(id, user);
                }
                return err ? reject(err) : resolve(user);
            })
        })
    }

    findUserById(id, callback = () => {}){
        if(!id){
            return callback({message: "User Not Found!"}, null);
        }
        const userId = new ObjectId(id)
        this.app.db.collection('users').findOne({_id: userId}, (err, result) => {
            if(err || !result){
                return callback({message: "User Not Found!"});
            }
            return callback(null, result);
        })
    }

    beforeSave(user, callback = () => {}){
        // Validation of user before saving

        let errors = [];

        const fields = ['name', 'email', 'password'];
        const validations = {
            name: {
                errorMessage: 'Name is required.',
                do: () => {
                    const name = _.get(user, 'name', '');
                    return name.length;
                }
            },
            email: {
                errorMessage: 'Check your Email ID & Try Again',
                do: () => {
                    const email = _.get(user, 'email', '');
                    if(!email.length || !isEmail(email)){
                        return false;
                    }

                    return true;
                }
            },
            password: {
                errorMessage: 'Password is required & should be more than 4 characters.',
                do: () => {
                    const password = _.get(user, 'password', '');
                    if(!password.length || password.length < 4){
                        return false;
                    }
                    return true;
                }
            },
        }
        fields.forEach((field) => {
            const fieldValidation = _.get(validations, field);

            if(fieldValidation){
                const isValid = fieldValidation.do();
                const errMsg = fieldValidation.errorMessage;

                if(!isValid){
                    errors.push(errMsg)
                }
            }
        });

        if(errors.length){
            const err = _.join(errors, ', ')
            return callback(err, null);
        }

        const email = _.toLower(_.trim(_.get(user, 'email', '')));
        this.app.db.collection('users').findOne({email: email}, (err, result) => {
            if(err || result){
               return callback({message: "Email already exists!"}, null);
            }

        // Successfully Checked
        const password = _.get(user, 'password');
        const hashPassword = bcrypt.hashSync(password, saltRounds);

        const userFormatted = {
            name: `${_.trim(_.get(user, 'name'))}`,
            email: email,
            password: hashPassword,
            created: new Date(),
        };

        return callback(null, userFormatted);
    
    });

    }
    create(user){
        const db = this.app.db;
        return new Promise((resolve, reject) => {
            this.beforeSave(user, (err, user) => {
                if(err){
                    return reject(err);
                }

                // Add user to db
                db.collection('users').insertOne(user, (err, info) => {
                    if(err){
                        return reject({message: "An error saving user."});
                    }
                    
                    const userId = _.get(user, '_id').toString();

                    this.users = this.users.set(userId, user);
                    return resolve(user);
                })
            })
        });
    }
}

export default User;