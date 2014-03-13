var RF24 = require('../rf24');
var EventEmitter = require('events').EventEmitter;
var Network = require('./network');
var io

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
  network.on('nodeExisting', this.notify('nodeExisting'));
  network.on('nodeNew', this.notify('nodeNew'));
  network.on('nodeConfirm', this.notify('nodeConfirm'));
  network.on('nodePing', this.notify('nodePing'));

  //Express App

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