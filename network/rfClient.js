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
