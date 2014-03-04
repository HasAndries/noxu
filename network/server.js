var express = require('express');
var RF24 = require('../rf24');
var EventEmitter = require('events').EventEmitter;
var Network = require('./network');
var Api = require('./api');

function Server(config){
  EventEmitter.call(this);
  this.network = null;
  this.app = null;
  this.api = null;
  this.ready = false;

  //Network
  var network = new Network(config);
  this.network = network;
  network.on('inbound', this.notify('inbound'));
  network.on('outbound', this.notify('outbound'));
  network.on('nodeNew', this.notify('nodeNew'));
  network.on('nodeConfirm', this.notify('nodeConfirm'));
  network.on('nodePing', this.notify('nodePing'));

  //Express App
  var app = express();
  this.app = app;
  var env = app.get('env');
  app.set('port', process.env.PORT || 9100);
  if (env == 'development') {
    app.use(express.errorHandler());
  }
  app.use(express.logger());
  app.use(express.bodyParser());
  app.use(function(err, req, res, next){
    res.status(500);
    res.end('Unhandled Error\r\n'+JSON.stringify(err));
  });
  app.get('/', function (req, res) {
    res.end('Network Server');
  });
  this.api = new Api(app, this.network);

}

Server.prototype.start = function(http){
  var port = this.app.get('port');
  http.createServer(this.app).listen(port, function () {
    console.log('Network Client listening on port ' + port);
  });
  this.network.start();
};

Server.prototype.notify = function(name){
  return function(obj){
    //todo this should notify registered web hooks
    console.log(name + ' : ' + JSON.stringify(obj));
  }
}

module.exports = Server;