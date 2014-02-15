var express = require('express');
var extend = require('node.extend');
var path = require('path');
var url = require('url');
//var NRF24 = require('nrf');
var BoneRF24 = require('./boneRF24');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var common = require('./common');
var consts = require('./consts');
var bignum = require('bignum');

function RfServer(options) {
  EventEmitter.call(this);
  var _this = this;
  _this.app = null;
  _this.client = null;
  _this.inbound = null;
  _this.radio = null;
  _this.defaultConfig = {
    bufferSize: 32,
    channel: 0x4c,
    dataRate: '1Mbps',
    crcBytes: 2,
    retryCount: 1,
    retryDelay: 250,
    spiDev: '/dev/spidev0.0',
    pinCe: 24,
    pinCsn: 8,
    pinIrq: 25,
    address: 0xF0F0F0F0F0
  };
  this.config = extend({}, _this.defaultConfig, options);

  //Express App
  var app = express();
  var env = app.get('env');
  app.set('port', process.env.PORT || 9100);
  if (env == 'development') {
    app.use(express.errorHandler());
  }
  app.use(express.logger());
  app.use(express.bodyParser());
  app.get('/', function (req, res) {
    res.end('nrf server');
  });
  app.post('/configure', function (req, res) {
    try {
      _this.configure(req.body);
    }
    catch (err) {
      res.write(JSON.stringify(err));
    }
    _this.radio.once('ready', function () {
      res.end();
    });
  });
  app.post('/send', function (req, res) {
    _this.send(req.body);
    res.end();
  });
  _this.app = app;
  extend(this, common);
}
util.inherits(RfServer, EventEmitter);

RfServer.prototype.configure = function (options) {
  var _this = this;
  var config = extend({}, _this.defaultConfig, _this.config || {}, options || {});
  _this.config = config;
  console.log(['CONFIGURE>>', JSON.stringify(config)].join(''));
  //stop radio
  if (_this.inbound) {
    _this.inbound.close();
  }
  _this.inbound = null;
  //clientUrl
  if (!config.clientUrl) throw new Error('Need a clientUrl');
  var client = url.parse(config.clientUrl);
  _this.client = client;
  client.method = 'POST';
  client.headers = { 'Content-Type': 'application/json', 'Content-Length': 0 };
  //setup radio
  //var radio = NRF24.connect(config.spiDev, config.pinCe, config.pinIrq);
  var radio = new BoneRF24();
  _this.radio = radio;
  radio.spiDev = config.spiDev;
  //radio.cePin = config.pinCe;
  //radio.csnPin = config.pinCsn;
  radio.channel = config.channel;
  radio.payload = 32;
  radio.address = config.address;
  radio.setPower(3);
  radio.setDataRate(config.dataRate);
  radio.setCRC(config.crcBytes);
  radio.setRetries(config.retryDelay, config.retryCount);
  radio.startReceiving();
};
RfServer.prototype.receive = function (address, data) {
  var _this = this;
  //reverse the data
  var buffer = new Buffer(_this.config.bufferSize);
  buffer.fill(0);
  //reverse the data
  for (var ct = 0; ct < data.length; ct++) {
    buffer[ct] = data[_this.config.bufferSize-1-ct];
  }
  var data = {address: address, data: buffer};
  console.log('RECEIVE>>' + JSON.stringify(data));

  common.sendRequest(this.client, '/receive/', data, common.emitSuccess('received'), common.emitError('receiveError'));
};
RfServer.prototype.send = function (options) {
  var _this = this;
  console.log(['SEND>>', JSON.stringify(options)].join(''));
  var buffer = new Buffer(_this.config.bufferSize);
  buffer.fill(0);
  //reverse the data
  for (var ct = 0; ct < options.data.length; ct++) {
    buffer[_this.config.bufferSize-1 - ct] = options.data[ct];
  }
  console.log(['SEND BUFFER>>', JSON.stringify(buffer)].join(''));
  _this.radio.setToAddr(bignum(options.address.toString(16), 16).toBuffer());
  _this.radio.send(buffer);

  var output = _this.radio.openPipe('tx', options.address);
  output.on('ready', function () {
    output.write(buffer);
    output.close();
  });
  output.on('error', function (err) {
    console.log(['SEND ERROR>>', err].join(''));
    output.close();
  });
};
RfServer.prototype.start = function(http, config){
  var _this = this;
  http.createServer(_this.app).listen(_this.app.get('port'), function () {
    console.log('Network Client listening on port ' + _this.app.get('port'));
    _this.configure(config);
  });
  this.loop();
};

RfServer.prototype.loop = function(){
  if (this.radio && this.radio.dataReady()) {
    var data = this.radio.getData();
    this.receive(this.config.address, data);
  }
  setImmediate(this.loop.bind(this));
};

module.exports = RfServer;
