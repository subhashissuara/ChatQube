import http from 'http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import WebSocket from 'ws';
import AppRouter from './AppRouter';
import Model from './models';
import Database from './mongoDBClient';

const PORT = 3001;
const app = express();
app.server = http.createServer(app);
app.wsServer = new WebSocket.Server({server: app.server});

app.use(morgan('dev'));
app.use(cors({
    exposedHeaders: "*"
}));
app.use(bodyParser.json({
    limit: '50mb'
}));

// Connection to MongoDB
new Database().connect().then((db) => {
    console.log("Connected to DB!");
    app.db = db;
}).catch((err) => {
    throw(err);
})

app.models = new Model(app);
app.routers = new AppRouter(app);

/*
let clients = [];

app.wss.on('connection', (connection) => {
    const userId = clients.length;
    connection.userId = userId;
    const newClient = {
        ws: connection,
        userId: userId
    };
    clients.push(newClient);

    console.log("New client connected! UserID: ", userId);

    connection.on('message', (message) => {
        console.log("Message: ", message);
        connection.send("Message received client!");
    });
    connection.on('close', () => {
        console.log("Client disconnected! UserID: ", userId);
        clients = clients.filter((client) => client.userId != userId);
    })
});
*/

app.server.listen(process.env.PORT || PORT, () => {
        console.log(`App is running on port ${app.server.address().port}`);
});

export default app;