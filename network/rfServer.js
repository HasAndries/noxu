var http = require('http');
var express = require('express');
var path = require('path');
var url = require('url');
var nrf = require('nrf');

module.exports = function () {
  var rfServer = require('events').EventEmitter();
  rfServer.client = null;
  rfServer.app = null;
  rfServer.inbound = null;
  rfServer.radio = null;
  //========== EXPRESS APP ==========
  var app = express();
  var env = app.get('env');
  app.set('port', process.env.PORT || 9100);
  if (env == 'development') {
    app.use(express.errorHandler());
  }
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(app.router);
  //---------- home ----------
  app.get('/', function (req, res) {
    res.end('nrf server');
  });
  //---------- configure ----------
  app.post('/configure', function (req, res) {
    try {
      configure(req.body, rfServer.client, rfServer.inbound, rfServer.radio);
    }
    catch (err) {
      res.write(err);
    }
    res.end();
  });
  //---------- send ----------
  app.post('/send', function (req, res) {
    send(rfServer.radio, req.body);
    res.end();
  });
  rfServer.app = app;

  //---------- configure ----------
  function configure(options, client, inbound, radio) {
    var config = $.extend({
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
    //stop radio
    if (inbound && inbound.broadcast) {
      inbound.broadcast.end();
      inbound.command.end();
    }
    //clientUrl
    if (!options.clientUrl) throw new error('Need a clientUrl')
    client = url.parse(options.clientUrl);
    client.method = 'POST';
    client.headers = { 'Content-Type': 'application/json', 'Content-Length': 0 };
    //setup radio
    radio = nrf.connect(_config.spiDev, _config.pinCe, _config.pinIrq);
    radio.channel(_config.channel).dataRate(_config.dataRate).crcBytes(_config.crcBytes).autoRetransmit({count: _config.retryCount, delay: _config.retryDelay});
    radio.begin();
    //setup radio pipes
    inbound = {};
    radio.on('ready', function () {
      inbound.broadcast = radio.openPipe('rx', config.broadcastAddress);
      inbound.broadcast.on('readable', function () {
        clientReceive(config.broadcastAddress, inbound.broadcast.read());
      });
      inbound.command = radio.openPipe('rx', config.commandAddress);
      inbound.command.on('readable', function () {
        clientReceive(config.commandAddress, inbound.command.read());
      });
    });
  };
  //---------- postData ----------
  function clientReceive(address, data) {
    var request = extend({}, client);
    request.headers['Content-Length'] = data.length;
    request.path = '/receive/';
    var req = http.request(request);
    req.end({address: address, data: data});
  };
  //---------- send ----------
  function send(radio, options) {
    var output = radio.openPipe('tx', options.address);
    output.write(options.data);
    output.end();
  };

  return rfServer;
};
