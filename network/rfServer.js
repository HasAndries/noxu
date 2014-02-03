var http = require('http');
var express = require('express');
var extend = require('node.extend');
var path = require('path');
var url = require('url');
var NRF24 = require('nrf');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

function RfServer() {
  EventEmitter.call(this);
  var _this = this;
  _this.app = null;
  _this.client = null;
  _this.inbound = null;
  _this.radio = null;
  _this.config = null;
  _this.defaultConfig = {
    bufferSize: 32,
    channel: 0x4c,
    dataRate: '1Mbps',
    crcBytes: 2,
    retryCount: 1,
    retryDelay: 250,
    spiDev: '/dev/spidev0.0',
    pinCe: 24,
    pinIrq: 25,
    broadcastAddress: 0xF0F0F0F0F0,
    commandAddress: 0xC1
  };

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
    _this.radio.on('ready', function () {
      _this.radio.printDetails();
      res.end();
    });
  });
  app.post('/send', function (req, res) {
    _this.send(req.body);
    res.end();
  });
  _this.app = app;
}
util.inherits(RfServer, EventEmitter);

RfServer.prototype.configure = function (options) {
  var _this = this;
  var config = extend({}, _this.defaultConfig, options);
  _this.config = config;
  //stop radio
  if (_this.inbound && _this.inbound.broadcast) {
    _this.inbound.broadcast.close();
    _this.inbound.command.close();
  }
  var inbound = {};
  _this.inbound = inbound;
  //clientUrl
  if (!options.clientUrl) throw new error('Need a clientUrl');
  var client = url.parse(options.clientUrl);
  _this.client = client;
  client.method = 'POST';
  client.headers = { 'Content-Type': 'application/json', 'Content-Length': 0 };
  //setup radio
  var radio = NRF24.connect(config.spiDev, config.pinCe, config.pinIrq);
  _this.radio = radio;
  radio.end();
  radio.channel(config.channel).transmitPower('PA_MAX').dataRate(config.dataRate).crcBytes(config.crcBytes).autoRetransmit({count: config.retryCount, delay: config.retryDelay});
  //radio._debug = true;
  //setup radio pipes
  radio.begin(function () {
    inbound.broadcast = radio.openPipe('rx', config.broadcastAddress);
    inbound.broadcast.on('data', function (buffer) {
      _this.receive(config.broadcastAddress, buffer);
    });
    inbound.broadcast.on('error', function (err) {
      console.log(['BROADCAST ERROR>>', err].join(''));
    });
    //var commandAddress = new Buffer(('0'+config.commandAddress.toString(16)).substr(-2), 'hex');
    //inbound.command = radio.openPipe('rx', commandAddress);
    inbound.command = radio.openPipe('rx', config.commandAddress+0xF0F0F0F000);
    inbound.command.on('data', function (bytes) {
      _this.receive(config.commandAddress, bytes);
    });
    inbound.command.on('error', function (err) {
      console.log(['COMMAND ERROR>>', err].join(''));
    });
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
  var json = JSON.stringify({address: address, data: buffer});

  var request = extend({}, _this.client);
  request.headers['Content-Length'] = json.length;
  request.path = '/receive/';
  var req = http.request(request);
  console.log(['RECEIVE>>', json].join(''));
  req.end(json);
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
RfServer.prototype.start = function(http){
  var _this = this;
  http.createServer(_this.app).listen(_this.app.get('port'), function () {
    console.log('Network Client listening on port ' + _this.app.get('port'));
  });
};

module.exports = RfServer;
