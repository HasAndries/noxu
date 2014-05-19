var extend = require('node.extend');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Fiber = require('fibers');
var Device = require('./device');
var Message = require('./message');
var Outbound = require('./outbound');
var Inbound = require('./inbound');
var Instructions = require('./enums').Instructions;
require('./common');
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
 * @property {int} deviceId - The DeviceId that is invalid
 * @property {int} hardwareId - The hardwareId that is invalid
 */
/**
 * @event Network#deviceNew
 * @type {object}
 * @property {object} device - Device added
 */
/**
 * @event Network#deviceInvalid
 * @type {object}
 * @property {int} deviceId - The DeviceId that is invalid
 */
/**
 * @event Network#pingConfirm
 * @type {object}
 * @property {object} device - Device that sent message
 * @property {object} latency - Latency of the device
 */
/**
 * @event Network#deviceNextMessage
 * @type {object}
 * @property {object} device - Device that the message is for
 * @property {object} message - Next message that is to be sent to the device
 */

/**
 * @class
 * This is the network code to interface with RF devices
 *
 * @fires Network#inbound
 * @fires Network#reservationNew
 * @fires Network#reservationInvalid
 * @fires Network#deviceInvalid
 * @fires Network#deviceNew
 * @fires Network#pingConfirm
 * @fires Network#deviceNextMessage
 *
 * @constructor
 * @param {object} config - The RF config to use
 * @param {object} db - A connection to the database
 */
function Network(config, db) {
  EventEmitter.call(this);
  this.config = {
    networkId: 0,
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
  this.db = db;

  this.devices = Device.loadAll(this.db);

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
}
util.inherits(Network, EventEmitter);
Network.prototype._process = [];//for inbound processing functions

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
Network.prototype.send = function (message, device) {
  device = device || this._getDevice(message.deviceId);
  //stop inbound
  if (this.running) this._stopListen();
  if (device) message.transactionId = device.nextTransactionId;
  var buffer = message.toBuffer();
  //write message
  if (this.radio) {
    this.radio.write(buffer);
  }
  if (device) device.stampOutbound(this.db, buffer.toByteArray());
  this.emit('outbound', {device:device, buffer: buffer, message: message});

  //start inbound
  if (this.running) this._startListen();
};

/**
 * Returns a list of currently connected network devices
 * @returns {object} List of device objects
 */
Network.prototype.getDevices = function () {
  return extend([], this.devices);
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
Network. prototype._getNextMessage = function(device){
  var outbound;
  //todo: use latest message from admin app
  if (!outbound) outbound = new Message({networkId: this.config.networkId, deviceId: device.deviceId, instruction: Instructions.WAKE, sleep: 10});
  this.emit('deviceNextMessage', {device: device, message: outbound});
  return outbound;
};
//==================== Inbound ====================
Network.prototype._processInbound = function () {
  if (this.listening) {
    var avail = this.radio.available();
    if (avail.any) {
      var time = process.hrtime();
      var data = this.radio.read();
      var buffer = new Buffer(this.config.bufferSize);
      buffer.fill(0);
      data.copy(buffer);//todo: check for possible overflow
      var message = new Message({buffer: data, bufferSize: this.config.bufferSize});
      if (message.validate()) {
        var device = this._getDevice(message.deviceId);
        if (device) device.stampInbound(this.db, message.transactionId, buffer.toByteArray(), time);
        this.emit('inbound', {device:device, buffer: buffer, message: message});
        var inbound = this._process[message.instruction] || this._processGeneral;
        var outbound = inbound.bind(this)(message);
        if (outbound){
          this.send(outbound, device);
        }
      }
    }
  }
};
//---------- processGeneral ----------
Network.prototype._processGeneral = function(message){
  var device = this._getDevice(message.deviceId);
  var outbound;
  if (!device) {
    outbound = new Message({networkId: this.config.networkId, deviceId: message.deviceId, data: message.data, fromCommander: true, instruction: Instructions.NETWORK_INVALID});
    this.emit('deviceInvalid', {deviceId: message.deviceId});
  }
  else{
    outbound = message.isRelay && this._getNextMessage(device) || new Message({networkId: this.config.networkId, deviceId: message.deviceId, fromCommander: true, instruction: Instructions.PING});
  }
  return outbound;
};
//---------- NETWORK_CONNECT ----------
Network.prototype._process[Instructions.NETWORK_CONNECT] = function(message){
  var hardwareId = message.data.readUInt16LE(0);
  var outbound = new Message({data: message.data, fromCommander: true, networkId: this.config.networkId, instruction: Instructions.NETWORK_NEW});
  var device = this._getDeviceForHardwareId(hardwareId);
  if (device) {
    this.emit('deviceConnectExisting', {device: device});
    outbound.deviceId = device.deviceId;
  }
  else {
    var device = new Device({hardwareId: hardwareId});
    device.save(this.db);
    this.devices.push(device);
    outbound.deviceId = device.deviceId;
    this.emit('deviceConnectNew', {device: device});
  }
  return outbound;
};
//---------- NETWORK_CONFIRM ----------
Network.prototype._process[Instructions.NETWORK_CONFIRM] = function(message){
  var device = this._getDevice(message.deviceId);
  var outbound;
  if (!device) {
    this.emit('deviceConfirmInvalid', {deviceId: message.deviceId});
    outbound = new Message({data: message.data, instruction: Instructions.NETWORK_INVALID});
  }
  else {
    if (!device.confirmed) {
      device.confirm(this.db);
      this.emit('deviceConfirmNew', {device: device});
    }
    else {
      this.emit('deviceConfirmExisting', {device: device})
    }
    outbound = message.isRelay && this._getNextMessage(device) || new Message({networkId: this.config.networkId, deviceId: message.deviceId, fromCommander: true, instruction: Instructions.PING});
  }
  return outbound;
};
//---------- PING_CONFIRM ----------
Network.prototype._process[Instructions.PING_CONFIRM] = function(message){
  var device = this._getDevice(message.deviceId);
  var outbound;
  if (!device) {
    this.emit('deviceInvalid', {deviceId: message.deviceId});
    outbound = new Message({data: message.data, instruction: Instructions.NETWORK_INVALID});
  }
  else {
    if (!message.isRelay){
      outbound = this._getNextMessage(device);
    }
    //todo: calculate ping time
    this.emit('pingConfirm', {device: device});
  }
  return outbound;
};
//==================== Devices ====================
Network.prototype._getDeviceForHardwareId = function (hardwareId) {
  for (var ct = 0; ct < this.devices.length; ct++) {
    if (this.devices[ct].hardwareId == hardwareId) return this.devices[ct];
  }
  return null;
};
Network.prototype._getDevice = function (deviceId) {
  for (var ct = 0; ct < this.devices.length; ct++) {
    if (this.devices[ct].deviceId == deviceId) {
      return this.devices[ct];
    }
  }
  return null;
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