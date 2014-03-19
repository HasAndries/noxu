var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Fiber = require('fibers');

function Network(config, wsClient){
  EventEmitter.call(this);
  this.config = config;

  //Message Map
  this.messageMap = {
    'network:clients': this._networkClients,
    'network:outbound': this._networkOutbound,
    'network:inbound': this._networkInbound,
    'network:reservationNew': this._networkReservationNew,
    'network:reservationInvalid': this._networkReservationInvalid,
    'network:clientNew': this._networkClientNew,
    'network:pulseConfirm': this._networkPulseConfirm
  };

  this.wsClient = wsClient;
  wsClient.on('open', function(){
    console.log('network connected');
  });
  wsClient.on('message', this._respond(wsClient));
}
util.inherits(Network, EventEmitter);

//==================== Public ====================
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
  this.wsClient.send({type:'network:clients'});
};

//==================== Private ====================
Network.prototype._loop = function(_this){
  while (_this.running) {
    //_this.getClients();
    sleep(_this.config.networkPoll || 1000);
  }
};

Network.prototype._networkClients = function(obj){
  console.log('clients: ' + JSON.stringify(obj));
  this.clients = obj;
  this.emit('clients', this.clients);
};

Network.prototype._networkOutbound = function(obj){
  console.log('outbound:'  + JSON.stringify(obj));
};
Network.prototype._networkInbound = function(obj){
  console.log('inbound:'  + JSON.stringify(obj));
};
Network.prototype._networkReservationNew = function(obj){
  console.log('reservationNew:'  + JSON.stringify(obj));
};
Network.prototype._networkReservationInvalid = function(obj){
  console.log('reservationInvalid:'  + JSON.stringify(obj));
};
Network.prototype._networkClientNew = function(obj){
  console.log('clientNew:'  + JSON.stringify(obj));
};
Network.prototype._networkPulseConfirm = function(obj){
  console.log('pulseConfirm:'  + JSON.stringify(obj));
};

Network.prototype._respond = function(wsClient){
  return function(message){
    var func = this.messageMap[message.type];
    wsClient.send(func(message.data));
  }
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