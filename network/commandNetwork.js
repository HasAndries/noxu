var events = require('events');
var extend = require('node.extend');
var commandMessage = require('./commandMessage')

var client, nodes;

//========== build ==========
module.exports = function (config) {
  var network = new events.EventEmitter();
  //---------- PROPERTIES ----------
  var pipes = {
    base: { address: 0xF0F0F0F0F0 },
    broadcast: { id: 0, address: 0xF0F0F0F0F0 },
    command: { id: 1, address: 0xF0F0F0F0F1 }
  };
  nodes = {};
  client = require('./rfClient')(config);
  client.on('receive', function(json){
    var message = commandMessage({buffer: json.data});
    console.log(['INBOUND>>', JSON.stringify(json)].join(''));
  });
  //---------- broadcast ----------
  network.configure = function (config) {
   client.configure(config);
  };
  //---------- broadcast ----------
  network.broadcast = function (instruction, data) {
    var message = commandMessage({instruction: instruction, data: data});
    client.send(pipes.broadcast.address, message.toBuffer());
  };
  //---------- command ----------
  network.command = function (destinationId, instruction, data) {
    var address = pipes.base+destinationId;
    var message = commandMessage.build(instruction, data);
    client.send(address, message.toBuffer());
  };
  return network;
};