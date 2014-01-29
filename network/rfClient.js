var http = require('http');
var extend = require('node.extend');
var express = require('express');
var path = require('path');
var url = require('url');

module.exports = function (config) {
  var rfClient = require('events').EventEmitter;
  rfClient.app = null;
  rfClient.server = null;
  //========== EXPRESS APP ==========
  var app = express();
  var env = app.get('env');
  app.set('port', process.env.PORT || 9200);
  if (env == 'development') {
    app.use(express.errorHandler());
  }
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(app.router);
  //---------- home ----------
  app.get('/', function (req, res) {
    res.end('nrf client');
  });
  //---------- receive ----------
  app.post('/receive', function (req, res) {
    rfClient.emit('receive', req.body);
    res.end();
  });
  rfClient.app = app;

  configure(config, rfClient.server);
  //---------- configure ----------
  function configure(options, server) {
    var config = extend({
      channel: 0,
      dataRate: '1Mbps',
      crcBytes: 1,
      retryCount: 1,
      retryDelay: 250,
      spiDev: '/dev/spidev0.0',
      pinCe: 18,
      pinIrq: 22,
      broadcastAddress: 0xF0F0F0F0F0,
      commandAddress: 0xF0F0F0F0F1
    }, options);
    if (!options.serverUrl) throw new Error('Need a serverUrl')
    //serverUrl
    server = url.parse(options.serverUrl);
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
  }

  //---------- send ----------
  function send(address, data) {
    var request = extend({}, server);
    request.headers['Content-Length'] = data.length;
    request.path = '/send/';
    var req = http.request(request);
    req.end({address: address, data: data});
  }

  //---------- receive ----------
  function receive(data) {
    rfClient.emit('receive', data);
  }

  return rfClient;
};

