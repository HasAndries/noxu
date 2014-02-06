var http = require('http');
var express = require('express');
var extend = require('node.extend');
var path = require('path');
var url = require('url');
var RF = require('./rf');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

function RfServer() {
  EventEmitter.call(this);
  var _this = this;
  this.shouldRun = false;
  this.canStop = false;
  this.server = null;
  this.app = null;
  this.client = null;
  this.radio = null;
  this.config = null;
  this.defaultConfig = {
    bufferSize: 32,
    channel: 0x4c,
    dataRate: 1000,
    txPower: 0,
    crcBytes: 2,
    retryCount: 1,
    retryDelay: 250,
    spiDev: '/dev/spidev0.0',
    pinCe: 24,
    pinIrq: 25,
    broadcastAddress: 0xF0F0F0F0F0,
    commandAddress: 0xC1
  };
  this.outboundQueue = [];

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
      console.log(['CONFIGURE>>', JSON.stringify(req.body)].join(''));
      _this.configure(req.body);
    }
    catch (err) {
      res.write(JSON.stringify(err));
    }
  });
  app.post('/send', function (req, res) {
    _this.send(req.body);
    res.end();
  });
  this.app = app;
}
util.inherits(RfServer, EventEmitter);

RfServer.prototype.configure = function (options) {
  var config = extend({}, this.defaultConfig, options);
  this.config = config;
  //clientUrl
  if (!options.clientUrl) throw new error('Need a clientUrl');
  var client = url.parse(options.clientUrl);
  this.client = client;
  client.method = 'POST';
  client.headers = { 'Content-Type': 'application/json', 'Content-Length': 0 };
  //setup radio
  var radio = new RF(config.spiDev, config.pinCe);
  this.radio = radio;
  radio.debug = true;
  radio.setPWR(1);
  radio.setCRC(1);
  radio.setAddrWidth(5);
  radio.setRxAddress(1, config.broadcastAddress);
  radio.setRxAddress(2, config.commandAddress);
  radio.setChannel(config.channel);
  radio.setRate(RfServer.DATA_RATE[config.dataRate]);
  radio.setTxPower(RfServer.DATA_RATE[config.txPower]);
  radio.setPayloadWidth(32);
  //radio.setAutoAck(1);
  //radio.setDynPdTx(1);
  //radio.setDynPdRx(1, 1);
  //radio.setDynPdRx(2, 1);
  radio.on('data', function(pipeNum, data){
    this.receive(pipeNum == 1 && config.broadcastAddress || config.commandAddress, data);
  }.bind(this));
  radio.setRXTX('rx');
  this.loop();
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
  var json = JSON.stringify({address: address, data: buffer});

  var request = extend({}, _this.client);
  request.headers['Content-Length'] = json.length;
  request.path = '/receive/';
  var req = http.request(request);
  console.log(['RECEIVE>>', json].join(''));
  req.end(json);
};
RfServer.prototype.send = function (options) {
  console.log(['SEND>>', JSON.stringify(options)].join(''));
  var buffer = new Buffer(this.config.bufferSize);
  buffer.fill(0);
  //reverse the data
  for (var ct = 0; ct < options.data.length; ct++) {
    buffer[this.config.bufferSize-1 - ct] = options.data[ct];
  }
  console.log(['SEND BUFFER>>', JSON.stringify(buffer)].join(''));
  this.radio.setRXTX('tx');
  this.radio.setTxAddress(options.address);
  this.radio.sendData(buffer);
  this.radio.setRXTX('rx');
};
RfServer.prototype.loop = function(){
  if(!this.shouldRun) return;
  this.radio.rxpoll();

  process.nextTick(this.loop.bind(this));
};
RfServer.prototype.start = function(http){
  this.shouldRun = true;
  this.server = http.createServer(this.app).listen(this.app.get('port'), function () {
    console.log('Network Client listening on port ' + this.app.get('port'));
    }.bind(this));
  this.server.on('listening', function(){
    this.canStop = true;
  });
};
RfServer.prototype.stop = function(http){
  if (!this.shouldRun){
    this.emit('error', 'stop() -> Server cannot be stopped, server not running.');
    return;
  }
  if (!this.canStop){
    this.emit('error', 'stop() -> Server cannot be stopped, waiting for "listening event".');
    return;
  }
  this.shouldRun = false;
  this.canStop = false;
}
RfServer.DATA_RATE = {
  2000 : 2,
  1000 : 1,
  250 : 0
};
RfServer.TX_POWER = {
  0 : 3,
  6 : 2,
  12 : 1,
  18 : 0
};
module.exports = RfServer;
