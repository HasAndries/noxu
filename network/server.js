var io = require('socket.io');
var mysql = require('mysql');
var Network = require('./network');
var util = require('util');

function Server(config) {
  var _this = this;
  _this.config = config;
  this.network = null;
  this.app = null;

  //Database
  var db = mysql.createPool(config.networkDb);

  //Network
  var network = new Network(config, db);
  this.network = network;
  network.on('outbound', this.notify('outbound'));
  network.on('inbound', this.notify('inbound'));
  network.on('deviceInvalid', this.notify('deviceInvalid'));
  network.on('deviceConnectNew', this.notify('deviceConnectNew'));
  network.on('deviceConnectExisting', this.notify('deviceConnectExisting'));
  network.on('deviceConfirmNew', this.notify('deviceConfirmNew'));
  network.on('deviceConfirmExisting', this.notify('deviceConfirmExisting'));
  network.on('pingConfirm', this.notify('pingConfirm'));
  network.on('deviceNextMessage', this.notify('deviceNextMessage'));

  //Message Map
  this.messageMap = {
    'devices': {key: 'devices', func: network.getDevices},
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
    console.log('=== %s %s', name, util.inspect(obj));
  }
}
Server.prototype.respond = function(socket, key, func){
  return function(data){
    console.log(data);
    socket.emit(key, func(data));
  }.bind(this);
};

module.exports = Server;