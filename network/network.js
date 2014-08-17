var extend = require('node.extend');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Fiber = require('fibers');
var Promise = require('../lib/promise');
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
 * @property {object} device - Device that the message is for
 * @property {Buffer} buffer - Buffer sent to radio
 * @property {Message} message - Message serialized
 */
/**
 * @event Network#inbound
 * @type {object}
 * @property {object} device - Device that the message is for
 * @property {Buffer} buffer - Buffer received from radio
 * @property {Message} message - Message de-serialized
 */
/**
 * @event Network#deviceInvalid
 * @type {object}
 * @property {int} deviceId - The DeviceId that is invalid
 */
/**
 * @event Network#deviceConnectNew
 * @type {object}
 * @property {object} device - New Device that connected
 */
/**
 * @event Network#deviceConnectExisting
 * @type {object}
 * @property {object} device - Existing Device that connected
 */
/**
 * @event Network#deviceConfirmNew
 * @type {object}
 * @property {object} device - New Device that was confirmed
 */
/**
 * @event Network#deviceConfirmExisting
 * @type {object}
 * @property {object} device - Existing Device was confirmed
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
    bufferSize: 16,
    channel: 0x4c,
    dataRate: 0, //RF24.DataRate.kb1000,
    crcBytes: 2, //RF24.Crc.bit16,
    retryCount: 15,
    retryDelay: 15,
    spiDev: '/dev/spidev0.0',
    pinCe: 25,
    inboundAddress: 0x00F0F0F0D2,
    outboundAddress: 0x00F0F0F0F0
  };
  extend(this.config, config || {});
  this.db = db;
  this.devices = [];
  this.inbound = [];
  this.outbound = [];
  this.outboundProcessed = [];
}
util.inherits(Network, EventEmitter);
Network.prototype._process = [];//for inbound processing functions

//========== PUBLIC ==========
/**
 * Initializes the Radio and loads devices
 * @returns {Promise.promise|*}
 */
Network.prototype.init = function () {
  var network = this;
  return new Promise(function (resolve, reject) {
    //setup rf device
    if (RF24) {
      console.log('initializing radio');
      var radio = new RF24(network.config.spiDev, network.config.pinCe);
      network.radio = radio;
      radio.begin();
      radio.setPALevel(RF24.Power.max);
      radio.setChannel(network.config.channel);
      radio.setCRCLength(network.config.crcBytes);
      radio.setDataRate(network.config.dataRate);
      radio.setRetries(network.config.retryCount, network.config.retryDelay);
      radio.setPayloadSize(network.config.bufferSize);
      radio.enableDynamicPayloads();
      radio.setAutoAck(true);
      radio.powerUp();
      radio.openReadingPipe(1, network.config.inboundAddress);
      radio.openWritingPipe(network.config.outboundAddress);
      radio.printDetails();
    }
    //Load devices
    Device.loadAll(network.db).success(function (devices) {
      network.devices = devices;
      resolve(network);
    }).fail(reject);
  });
};

/**
 * Starts inbound processing
 */
Network.prototype.start = function () {
  var network = this;
  return new Promise(function (resolve) {
    network._startListen();
    network.running = true;
    Fiber(function () {
      network._processNetworkLoop(network);
      resolve();
    }).run();
    Fiber(function () {
      network._processRadioLoop(network);
      resolve();
    }).run();
  });
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
  var network = this;
  return new Promise(function(resolve, reject){
    var sequence = Promise();
    if (device){
      sequence = sequence
        .then(device.getTransactionId(network.db))
        .then(function(transactionId){
          message.deviceId = device.deviceId;
          message.transactionId = transactionId;
        });
    }
    sequence.then(function(){
      network.outbound.push({
        deviceId: message.deviceId,
        transactionId: message.transactionId,
        buffer: message.toBuffer()
      });
    }).success(resolve).fail(reject);
  });
};

/**
 * Returns a list of currently connected network devices
 * @returns {object} List of device objects
 */
