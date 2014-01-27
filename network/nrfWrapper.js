var express = require('express');
var path = require('path');
var url = require('url');

var app = express();
//########## WEB SETUP ##########
var env = app.get('env');
app.set('port', process.env.PORT || 9100);
if (env == 'development') {
  app.use(express.errorHandler());
}
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);

//########## WEB ROUTES ##########
app.get('/', function(req,res){
  req.end('nrf wrapper');
});
app.post('/config', function(req,res){
  configure(req.body);
  req.end();
});
app.post('/send', function(req,res){
  send(req.body);
  req.end();
});
app.post('/setReceiver', function(req,res){
  setReceiver(req.body);
  req.end();
});
//########## NRF ##########
var nrf = require('nrf');
var radio, inbound, receiver;
function makeRadio(config){
  radio = nrf.connect(_config.pinSpi, _config.pinCe, _config.pinIrq);
  radio.channel(_config.channel).dataRate(_config.dataRate).crcBytes(_config.crcBytes).autoRetransmit({count: _config.retryCount, delay: _config.retryDelay});
  radio.begin();
  return radio;
}
function configure(options){
  var config = $.extend({
    channel: 0,
    dataRate: exports.dataRates.kb1000,
    crcBytes: 1,
    retryCount: 1,
    retryDelay: 250,
    pinSpi: 9,
    pinCe: 10,
    pinIrq: 11,
    broadcastAddress: 0xF0F0F0F0F0,
    commandAddress: 0xF0F0F0F0F0
  }, options);
  if (inbound.broadcast){
    inbound.broadcast.end();
    inbound.command.end();
  }
  radio = makeRadio(config);
  inbound = {};
  radio.on('ready', function(){
    inbound.broadcast = radio.openPipe('rx', config.broadcastAddress);
    inbound.broadcast.on('readable', function(){
      postData('broadcast', inbound.broadcast.read());
    });
    inbound.command = radio.openPipe('rx', config.commandAddress);
    inbound.command.on('readable', function(){
      postData('command', inbound.command.read());
    });
  });
};
function postData(pipe, data){
  receiver.headers['Content-Length'] = data.length;
  var req = http.request(receiver);
  req.end({pipe: pipe, data: data});
};
exports.configure = function(options){
  configure(options);
};
exports.send = function(options){
  var output = radio.openPipe('tx', options.address);
  output.write(options.data);
  output.end();
};

exports.setReceiver = function(options){
  receiver = url.parse(options.url);
  receiver.method = 'POST';
  receiver.headers = {
    'Content-Type': 'application/json',
    'Content-Length': 0
  };
};