var _rf24 = require('./build/Release/rf24');
//var _rf24 = require('./build/Debug/rf24');

function RF24(spi, cePin, spiSpeed) {
  this.radio = new _rf24.Radio(spi || '/dev/spidev0.0', spiSpeed || 8000000, cePin || 25);
}

RF24.Power = { min: 0, low: 1, high: 2, max: 3, error: 4 };
RF24.DataRate = { kb1000: 0, kb2000: 1, kb250: 2 };
RF24.Crc = {disabled: 0, bit8: 1, bit16: 2};

RF24.prototype.begin = function () {
  this.radio.begin();
};
RF24.prototype.powerUp = function () {
  this.radio.powerUp();
};
RF24.prototype.powerDown = function () {
  this.radio.powerDown();
};
RF24.prototype.isPVariant = function () {
  return this.radio.isPVariant();
};
RF24.prototype.testCarrier = function () {
  return this.radio.testCarrier();
};
RF24.prototype.testRPD = function () {
  return this.radio.testRPD();
};
RF24.prototype.printDetails = function () {
  this.radio.printDetails();
};

RF24.prototype.openReadingPipe = function (pipeNum, address) {
  this.radio.openReadingPipe(pipeNum, address);
};
RF24.prototype.openWritingPipe = function (address) {
  this.radio.openWritingPipe(address);
};

RF24.prototype.startListening = function () {
  this.radio.startListening();
};
RF24.prototype.stopListening = function () {
  this.radio.stopListening();
};
RF24.prototype.available = function () {
  var pipeNum = this.radio.available();
  return {
    any: pipeNum != -1,
    pipeNum: pipeNum
  };
};
RF24.prototype.read = function () {
  return this.radio.read();
};
RF24.prototype.write = function (buffer) {
  this.radio.write(buffer);
};

RF24.prototype.setPALevel = function (pa) {
  this.radio.setPALevel(pa);
};
RF24.prototype.getPALevel = function () {
  return this.radio.getPALevel();
};

RF24.prototype.setChannel = function (channel) {
  this.radio.setChannel(channel);
};

RF24.prototype.setCRCLength = function (crc) {
  this.radio.setCRCLength(crc);
};
RF24.prototype.disableCRC = function () {
  this.radio.disableCRC();
};
RF24.prototype.getCRCLength = function () {
  return this.radio.getCRCLength();
};

RF24.prototype.setDataRate = function (dataRate) {
  this.radio.setDataRate(dataRate);
};
RF24.prototype.getDataRate = function () {
  return this.radio.getDataRate();
};

RF24.prototype.setRetries = function (delay, count) {
  this.radio.setRetries(delay, count);
};

RF24.prototype.setPayloadSize = function (size) {
  this.radio.setPayloadSize(size);
};
RF24.prototype.getPayloadSize = function () {
  return this.radio.getPayloadSize();
};
RF24.prototype.enableDynamicPayloads = function () {
  this.radio.enableDynamicPayloads();
};
RF24.prototype.getDynamicPayloadSize = function () {
  return this.radio.getDynamicPayloadSize();
};

RF24.prototype.setAutoAck = function (enable, pipeNum) {
  if (typeof pipeNum == 'undefined')
    this.radio.setAutoAck(enable);
  else
    this.radio.setAutoAck(enable, pipeNum);
};
RF24.prototype.enableAckPayload = function () {
  this.radio.enableAckPayload();
};

module.exports = RF24;