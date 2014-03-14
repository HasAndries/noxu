var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Fiber = require('fibers');

function Network(config, ioClient){
  EventEmitter.call(this);
  var _this = this;
  this.config = config;

  this.io = ioClient.connect(config.ioNetwork);
  this.io.on('connect', function(){
    console.log('network connected');
  });
  this.io.on('outbound', this._outbound);
  this.io.on('inbound', this._inbound);
  this.io.on('reservationNew', this._reservationNew);
  this.io.on('reservationInvalid', this._reservationInvalid);
  this.io.on('clientNew', this._clientNew);
  this.io.on('pulseConfirm', this._pulseConfirm);

  this.io.on('clients', this._clients);
}
util.inherits(Network, EventEmitter);

Network.prototype.start = function(){
  this.running = true;
  var _this = this;
  Fiber(function () {
    _this._loop(_this);
  }).run();
};
Network.prototype.stop = function () {
  this.running = false;
};

Network.prototype.getClients = function(){
  this.io.emit('getClients');
};

Network.prototype._loop = function(_this){
  while (_this.running) {
    _this.getClients();
    sleep(_this.config.networkPoll || 1000);
  }
};

Network.prototype._clients = function(obj){
  console.log('clients: ' + JSON.stringify(obj));
  this.clients = obj;
  this.emit('clients', this.clients);
};

Network.prototype._outbound = function(obj){
  console.log('outbound:'  + JSON.stringify(obj));
};
Network.prototype._inbound = function(obj){
  console.log('inbound:'  + JSON.stringify(obj));
};
Network.prototype._reservationNew = function(obj){
  console.log('reservationNew:'  + JSON.stringify(obj));
};
Network.prototype._reservationInvalid = function(obj){
  console.log('reservationInvalid:'  + JSON.stringify(obj));
};
Network.prototype._clientNew = function(obj){
  console.log('clientNew:'  + JSON.stringify(obj));
};
Network.prototype._pulseConfirm = function(obj){
  console.log('pulseConfirm:'  + JSON.stringify(obj));
};

//==================== Tools ====================
function sleep(ms) {
  var fiber = Fiber.current;
  setTimeout(function () {
    fiber.run();
  }, ms);
  Fiber.yield();
}

module.exports = Network;