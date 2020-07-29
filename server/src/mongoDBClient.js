import {MongoClient} from 'mongodb';

const URL = 'mongodb://localhost:27017/';
class Database{
    connect(){
        return new Promise((resolve, reject) => {
            MongoClient.connect(URL, { useUnifiedTopology: true }, (err, client) => {
                if(err){
                    return reject(err);
                }
                var db = client.db('chatqube');
                return resolve(db);
            });
        });
    }
}

export default Database;