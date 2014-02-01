var events = require('events');
var extend = require('node.extend');
var EventEmitter = require('events').EventEmitter;
var RfClient = require('./rfClient');
var util = require('util');
var CommandMessage = require('./commandMessage');

function CommandNetwork(){
  EventEmitter.call(this);
  var _this = this;
  _this.bufferSize = 32;
  _this.pipes = {
    base: { address: 0xF0 },
    broadcast: { id: 0, address: 0xF0F0F0F0F0 },
    command: { id: 1, address: 0xF1 }
  };
  _this.client = new RfClient();
  _this.client.on('receive', function(json){
    console.log(['NETWORK IN>>', JSON.stringify(json)].join(''));
    var message = new CommandMessage({buffer: json.data, bufferSize: bufferSize});
  });
}
util.inherits(CommandNetwork, EventEmitter);
CommandNetwork.prototype.configure = function(config){
  this.client.configure(config);
};
CommandNetwork.prototype.broadcast = function(instruction, data){
  var message = new CommandMessage({fromCommander:true, instruction: instruction, data: data, bufferSize: this.bufferSize});
  console.log(JSON.stringify(message));
  this.client.send(this.pipes.broadcast.address, message.toBuffer());
};
CommandNetwork.prototype.command = function(destinationId, instruction, data){
  var address = this.pipes.base+destinationId;
  var message = new CommandMessage({fromCommander:true, instruction: instruction, data: data, bufferSize: this.bufferSize});
  this.client.send(address, message.toBuffer());
};

module.exports = CommandNetwork;