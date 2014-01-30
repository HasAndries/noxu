var http = require('http');
var express = require('express');
var extend = require('node.extend');
var path = require('path');
var url = require('url');
var nrf = require('nrf');

module.exports = function () {
  var rfServer = require('events').EventEmitter;
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
      configure(req.body, rfServer.client, rfServer.inbound);
    }
    catch (err) {
      res.write(JSON.stringify(err));
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
  function configure(options, client, inbound) {
    console.log(['CONFIGURE>>', JSON.stringify(options)].join(''));
    var config = extend({
      channel: 0,
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
    if (inbound && inbound.broadcast) {
      inbound.broadcast.end();
      inbound.command.end();
    }
    inbound = {};
    //clientUrl
    if (!options.clientUrl) throw new error('Need a clientUrl')
    client = url.parse(options.clientUrl);
    client.method = 'POST';
    client.headers = { 'Content-Type': 'application/json', 'Content-Length': 0 };
    //setup radio
    var radio = nrf.connect(config.spiDev, config.pinCe, config.pinIrq);
    radio.channel(config.channel).dataRate(config.dataRate).crcBytes(config.crcBytes).autoRetransmit({count: config.retryCount, delay: config.retryDelay});
    //setup radio pipes
    radio.begin(function () {
//      inbound.broadcast = radio.openPipe('rx', config.broadcastAddress);
//      inbound.broadcast.on('data', function (data) {
//        console.log('DATA ON THE WAY!!!');
//        console.log(['INBOUND>>', JSON.stringify(data)].join(''));
//        clientReceive(config.broadcastAddress, data);
//      });
//      inbound.broadcast.on('error', function (err) {
//        console.log(['ERROR COMMAND>>', err].join(''));
//      });
//      inbound.command = radio.openPipe('rx', config.commandAddress);
//      inbound.command.on('data', function (data) {
//        console.log('DATA ON THE WAY!!!');
//        console.log(['INBOUND>>', JSON.stringify(data)].join(''));
//        clientReceive(config.commandAddress, data);
//      });
//      inbound.command.on('error', function (err) {
//        console.log(['ERROR COMMAND>>', err].join(''));
//      });
    });
    radio.on('ready', function () {
      //console.log('********** READY **********')
    });
    radio.printDetails();
    rfServer.radio = radio;
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
    output.on('error', function (err) {
      console.log(['ERROR SENDING>>', err].join(''));
    });
    console.log(['SEND>>', JSON.stringify(options)].join(''));
    output.write(new Buffer(options.data));
    output.end();
  };

  return rfServer;
};
