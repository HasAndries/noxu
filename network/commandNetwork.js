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
    broadcast: { id: 0xF0, address: 0xF0F0F0F0F0 }
  };
  this.nodes = [];
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
  REQ_NETWORKID: 1, RES_NETWORKID: 101
};
CommandNetwork.prototype.configure = function(config){
  this.client.configure(config);
};
CommandNetwork.prototype._nextNodeId = function(tempId){

};
CommandNetwork.prototype.send = function(nodeId, instruction, data){
  var message = new CommandMessage({fromCommander:true, instruction: instruction, data: data, bufferSize: this.bufferSize});
  this.sendMessage(nodeId, message);
};
CommandNetwork.prototype.sendMessage = function(nodeId, message){
  console.log('send message to node(' + nodeId + ') ' + JSON.stringify(message));
  this.client.send(this.pipes.broadcast.address, message.toBuffer());
};
CommandNetwork.prototype.start = function(http){
  var _this = this;
  http.createServer(_this.client.app).listen(_this.client.app.get('port'), function () {
    console.log('Network Client listening on port ' + _this.client.app.get('port'));
  });
};
CommandNetwork.prototype._processInbound = function(address, message){
  if(message.instruction == CommandNetwork.instructions.REQ_NETWORKID){
    var tempId = message.data.readUInt16LE(0);
    //reply
    message.fromCommander = true;
    message.instruction = CommandNetwork.instructions.RES_NETWORKID;
    //resize buffer
    var data = new Buffer(3);
    message.data.copy(data, 0, 0);
    message.data = data;
    //allocate new node id
    message.data[2] = this._nextNodeId(tempId);
    this.sendMessage(message.data[2], message);
  }
}
module.exports = CommandNetwork;