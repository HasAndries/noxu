var extend = require('node.extend');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var Fiber = require('fibers');
var Message = require('./message');
var instructions = require('./instructions');
try {
  var RF24 = require('../rf24');
}
catch (ex) {
  console.log('Could not load RF24');
}
function Network(config) {
  this.clients = [];
  this.config = {
    bufferSize: 32,
    channel: 0x4c,
    dataRate: 0, //RF24.DataRate.kb1000,
    crcBytes: 2, //RF24.Crc.bit16,
    retryCount: 10,
    retryDelay: 100,
    spiDev: '/dev/spidev0.0',
    pinCe: 25,
    inboundAddress: 0x00F0F0F0D2,
    outboundAddress: 0x00F0F0F0F0
  };
  extend(this.config, config || {});
  this._nextNetworkId = 1;
  this.reservations = [];

  //setup rf device
  if (RF24) {
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
  }

  //this._loadClients();
}
util.inherits(Network, EventEmitter);

//========== PUBLIC ==========
Network.prototype.start = function () {
  this._startListen();
  this.running = true;
  var _this = this;
  Fiber(function () {
    _this._loop(_this);
  }).run();
};

Network.prototype.stop = function () {
  this._stopListen();
  this.running = false;
};

Network.prototype.send = function (obj) {
  var list = obj instanceof Array && extend([], obj) || [obj];
  if (!list.length) return;
  //stop inbound
  if (this.running) this._stopListen();
  //write messages
  for (var ct in list) {
    var buffer = list[ct].toBuffer();
    if (this.radio){
      this.stampOutbound(list[ct]);
      this.radio.write(buffer);
    }
    this.emit('outbound', {buffer: buffer, message: list[ct]});
  }
  //start inbound
  if (this.running) this._startListen();
};

//========== PRIVATE ==========
Network.prototype._loop = function (_this) {
  //console.log('loop enter');
  while (_this.running) {
    //process inbound
    if (_this.listening) {
      var avail = _this.radio.available();
      if (avail.any) {
        var time = process.hrtime()
        var data = _this.radio.read();
        var buffer = new Buffer(_this.config.bufferSize);
        buffer.fill(0);
        data.copy(buffer);
        var message = new Message({buffer: data, bufferSize: _this.config.bufferSize});
        if (message.validate()) {
          _this.emit('inbound', buffer);
          _this.processInbound(message, time);
        }
      }
    }
    sleep(5);
  }
};

Network.prototype._startListen = function () {
  if (this.listening) return;
  this.radio.startListening();
  this.listening = true;
};

Network.prototype._stopListen = function () {
  if (!this.listening) return;
  this.radio.stopListening();
  this.listening = false;
};
//==================== Inbound ====================
Network.prototype.processInbound = function (message, time) {
  this.stampInbound(message, time);
  if (message.instruction == instructions.NETWORKID_REQ) this.processInbound_NETWORKID_REQ(message);
  else if (message.instruction == instructions.NETWORKID_CONFIRM) this.process_NETWORKID_CONFIRM(message);
  else if (message.instruction == instructions.PULSE_CONFIRM) this.process_PULSE_CONFIRM(message);
};
//---------- NETWORKID_REQ ----------
Network.prototype.processInbound_NETWORKID_REQ = function (message) {
  var tempId = message.data.readUInt16LE(0);
  var outbound = new Message({data: message.data, fromCommander: true});
  if (this.checkReserved(tempId)) {
    outbound.instruction = instructions.NETWORKID_INVALID;
    this.emit('reservationDuplicate', {tempId: tempId});
  }
  else {
    var reservation = this.createReservation(tempId);
    outbound.networkId = reservation.networkId;
    outbound.instruction = instructions.NETWORKID_NEW;
    this.emit('reservationNew', {reservation: reservation});
  }
  this.send(outbound);
};
//---------- NETWORKID_CONFIRM ----------
Network.prototype.process_NETWORKID_CONFIRM = function (message) {
  var client = this.confirmReservation(message.networkId);
  if (!client) {
    var outbound = new Message({data: message.data, fromCommander: true, instruction: instructions.NETWORKID_INVALID});
    this.emit('reservationInvalid', {networkId: message.networkId});
    this.send(outbound);
  }
  else{
    this.emit('reservationConfirm', {client: client});
  }
};
//---------- PULSE_CONFIRM ----------
Network.prototype.process_PULSE_CONFIRM = function (message) {
  var client = this._getClient(message.networkId);
  var diff = process.hrtime(client.pingStart);
  client.ping = diff[0] * 1e9 + diff[1];
  delete client.pingStart;
  this.emit('clientPing', client);
};
//==================== Reservations ====================
Network.prototype.checkReserved = function (tempId) {
  for (var ct = 0; ct < this.reservations.length; ct++) {
    if (this.reservations[ct].tempId == tempId) return true;
  }
  return false;
};
Network.prototype.createReservation = function (tempId) {
  var reservation = {networkId: this._nextNetworkId++, tempId: tempId};
  this.reservations.push(reservation);
  return reservation;
};
Network.prototype.confirmReservation = function (networkId) {
  var reservation;
  for (var ct = 0; ct < this.reservations.length; ct++) {
    if (this.reservations[ct].networkId == networkId) {
      reservation = this.reservations.splice(ct, 1)[0];
      break;
    }
  }
  if (!reservation) return null;
  this.clients.push({networkId: reservation.networkId, sequence: 0});
  return this.clients[this.clients.length - 1];
};
//==================== Clients ====================3
Network.prototype.getClient = function(networkId){
  for (var ct = 0; ct < this.clients.length; ct++) {
    if (this.clients[ct].networkId == networkId) {
      return this.clients[ct];
    }
  }
  return null;
};
Network.prototype.stampOutbound = function(message){
  var client = this.getClient(message.networkId);
  if (!client) return;
  if (!client.outbound)
    client.outbound = [];
  message.sequence = client.sequence++;
  client.outbound.push({sequence: message.sequence, time:process.hrtime(), message: message});
};
Network.prototype.stampInbound = function(message, time){
  var client = this.getClient(message.networkId);
  if (!client) return;
  if (!client.inbound)
    client.inbound = [];
  var inbound = {sequence: message.sequence, time: time, message: message};
  //calc ping, if response
  for(var ct=0;ct<client.outbound.length;ct++){
    var diff = process.hrtime(start);
    if (client.outbound[ct].sequence == message.sequence && diff[0] < 10){
      inbound.ping = diff[0] * 1e9 + diff[1];
    }
  }
  client.inbound.push(inbound);
};

//==================== Tools ====================
Network.prototype.getPing = function(message){

}
function sleep(ms) {
  var fiber = Fiber.current;
  setTimeout(function () {
    fiber.run();
  }, ms);
  Fiber.yield();
}

module.exports = Network;