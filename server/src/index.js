import http from 'http';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import WebSocket from 'ws';
import AppRouter from './AppRouter';
import Model from './models';
import Database from './mongoDBClient';

const PORT = 3001;
const app = express();
app.server = http.createServer(app);
app.wsServer = new WebSocket.Server({server: app.server});

app.use(cors({
    exposedHeaders: "*"
}));
app.use(bodyParser.json({
    limit: '50mb'
}));

// Serving ReactJS
const wwwPath = path.join(__dirname, 'www');
app.use('/', express.static(wwwPath));

// Connection to MongoDB
new Database().connect().then((db) => {
    console.log("Connected to DB!");
    app.db = db;
}).catch((err) => {
    throw(err);
})

app.models = new Model(app);
app.routers = new AppRouter(app);

app.server.listen(process.env.PORT || PORT, () => {
        console.log(`App is running on port ${app.server.address().port}`);
});

export default app;