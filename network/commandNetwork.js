var events = require('events');
var extend = require('node.extend');
var EventEmitter = require('events').EventEmitter;
var RfClient = require('./rfClient');
var util = require('util');
var CommandMessage = require('./commandMessage');

function CommandNetwork(){
  EventEmitter.call(this);
  var _this = this;
  this.bufferSize = 32;
  this.pipes = {
    base: { address: 0x00 },
    broadcast: { id: 0, address: 0xF0F0F0F0F0 },
    command: { id: 1, address: 0x01 }
  };
  this.client = new RfClient();
  this.client.on('receive', function(json){
    console.log(['NETWORK IN>>', JSON.stringify(json)].join(''));
    var message = new CommandMessage({data: json.data, bufferSize: _this.bufferSize});
    console.log(JSON.stringify(message));
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
CommandNetwork.prototype.start = function(http){
  var _this = this;
  http.createServer(_this.client.app).listen(_this.client.app.get('port'), function () {
    console.log('Network Client listening on port ' + _this.client.app.get('port'));
  });
};
module.exports = CommandNetwork;