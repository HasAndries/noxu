var io = require('socket.io');
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
    'clients': {key: 'clients', func: network.getClients},
    'send': {key: 'send', func: network.send}
  };

  //Server
  this.io = io.listen(parseInt(_this.config.networkPort));
  this.io.sockets.on('connection', function(socket){
    console.log('connection');
    for(var name in this.messageMap){
      socket.on(name, this.respond(socket, this.messageMap[name].key, this.messageMap[name].func.bind(network)));
    }
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
Server.prototype.respond = function(socket, key, func){
  return function(data){
    console.log(data);
    socket.emit(key, func(data));
  }.bind(this);
};

module.exports = Server;