Network.prototype.getDevices = function () {
  return extend([], this.devices);
};
Network.prototype._getNextMessage = function (device) {
  var network = this;
  return new Promise(function (resolve, reject) {
    var outbound;
    //todo: use latest message from admin app
    if (!outbound) outbound = new Message({networkId: network.config.networkId, deviceId: device.deviceId, instruction: Instructions.WAKE, sleep: 10});
    network.emit('deviceNextMessage', {device: device, message: outbound});
    resolve(outbound);
  });
};
//========== PRIVATE ==========
//==================== Radio ====================
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
Network.prototype._processRadioLoop = function (_this) {
  var processing = false;
  while (_this.running) {
    if (!processing) {
      processing = true;
      _this._processRadio().success(function () {
        processing = false;
      }).fail(function (error) {
        processing = false;
        console.log('_processRadioLoop: %s', error.stack);
      });
    }
    sleep(5);
  }
};
Network.prototype._processRadio = function () {
  var network = this;
  return new Promise(function (resolve, reject) {
    try {
      var received = false;
      //process inbound
      if (network.listening) {
        var avail = network.radio.available();
        if (avail.any) {
          var time = process.hrtime();
          received = true;
          var inbound = {
            time: time,
            buffer: new Buffer(network.config.bufferSize)
          };
          var data = network.radio.read();
          inbound.buffer.fill(0);
          data.copy(inbound.buffer);//todo: check for possible overflow
          network.inbound.push(inbound);
        }
      }
      //process outbound if nothing received to give inbound priority
      if (!received && network.outbound.length) {
        var outbound = network.outbound.shift();

        if (network.running) network._stopListen();
        if (network.radio) network.radio.write(outbound.buffer);
        outbound.time = process.hrtime();
        if (network.running) network._startListen();

        network.outboundProcessed.push(outbound);
      }
      resolve();
    }
    catch (e) {
      reject(e);
    }
  });
};
//==================== Inbound ====================
Network.prototype._processNetworkLoop = function (_this) {
  var processing = false;
  while (_this.running) {
    if (!processing) {
      processing = true;
      _this._processNetwork().success(function () {
        processing = false;
      }).fail(function (error) {
        processing = false;
        console.log('_processInboundLoop: %s', error.stack);
      });
    }
    sleep(5);
  }
};
Network.prototype._processNetwork = function () {
  var network = this;
  return new Promise(function (resolve, reject) {
    var promises = [];
    if (network.inbound.length) {//inbound
      var sequence = Promise();
      var inbound = network.inbound.shift();
      var message = new Message({buffer: inbound.buffer, bufferSize: network.config.bufferSize});
      if (message.validate()) {
        var device = network._getDevice(message.deviceId);
        network.emit('inbound', {device: device, buffer: buffer, message: message});
        var inbound = network._process[message.instruction] || network._processGeneral;
        if (device) sequence = sequence.then(device.stampInbound(network.db, message.transactionId, buffer.toByteArray(), inbound.time));
        sequence = sequence
          .then(inbound.bind(network)(message))//process message
          .then(network.send(this.inputVal, device));//send outbound
      }
      promises.push(sequence);
    }
    if (network.outboundProcessed.length){//outbound completed
      var sequence = Promise();
      var outbound = network.outboundProcessed.shift();
      var device = network._getDevice(outbound.deviceId);
      device.stampOutbound()

    }
    sequence.success(resolve).fail(reject);
  });
};
//---------- processGeneral ----------
Network.prototype._processGeneral = function (message) {
  var network = this;
  return new Promise(function (resolve, reject) {
    var device = network._getDevice(message.deviceId);
    var outbound;
    if (!device) {
      outbound = new Message({networkId: network.config.networkId, deviceId: message.deviceId, data: message.data, fromCommander: true, instruction: Instructions.NETWORK_INVALID});
      network.emit('deviceInvalid', {deviceId: message.deviceId});
      resolve(outbound);
    }
    else {
      var sequence = Promise();
      if (message.isRelay) {
        sequence = sequence.then(network._getNextMessage(device)).then(function (input) {
          outbound = input;
        });
      }
      else
        outbound = new Message({networkId: network.config.networkId, deviceId: message.deviceId, fromCommander: true, instruction: Instructions.PING});
      sequence.success(function () {
        resolve(outbound);
      });
    }
  });
};
//---------- NETWORK_CONNECT ----------
Network.prototype._process[Instructions.NETWORK_CONNECT] = function (message) {
  var network = this;
  return new Promise(function (resolve, reject) {
    var hardwareId = message.data.readUInt16LE(0);
    var outbound = new Message({data: message.data, fromCommander: true, networkId: network.config.networkId, instruction: Instructions.NETWORK_NEW});
    var device = network._getDeviceForHardwareId(hardwareId);
    if (device) {
      network.emit('deviceConnectExisting', {device: device});
      outbound.deviceId = device.deviceId;
      resolve(outbound);
    }
    else {
      var device = new Device({hardwareId: hardwareId});
      device.save(network.db).success(function () {
        network.devices.push(device);
        outbound.deviceId = device.deviceId;
        network.emit('deviceConnectNew', {device: device});
        resolve(outbound);
      }).fail(reject);
    }
  });
};
//---------- NETWORK_CONFIRM ----------
Network.prototype._process[Instructions.NETWORK_CONFIRM] = function (message) {
  var network = this;
  return new Promise(function (resolve, reject) {
    var device = network._getDevice(message.deviceId);
    var outbound;
    if (!device) {
      network.emit('deviceInvalid', {deviceId: message.deviceId});
      outbound = new Message({data: message.data, instruction: Instructions.NETWORK_INVALID});
      resolve(outbound);
    }
    else {
      var sequence = Promise();
      if (!device.confirmed) {
        sequence = sequence.then(device.confirm(network.db));
        network.emit('deviceConfirmNew', {device: device});
      }
      else {
        network.emit('deviceConfirmExisting', {device: device})
      }
      if (message.isRelay) {
        sequence = sequence.then(network._getNextMessage(device)).then(function (input) {
          outbound = input;
        });
      }
      else
        outbound = new Message({networkId: network.config.networkId, deviceId: message.deviceId, fromCommander: true, instruction: Instructions.PING});
      sequence.success(function () {
        resolve(outbound);
      });
    }
  });
};
//---------- PING_CONFIRM ----------
Network.prototype._process[Instructions.PING_CONFIRM] = function (message) {
  var network = this;
  return new Promise(function (resolve, reject) {
    var device = network._getDevice(message.deviceId);
    var outbound;
    if (!device) {
      network.emit('deviceInvalid', {deviceId: message.deviceId});
      outbound = new Message({data: message.data, instruction: Instructions.NETWORK_INVALID});
      resolve(outbound);
    }
    else {
      network.emit('pingConfirm', {device: device});
      var sequence = Promise();
      if (!message.isRelay) {
        sequence = sequence.then(network._getNextMessage(device).success(function (val) {
          outbound = val;
        }));
      }
      if (!message.isRelay) {
        outbound = network._getNextMessage(device);
      }
      sequence.success(function () {
        resolve(outbound);
      });
    }
  });
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