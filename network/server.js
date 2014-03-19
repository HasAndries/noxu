var WebSocketServer = require('ws').Server;
var Network = require('./network');

function Server(config) {
  var _this = this;
  _this.config = config;
  this.network = null;
  this.app = null;

  //Network
  var network = new Network(config);
  this.network = network;
  network.on('outbound', this.notify('outbound'));
  network.on('inbound', this.notify('inbound'));
  network.on('reservationNew', this.notify('reservationNew'));
  network.on('clientNew', this.notify('clientNew'));

  //Message Map
  this.messageMap = {
    'getClients': network.getClients,
    'send': network.send
  };

  //Server
  this.wsServer = new WebSocketServer({port: _this.config.networkPort});
  this.wsServer.on('connection', function(wsClient){
    console.log('connection');
    wsClient.on('message', this.respond(wsClient));
  }.bind(this));
}


Server.prototype.start = function(){
  this.network.start();
};

Server.prototype.notify = function (name, socket) {
  var _this = this;
  return function (obj) {
    (socket || _this.io.sockets).emit(name, obj);
    console.log('Notify: ' + name);
  }
}
Server.prototype.respond = function(wsClient){
  return function(message){
    var func = this.messageMap[message.type];
    wsClient.send(func(message.data));
  }
};

module.exports = Server;