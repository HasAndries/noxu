var extend = require('node.extend');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Fiber = require('fibers');
var Message = require('./message');
var instructions = require('./instructions');
try {
  var RF24 = require('../rf24');
}
catch (ex) {
  console.log('Could not load RF24');
}

/**
 * @event Network#outbound
 * @type {object}
 * @property {Buffer} buffer - Buffer sent to radio
 * @property {Message} message - Message serialized
 */
/**
 * @event Network#inbound
 * @type {object}
 * @property {Buffer} buffer - Buffer received from radio
 * @property {Message} message - Message de-serialized
 */
/**
 * @event Network#reservationNew
 * @type {object}
 * @property {object} reservation - Reservation added
 */
/**
 * @event Network#reservationInvalid
 * @type {object}
 * @property {int} tempId - The TempId that is invalid
 * @property {int} networkId - The NetworkId that is invalid
 */
/**
 * @event Network#clientNew
 * @type {object}
 * @property {object} client - Client added
 */
/**
 * @event Network#pulseConfirm
 * @type {object}
 * @property {object} client - Client that sent message
 */


/**
 * @class
 * This is the network code to interface with RF devices
 *
 * @fires Network#inbound
 * @fires Network#reservationNew
 * @fires Network#reservationInvalid
 * @fires Network#clientNew
 * @fires Network#pulseConfirm
 *
 * @constructor
 * @param {object} config - The RF config to use
 */
function Network(config) {
  EventEmitter.call(this);
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
/**
 * Starts inbound processing
 */
Network.prototype.start = function () {
  this._startListen();
  this.running = true;
  var _this = this;
  Fiber(function () {
    _this._loop(_this);
  }).run();
};

/**
 * Stops inbound processing
 */
Network.prototype.stop = function () {
  this._stopListen();
  this.running = false;
};

/**
 * Sends a message to the RF radio for transmission
 * @param {Message} obj - Message to be serialized and sent
 * @fires Network#outbound
 */
Network.prototype.send = function (obj) {
  var list = obj instanceof Array && extend([], obj) || [obj];
  if (!list.length) return;
  //stop inbound
  if (this.running) this._stopListen();
  //write messages
  for (var ct in list) {
    var buffer = list[ct].toBuffer();
    if (this.radio) {
      this._stampOutbound(list[ct]);
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
    _this._processInbound();
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

Network.prototype._processInbound = function () {
  if (this.listening) {
    var avail = this.radio.available();
    if (avail.any) {
      var time = process.hrtime()
      var data = this.radio.read();
      var buffer = new Buffer(this.config.bufferSize);
      buffer.fill(0);
      data.copy(buffer);
      var message = new Message({buffer: data, bufferSize: this.config.bufferSize});
      if (message.validate()) {
        this._stampInbound(message, time);
        this.emit('inbound', {buffer: buffer, message: message});

        //process message
        if (message.instruction == instructions.NETWORKID_REQ) this._processInbound_NETWORKID_REQ(message);
        else if (message.instruction == instructions.NETWORKID_CONFIRM) this._process_NETWORKID_CONFIRM(message);
        else if (message.instruction == instructions.PULSE_CONFIRM) this._process_PULSE_CONFIRM(message);
      }
    }
  }
};
//---------- NETWORKID_REQ ----------
Network.prototype._processInbound_NETWORKID_REQ = function (message) {
  var tempId = message.data.readUInt16LE(0);
  var outbound = new Message({data: message.data, fromCommander: true});
  if (this._checkReserved(tempId)) {
    outbound.instruction = instructions.NETWORKID_INVALID;
    this.emit('reservationInvalid', {tempId: tempId});
  }
  else {
    var reservation = this._createReservation(tempId);
    outbound.networkId = reservation.networkId;
    outbound.instruction = instructions.NETWORKID_NEW;
    this.emit('reservationNew', {reservation: reservation});
  }
  this.send(outbound);
};
//---------- NETWORKID_CONFIRM ----------
Network.prototype._process_NETWORKID_CONFIRM = function (message) {
  var client = this._confirmReservation(message.networkId);
  if (!client) {
    var outbound = new Message({data: message.data, fromCommander: true, instruction: instructions.NETWORKID_INVALID});
    this.emit('reservationInvalid', {networkId: message.networkId});
    this.send(outbound);
  }
  else {
    this.emit('clientNew', {client: client});
  }
};
//---------- PULSE_CONFIRM ----------
Network.prototype._process_PULSE_CONFIRM = function (message) {
  var client = this._getClient(message.networkId);
  this.emit('pulseConfirm', {client: client});
};
//==================== Reservations ====================
Network.prototype._checkReserved = function (tempId) {
  for (var ct = 0; ct < this.reservations.length; ct++) {
    if (this.reservations[ct].tempId == tempId) return true;
  }
  return false;
};
Network.prototype._createReservation = function (tempId) {
  var reservation = {networkId: this._nextNetworkId++, tempId: tempId};
  this.reservations.push(reservation);
  return reservation;
};
Network.prototype._confirmReservation = function (networkId) {
  var reservation;
  for (var ct = 0; ct < this.reservations.length; ct++) {
    if (this.reservations[ct].networkId == networkId) {
      reservation = this.reservations.splice(ct, 1)[0];
      break;
    }
  }
  if (!reservation) return null;
  this.clients.push({
    networkId: reservation.networkId, sequence: 0,
    inbound: [], outbound: []
  });
  return this.clients[this.clients.length - 1];
};
//==================== Clients ====================
Network.prototype._getClient = function (networkId) {
  for (var ct = 0; ct < this.clients.length; ct++) {
    if (this.clients[ct].networkId == networkId) {
      return this.clients[ct];
    }
  }
  return null;
};
//==================== Messages ====================
Network.prototype._stampOutbound = function (message) {
  var client = this._getClient(message.networkId);
  if (!client) return;
  if (!client.outbound)
    client.outbound = [];
  message.sequence = client.sequence++;
  client.outbound.push({sequence: message.sequence, time: process.hrtime(), message: message});
};
Network.prototype._stampInbound = function (message, time) {
  var client = this._getClient(message.networkId);
  if (!client) return;
  if (!client.inbound)
    client.inbound = [];
  var inbound = {sequence: message.sequence, time: time, message: message};
  //calc ping
  if (client.outbound) {
    for (var ct = 0; ct < client.outbound.length; ct++) {
      if (client.outbound[ct].sequence == message.sequence) {
        var diff = process.hrtime(inbound.time);
        inbound.ping = diff[0] * 1e9 + diff[1];
      }
    }
  }
  client.inbound.push(inbound);
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