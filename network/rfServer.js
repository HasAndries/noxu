var http = require('http');
var express = require('express');
var extend = require('node.extend');
var path = require('path');
var url = require('url');
var nrf = require('nrf');
var EventEmitter = require('events').EventEmitter

module.exports = function () {
  var rfServer = new EventEmitter();
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
      console.log(['CONFIGURE>>', JSON.stringify(req.body)].join(''));
      configure(rfServer, req.body);
      rfServer.radio.printDetails();
    }
    catch (err) {
      res.write(JSON.stringify(err));
    }
    rfServer.radio.on('ready', function () {
      res.end();
    });
  });
  //---------- send ----------
  app.post('/send', function (req, res) {
    send(rfServer.radio, req.body);
    res.end();
  });
  rfServer.app = app;
  //========== RF ==========
  //---------- configure ----------
  function configure(rfServer, options) {
    var config = extend({
      channel: 0x4c,
      dataRate: '1Mbps',
      crcBytes: 1,
      retryCount: 1,
      retryDelay: 250,
      spiDev: '/dev/spidev0.0',
      pinCe: 24,
      pinIrq: 25,
      broadcastAddress: 0xF0F0F0F0F0,
      commandAddress: 0xF0F0F0F0F1
    }, options);
    //stop radio
    if (rfServer.inbound && rfServer.inbound.broadcast) {
      rfServer.inbound.broadcast.end();
      rfServer.inbound.command.end();
    }
    rfServer.inbound = {};
    //clientUrl
    if (!options.clientUrl) throw new error('Need a clientUrl')
    rfServer.client = url.parse(options.clientUrl);
    rfServer.client.method = 'POST';
    rfServer.client.headers = { 'Content-Type': 'application/json', 'Content-Length': 0 };
    //setup radio
    rfServer.radio = nrf.connect(config.spiDev, config.pinCe, config.pinIrq);
    rfServer.radio.channel(config.channel).transmitPower('PA_MAX').dataRate(config.dataRate).crcBytes(config.crcBytes).autoRetransmit({count: config.retryCount, delay: config.retryDelay});
    //setup radio pipes
    rfServer.radio.begin(function () {
      rfServer.inbound.broadcast = rfServer.radio.openPipe('rx', config.broadcastAddress);
      rfServer.inbound.broadcast.on('data', function (data) {
        console.log('DATA ON THE WAY!!!');
        console.log(['INBOUND>>', JSON.stringify(data)].join(''));
        clientReceive(config.broadcastAddress, data);
      });
      rfServer.inbound.broadcast.on('error', function (err) {
        console.log(['ERROR COMMAND>>', err].join(''));
      });
      rfServer.inbound.command = rfServer.radio.openPipe('rx', config.commandAddress);
      rfServer.inbound.command.on('data', function (data) {
        console.log('DATA ON THE WAY!!!');
        console.log(['INBOUND>>', JSON.stringify(data)].join(''));
        clientReceive(config.commandAddress, data);
      });
      rfServer.inbound.command.on('error', function (err) {
        console.log(['ERROR COMMAND>>', err].join(''));
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
    output.on('ready', function () {
      output.write(new Buffer(options.data));
      output.end();
    });
    output.on('error', function (err) {
      console.log(['ERROR SENDING>>', err].join(''));
    });
    console.log(['SEND>>', JSON.stringify(options)].join(''));
  };

  return rfServer;
};
