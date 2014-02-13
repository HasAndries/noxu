var extend = require('node.extend');
var express = require('express');
var path = require('path');
var url = require('url');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var common = require('./common');

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
    clientUrl: 'http://10.0.0.38:9200/'
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
  extend(this, common);
}
util.inherits(RfClient, EventEmitter);
//========== private ==========
RfClient.prototype._sendRequest = function(host, path, data, success, error){
  var json = JSON.stringify(data);
  var request = extend({}, host);
  request.headers['Content-Length'] = json.length;
  request.path = path;
  var req = http.request(request);
  req.on('data', success.bind(this));
  req.on('error', error.bind(this));
  req.end(data);
};
RfClient.prototype._emitFunc = function(name){
  var _this = this;
  return function(obj){
    _this.emit(name, obj);
  }
};
//========== public ==========
RfClient.prototype.configure = function(options){
  var _this = this;
  var config = extend({}, _this.defaultConfig, _this.config || {}, options || {});
  if (!options.serverUrl) throw new Error('Need a serverUrl');
  this.config = config;
  //serverUrl
  var server = url.parse(options.serverUrl);
  this.server = server;
  server.method = 'POST';
  server.headers = {
    'Content-Type': 'application/json',
    'Content-Length': 0
  };
  common.sendRequest(this.server, '/configure/', this.config, this.emitSuccess('configured'), this.emitError('configureError'));
};
RfClient.prototype.send = function(address, data){
  common.sendRequest(this.server, '/send/', {address: address, data: data}, this.emitSuccess('sent'), this.emitError('sendError'));
};

module.exports = RfClient;
