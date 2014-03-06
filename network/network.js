var extend = require('node.extend');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var Fiber = require('fibers');
var RF24 = require('../rf24');
var Message = require('./message');
var instructions = require('./instructions');

function Network(config) {
  this.nodes = [];
  this.config = {
    bufferSize: 32,
    channel: 0x4c,
    dataRate: RF24.DataRate.kb1000,
    crcBytes: RF24.Crc.bit16,
    retryCount: 10,
    retryDelay: 100,
    spiDev: '/dev/spidev0.0',
    pinCe: 25,
    inboundAddress: 0x00F0F0F0D2,
    outboundAddress: 0x00F0F0F0F0
  };
  extend(this.config, config);
  console.log(JSON.stringify(this.config));

  //setup rf device
  var radio = new RF24(config.spiDev, config.pinCe);
  this.radio = radio;
  radio.begin();
  radio.setPALevel(RF24.Power.max);
  radio.setChannel(this.config.channel);
  radio.setCRCLength(this.config.crcBytes);
  radio.setDataRate(this.config.dataRate);
  radio.setRetries(this.config.retryCount, this.config.retryDelay);
  radio.setPayloadSize(this.config.bufferSize);
  radio.enableDynamicPayloads();
  radio.setAutoAck(true);
  radio.powerUp();
  radio.openReadingPipe(1, this.config.inboundAddress);
  radio.openWritingPipe(this.config.outboundAddress);
  radio.printDetails();

  this._loadNodes();
}
util.inherits(Network, EventEmitter);

//========== PUBLIC ==========
Network.prototype.start = function () {
  this._start();
  this.running = true;
  var _this = this;
  Fiber(function () {
    _this._loop(_this);
  }).run();
};

Network.prototype.stop = function () {
  this._stop();
  this.running = false;
};

Network.prototype.send = function (obj) {
  var list = obj instanceof Array && extend([], obj) || [obj];
  if (!list.length) return;
  //stop inbound
  if (this.running) this._stop();
  //write messages
  for (var ct in list) {
    var buffer = list[ct].toBuffer();
    this.radio.write(buffer);
    this.emit('outbound', {buffer: buffer, message: list[ct]});
  }
  //start inbound
  if (this.running) this._start();
};

//========== PRIVATE ==========
Network.prototype._loop = function (_this) {
  console.log('loop enter');
  while (_this.running) {
    //process inbound
    if (_this.listening) {
      var avail = _this.radio.available();
      if (avail.any) {
        //var start = process.hrtime();
        var data = _this.radio.read();
        //var diff = process.hrtime(start);
        //console.log('read: %dms', (diff[0] * 1e9 + diff[1])/1000000);
        console.log('data: ' + JSON.stringify(data));
        var buffer = new Buffer(_this.config.bufferSize);
        buffer.fill(0);
        data.copy(buffer);
        var message = new Message({data: data, bufferSize: _this.config.bufferSize});
        if (message.validate()) {
          _this.emit('inbound', buffer);
          _this._processInbound(message);
        }
      }
    }
    sleep(5);
  }
  console.log('loop exit: ' + JSON.stringify(_this));
};

Network.prototype._start = function () {
  if (this.listening) return;
  this.radio.startListening();
  this.listening = true;
};

Network.prototype._stop = function () {
  if (!this.listening) return;
  this.radio.stopListening();
  this.listening = false;
};

Network.prototype._processInbound = function (message) {
  console.log(message);
  if (message.instruction == instructions.NETWORKID_REQ) {
    var tempId = message.data.readUInt16LE(0);
    var node = this._getNodeTempId(tempId);
    if (node) this.emit('nodeExisting', node);
    else {//allocate new node id
      node = this._newNode(tempId);
      this.emit('nodeNew', node);
    }
    message.hops.push(node.id);
    message.fromCommander = true;
    message.instruction = instructions.NETWORKID_NEW;
    this.send(message);
  }
  else if (message.instruction == instructions.NETWORKID_CONFIRM) {
    var node = this._getNode(message.hops[message.hops.length - 1]);
    node.confirmed = true;
    this._saveNodes();
    this.emit('nodeConfirm', node);
  }
  else if (message.instruction == instructions.PING_REPLY) {
    var node = this._getNode(message.hops[message.hops.length - 1]);
    var diff = process.hrtime(node.pingStart);
    node.ping = diff[0] * 1e9 + diff[1];
    delete node.pingStart;
    this.emit('nodePing', node);
  }
};

Network.prototype._newNode = function (tempId) {
  var newNode = {id: 1 + this.nodes.length, tempId: tempId};
  this.nodes.push(newNode);
  this._saveNodes();
  return newNode;
};
Network.prototype._getNode = function (id) {
  for (var ct = 0; ct < this.nodes.length; ct++) {
    if (this.nodes[ct].id == id) return this.nodes[ct];
  }
  return null;
};
Network.prototype._getNodeTempId = function (tempId) {
  for (var ct = 0; ct < this.nodes.length; ct++) {
    if (this.nodes[ct].tempId == tempId) return this.nodes[ct];
  }
  return null;
};
Network.prototype._deleteNode = function (id) {
  for (var ct = 0; ct < this.nodes.length; ct++) {
    if (this.nodes[ct].id == id) this.nodes.splice(ct, 1);
  }
  this._saveNodes();
};
Network.prototype._deleteNodesAll = function () {
  this.nodes = [];
  this._saveNodes();
};
Network.prototype._saveNodes = function () {
  var json = JSON.stringify(this.nodes);
  fs.writeFile('nodes.txt', json, function (err) {
    if (!err) this.emit('savedNodes');
    else this.emit('saveNodesError', err);
  }.bind(this));
};
Network.prototype._loadNodes = function () {
  if (!fs.existsSync('nodes.txt')) return;
  fs.readFile('nodes.txt', function (err, data) {
    if (!err) {
      this.nodes = JSON.parse(data);
      this.emit('loadedNodes');
    }
    else this.emit('loadNodesError', err);
  }.bind(this));
};

function sleep(ms) {
  var fiber = Fiber.current;
  setTimeout(function () {
    fiber.run();
  }, ms);
  Fiber.yield();
}

module.exports = Network;