var express = require('express');
var swig = require('swig');
var path = require('path');
var WebSocketServer = require('ws').Server;
var ioClient = require('socket.io-client');

var Api = require('./routes/api');
var Pages = require('./routes/pages');

var Network = require('./network');

function Web(config, http){
  var _this = this;
  _this.config = config;

  //express
  var app = express();
  _this.app = app;
  var env = app.get('env');
  app.set('port', _this.config.webPort);
  if (env != 'production') {
    app.use(express.errorHandler());
  }
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public'))); //public
  //views
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'html');
  app.engine('html', swig.renderFile);
  swig.setDefaults({
    varControls: ['{[', ']}'],
    tagControls: ['{=', '=}']
  });
  this.pages = new Pages(app);

  //server
  this.server = http.createServer(this.app);
  this.wsServer = new WebSocketServer({port: _this.config.webSocketPort});
  this.ioClient = ioClient.connect(_this.config.networkUrl);

  //web
  this.api = new Api(this.wsServer);

  //network
  this.network = new Network(this.config, this.ioClient);
}

Web.prototype.start = function(){
  var _this = this;
  _this.server.listen(_this.config.webPort, function () {
    console.log('Web server listening on port ' + _this.config.webPort);
  });
  this.network.start();
};
module.exports = Web;
