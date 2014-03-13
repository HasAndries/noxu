var express = require('express');
var io = require('socket.io');
var Network = require('./network');

function Server(config, http) {
  var _this = this;
  _this.config = config;
  this.network = null;
  this.app = null;

  //express
  var app = express();
  this.app = app;
  var env = app.get('env');
  app.set('port', this.config.webPort);
  if (env != 'production') {
    app.use(express.errorHandler());
  }
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.get('/', function(req, res){
    res.end('Network Server');
  });

  //server
  this.server = http.createServer(this.app);
  this.ioServer = io.listen(this.server);

  //Network
  var network = new Network(config);
  this.network = network;
  var events = ['outbound', 'inbound', 'reservationNew', 'clientNew'];
  for (var i in events) {
    network.on(events[i], this.notify(events[i]));
  }
}

Server.prototype.start = function(){
  var _this = this;
  this.server.listen(_this.config.networkPort, function () {
    console.log('Network server listening on port ' + _this.config.networkPort);
  });
  this.network.start();
};

Server.prototype.notify = function (name) {
  var _this = this;
  return function (obj) {
    _this.ioServer.emit(name, obj);
    console.log(name + ' : ' + JSON.stringify(obj));
  }
}

module.exports = Server;