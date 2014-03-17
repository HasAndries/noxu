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

  //Network
  var network = new Network(config);
  this.network = network;
  network.on('outbound', this.notify('outbound'));
  network.on('inbound', this.notify('inbound'));
  network.on('reservationNew', this.notify('reservationNew'));
  network.on('clientNew', this.notify('clientNew'));

  //Server
  this.server = http.createServer(this.app);
  this.io = io.listen(this.server);
  this.io.set('log level', 1);
  this.io.sockets.on('connection', function(socket){
    console.log('connection: ' + socket.id);
    socket.on('getClients', network.getClients(socket));
    socket.on('send', network.send);
  });
}

Server.prototype.start = function(){
  var _this = this;
  this.server.listen(_this.config.networkPort, function () {
    console.log('Network server listening on port ' + _this.config.networkPort);
  });
  this.network.start();
};

Server.prototype.notify = function (name, socket) {
  var _this = this;
  return function (obj) {
    (socket || _this.io.sockets).emit(name, obj);
    console.log('Notify: ' + name);
  }
}

module.exports = Server;