var express = require('express');
var extend = require('node.extend');
var path = require('path');
var url = require('url');
var RF24 = require('../rf24');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var common = require('./common');

function RfServer(options) {
  EventEmitter.call(this);
  var _this = this;
  this.app = null;
  this.client = null;
  this.radio = null;
  this.outbound = [];
  this.ready = false;
  this.config = {
    bufferSize: 32,
    channel: 0x4c,
    dataRate: RF24.DataRate.kb1000,
    crcBytes: RF24.Crc.bit16,
    retryCount: 1,
    retryDelay: 250,
    spiDev: '/dev/spidev0.0',
    pinCe: 24,
    address: 0xF0F0F0F0F0
  };
  extend(this.config, options);

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
    res.end();
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
  this.ready = false;
  var config = extend({}, _this.defaultConfig, _this.config || {}, options || {});
  _this.config = config;
  console.log(['CONFIGURE>>', JSON.stringify(config)].join(''));
  //clientUrl
  if (!config.clientUrl) throw new Error('Need a clientUrl');
  var client = url.parse(config.clientUrl);
  _this.client = client;
  client.method = 'POST';
  client.headers = { 'Content-Type': 'application/json', 'Content-Length': 0 };
  //setup radio
  //var radio = NRF24.connect(config.spiDev, config.pinCe, config.pinIrq);
  var radio = new RF24(config.spiDev, config.pinCe);
  this.radio = radio;
  console.log(JSON.stringify(radio));
  radio.begin();
  radio.setPALevel(RF24.Power.max);
  radio.setChannel(config.channel);
  radio.setCRCLength(config.crcBytes);
  radio.setDataRate(config.dataRate);
  radio.setRetries(config.retryCount, config.retryDelay);
  radio.setPayloadSize(config.bufferSize);
  radio.enableDynamicPayloads();
  radio.setAutoAck(false);
  radio.powerUp();
  radio.printDetails();
  this.ready = true;
  radio.startListening();

  this.on('receiveError', function(){
    console.log('There is a problem sending to the RFClient: %s', config.clientUrl)
  });
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

  common.sendRequest(this.client, '/receive/', data, common.emitSuccess('received'), common.emitError('receiveError', _this));
};
RfServer.prototype.send = function (options) {
  var _this = this;
  console.log(['SEND>>', JSON.stringify(options)].join(''));
  var buffer = new Buffer(_this.config.bufferSize);
  buffer.fill(0);
  //reverse the data
  for (var ct = 0; ct < options.data.length; ct++) {
    buffer[ct] = options.data[ct];
  }
  this.outbound.push(buffer);
};
RfServer.prototype.start = function(http, config){
  var _this = this;
  http.createServer(_this.app).listen(_this.app.get('port'), function () {
    console.log('Network Client listening on port ' + _this.app.get('port'));
    _this.configure(config);
  });
  this.loop();
};

RfServer.prototype.processInbound = function(){
  var _this = this;
  var avail = this.radio.available();
  if (avail.any){
    var data = this.radio.read();
    var buffer = new Buffer(this.config.bufferSize);
    buffer.fill(0);
    data.copy(buffer);
    var retVal = {pipeNum: avail.pipeNum, data: buffer};
    console.log('INBOUND>>' + JSON.stringify(retVal));

    common.sendRequest(this.client, '/receive/', retVal, common.emitSuccess('received'), common.emitError('receiveError', _this));
  }
};

RfServer.prototype.processOutbound = function(){
  if (!this.outbound.length) return;

  this.radio.stopListening();
  this.radio.openWritingPipe(this.config.address);

  while(this.outbound.length){
    var buffer = this.outbound.shift();
    console.log(['OUTBOUND>>', JSON.stringify(buffer)].join(''));
    this.radio.write(buffer);
  }

  this.radio.startListening();
};

RfServer.prototype.loop = function(){
  if (this.ready){
    this.processInbound();
    this.processOutbound();
  }
  setImmediate(this.loop.bind(this));
};

module.exports = RfServer;
