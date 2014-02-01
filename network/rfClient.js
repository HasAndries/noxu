var http = require('http');
var extend = require('node.extend');
var express = require('express');
var path = require('path');
var url = require('url');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

function RfClient(){
  EventEmitter.call(this);
  var _this = this;
  this.app = null;
  this.server = null;
  this.config = null;
  this.defaultConfig = {
    channel: 0x4c,
    dataRate: '1Mbps',
    crcBytes: 2,
    retryCount: 1,
    retryDelay: 250,
    spiDev: '/dev/spidev0.0',
    pinCe: 24,
    pinIrq: 25,
    broadcastAddress: 0xF0F0F0F0F0,
    commandAddress: 0xF0F0F0F0F1
  };

  //Express App
  var app = express();
  var env = app.get('env');
  app.set('port', process.env.PORT || 9200);
  if (env == 'development') {
    app.use(express.errorHandler());
  }
  app.use(express.logger());
  app.use(express.bodyParser());
  app.get('/', function (req, res) {
    res.end('nrf client');
  });
  app.post('/receive', function (req, res) {
    _this.emit('receive', req.body);
    res.end();
  });
  this.app = app;
}
util.inherits(RfClient, EventEmitter);
RfClient.prototype.configure = function(options){
  var _this = this;
  var config = extend({}, _this.defaultConfig, options);
  if (!options.serverUrl) throw new Error('Need a serverUrl');
  //serverUrl
  var server = url.parse(options.serverUrl);
  server.method = 'POST';
  server.headers = {
    'Content-Type': 'application/json',
    'Content-Length': 0
  };
  //send config to server
  var data = JSON.stringify(extend({clientUrl: 'http://10.0.0.38:9200/'}, config));
  var request = extend({}, server);
  request.headers['Content-Length'] = data.length;
  request.path = '/configure/';
  var req = http.request(request);
  req.end(data);

  _this.server = server;
};
RfClient.prototype.send = function(address, data){
  var request = extend({}, this.server);
  var json = JSON.stringify({address: address, data: data});
  console.log(['SEND>>', json].join(''));
  request.headers['Content-Length'] = json.length;
  request.path = '/send/';
  var req = http.request(request);
  req.end(json);
};

module.exports = RfClient;

