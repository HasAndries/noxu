var events = require('events');
var extend = require('node.extend');
var commandMessage = require('commandMessage')

function makeRadio(config){var nrf;
  try {
    nrf = require('nrf');
  }
  catch (e) {
    nrf = require('mock_nrf');
  }
  var radio = nrf.connect(_config.pinSpi, _config.pinCe, _config.pinIrq);
  radio.channel(_config.channel).dataRate(_config.dataRate).crcBytes(_config.crcBytes).autoRetransmit({count: _config.retryCount, delay: _config.retryDelay});
  radio.begin();
  return radio;
}
//========== dataRates ==========
exports.dataRates = {
  kb2000: '2Mbps',
  kb1000: '1Mbps',
  kb250: '250kbps'
}
//========== build ==========
exports.build = function (config) {
  var network = new events.EventEmitter();
  //---------- PROPERTIES ----------
  var _config = $.extend({
    channel: 0,
    dataRate: exports.dataRates.kb1000,
    crcBytes: 1,
    retryCount: 1,
    retryDelay: 250,
    pinSpi: 9,
    pinCe: 10,
    pinIrq: 11
  }, config);
  var pipes = {
    base: { address: 0xF0F0F0F0F0 },
    broadcast: { id: 0, address: 0xF0F0F0F0F0 },
    command: { id: 1, address: 0xF0F0F0F0F1 }
  };
  var nodes = {};
  var radio = makeRadio(_config);
  radio.on('ready', function(){
    pipes.broadcast.stream = radio.openPipe('rx', pipes.broadcast.address);
    pipes.command.stream = radio.openPipe('rx', pipes.command.address);
    network.emit('ready');
  });
  //---------- broadcast ----------
  network.broadcast = function (instruction, data) {
    var message = commandMessage.build(instruction, data);
    var output = radio.openPipe('tx', pipes.broadcast.address);
    output.write(message.buildBuffer())
  };
  //---------- command ----------
  network.command = function (destinationId, instruction, data) {
    var address = pipes.base+destinationId;
    var message = commandMessage.build(instruction, data);
    var output = radio.openPipe('tx', address);
    output.write(message.buildBuffer())
  };

};