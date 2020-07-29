'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _cors = require('cors');

var _cors2 = _interopRequireDefault(_cors);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _ws = require('ws');

var _ws2 = _interopRequireDefault(_ws);

var _AppRouter = require('./AppRouter');

var _AppRouter2 = _interopRequireDefault(_AppRouter);

var _models = require('./models');

var _models2 = _interopRequireDefault(_models);

var _mongoDBClient = require('./mongoDBClient');

var _mongoDBClient2 = _interopRequireDefault(_mongoDBClient);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var PORT = 3001;
var app = (0, _express2.default)();
app.server = _http2.default.createServer(app);
app.wsServer = new _ws2.default.Server({ server: app.server });

app.use((0, _cors2.default)({
    exposedHeaders: "*"
}));
app.use(_bodyParser2.default.json({
    limit: '50mb'
}));

// Serving ReactJS
var wwwPath = _path2.default.join(__dirname, 'www');
app.use('/', _express2.default.static(wwwPath));

// Connection to MongoDB
new _mongoDBClient2.default().connect().then(function (db) {
    console.log("Connected to DB!");
    app.db = db;
}).catch(function (err) {
    throw err;
});

app.models = new _models2.default(app);
app.routers = new _AppRouter2.default(app);

app.server.listen(process.env.PORT || PORT, function () {
    console.log('App is running on port ' + app.server.address().port);
});

exports.default = app;
//# sourceMappingURL=index.js.map