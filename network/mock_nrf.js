var events = require('events');

exports.connect = function (spi, ce, irq) {
  var nrf = new events.EventEmitter();

  nrf.powerUp = function (val, cb) {
  };

  nrf.channel = function (val, cb) {
  };

  nrf.dataRate = function (val, cb) {
  };

  nrf.transmitPower = function (val, cb) {
  };

  nrf.crcBytes = function (val, cb) {
  };

  nrf.addressWidth = function (val, cb) {
  };

  nrf.autoRetransmit = function (val, cb) {
  };

  nrf.readPayload = function (opts, cb) {
  };
  nrf.sendPayload = function (data, opts, cb) {
  };
  nrf.reset = function (states, cb) {
  };
  nrf.begin = function (cb) {
  };
  nrf.end = function (cb) {
  };
  nrf.openPipe = function (rx_tx, addr, opts) {
  };

  return nrf;
}