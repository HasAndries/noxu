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
    base: { address: 0xF0F0F0F000 },
    broadcast: { id: 0xF0, address: 0xF0 },
    command: { id: 0xC1, address: 0xC1 }
  };
  this.client = new RfClient();
  this.client.on('receive', function(json){
    console.log(['NETWORK IN>>', JSON.stringify(json)].join(''));
    var message = new CommandMessage({data: json.data, bufferSize: _this.bufferSize});
    //console.log(JSON.stringify(message));
    _this._processInbound(json.address, message);
  });
}
util.inherits(CommandNetwork, EventEmitter);

CommandNetwork.instructions = {
  REQ_COMMAND: 0, RES_COMMAND: 100,//broadcast
  REQ_NETWORKID: 1, RES_NETWORKID: 101//broadcast, comma
};
CommandNetwork.prototype.configure = function(config){
  this.client.configure(config);
};
CommandNetwork.prototype.broadcast = function(instruction, data){
  var message = new CommandMessage({fromCommander:true, instruction: instruction, data: data, bufferSize: this.bufferSize});
  this.broadcastMessage(message);
};
CommandNetwork.prototype.broadcastMessage = function(message){
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
CommandNetwork.prototype._processInbound = function(address, message){
  if(message.instruction == CommandNetwork.instructions.REQ_COMMAND){
    var tempId = message.data.readUInt16LE(0);
    message.fromCommander = true;
    message.instruction = CommandNetwork.instructions.RES_COMMAND;
    var data = new Buffer(3);
    message.data.copy(data, 0, 0);
    data[2] = this.pipes.command.id;
    message.data = data;
    this.broadcastMessage(message);
  }
}
module.exports = CommandNetwork;