var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Fiber = require('fibers');

function Network(config, ioClient) {
  EventEmitter.call(this);
  this.config = config;
  this.connected = false;

  //Message Map
  this.messageMap = {
    'clients': { func: this._clients},
    'outbound': { func: this._outbound},
    'inbound': { func: this._inbound},
    'reservationNew': { func: this._reservationNew},
    'reservationInvalid': { func: this._reservationInvalid},
    'clientNew': { func: this._clientNew},
    'pulseConfirm': { func: this._pulseConfirm}
  };

  this.ioClient = ioClient;
  ioClient.on('connect', function () {
    this.connected = true;
    console.log('network connected');
  }.bind(this));

  for(var name in this.messageMap){
    ioClient.on(name, this.messageMap[name].func.bind(this));
  }
}
util.inherits(Network, EventEmitter);

//==================== Public ====================
Network.prototype.start = function () {
  this.running = true;
  var _this = this;
  Fiber(function () {
    _this._loop(_this);
  }).run();
};
Network.prototype.stop = function () {
  this.running = false;
};

Network.prototype.getClients = function () {
  this.ioClient.emit('clients');
};

//==================== Private ====================
Network.prototype._loop = function (_this) {
  while (_this.running) {
    if (_this.connected) {
      _this.getClients();
      sleep(_this.config.networkPoll || 1000);
    }
    sleep(_this.config.networkPoll/10 || 1000);
  }
};

Network.prototype._clients = function (obj) {
  console.log('clients: ' + JSON.stringify(obj));
  this.clients = obj;
  this.emit('clients', this.clients);
};

Network.prototype._outbound = function (obj) {
  console.log('outbound:' + JSON.stringify(obj));
};
Network.prototype._inbound = function (obj) {
  console.log('inbound:' + JSON.stringify(obj));
};
Network.prototype._reservationNew = function (obj) {
  console.log('reservationNew:' + JSON.stringify(obj));
};
Network.prototype._reservationInvalid = function (obj) {
  console.log('reservationInvalid:' + JSON.stringify(obj));
};
Network.prototype._clientNew = function (obj) {
  console.log('clientNew:' + JSON.stringify(obj));
};
Network.prototype._pulseConfirm = function (obj) {
  console.log('pulseConfirm:' + JSON.stringify(obj));
};

Network.prototype._respond = function (wsClient) {
  return function (message) {
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