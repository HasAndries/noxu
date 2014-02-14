var extend = require('node.extend');
var EventEmitter = require('events').EventEmitter;
var RfClient = require('./rfClient');
var util = require('util');
var fs = require('fs');
var common = require('./common');
var CommandMessage = require('./commandMessage');
var instructions = require('./instructions');

function CommandNetwork(options){
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
  this.client.on('configured', function(config){
    this.emit('configured', config);
  });
  this.client.on('configureError', function(){
    console.log('Could not send configuration to RFServer');
  });
  extend(this, common);
  this.configure(options);
  this._loadNodes();
}
util.inherits(CommandNetwork, EventEmitter);

//========== private ==========
CommandNetwork.prototype._newNode = function(tempId){
  var newNode = {id: 1+this.nodes.length, tempId: tempId};
  this.nodes.push(newNode);
  this._saveNodes();
  return newNode;
};
CommandNetwork.prototype._saveNodes = function(){
  var json = JSON.stringify(this.nodes);
  fs.writeFile('nodes.txt', json, function(err){
    if (!err) this.emitSuccess('savedNodes');
    else this.emitError('saveNodesError');
  }.bind(this));
};
CommandNetwork.prototype._loadNodes = function(){
  fs.readFile('nodes.txt', function(err, data){
    if (!err){
      this.nodes = JSON.parse(data);
      this.emitSuccess('loadedNodes');
    }
    else this.emitError('loadNodesError');
  }.bind(this));
};
CommandNetwork.prototype._processInbound = function(address, message){
  if(message.instruction == instructions.REQ_NETWORKID){
    var tempId = message.data.readUInt16LE(0);
    //reply
    message.fromCommander = true;
    message.instruction = instructions.RES_NETWORKID;
    //resize buffer
    var data = new Buffer(3);
    message.data.copy(data, 0, 0);
    message.data = data;
    //allocate new node id
    var node = this._newNode(tempId);
    message.data.writeUInt8(node.id, 2);
    console.log('New Node: ' + JSON.stringify(node));
    this.sendMessage(message.data[2], message);
  }
};
//========== public ==========
CommandNetwork.prototype.start = function(http){
  var _this = this;
  http.createServer(_this.client.app).listen(_this.client.app.get('port'), function () {
    console.log('Network Client listening on port ' + _this.client.app.get('port'));
  });
};
CommandNetwork.prototype.configure = function(config){
  this.client.configure(config);
};
CommandNetwork.prototype.getNodes = function(){
  return extend([], this.nodes);
};
CommandNetwork.prototype.send = function(nodeId, instruction, data){
  var message = new CommandMessage({fromCommander:true, instruction: instruction, data: data, bufferSize: this.bufferSize});
  this.sendMessage(nodeId, message);
};
CommandNetwork.prototype.sendMessage = function(nodeId, message){
  console.log('send message to node(' + nodeId || '**ALL**' + ') ' + JSON.stringify(message));
  if (nodeId)
    message.hops.push(nodeId);
  this.client.send(this.pipes.broadcast.address, message.toBuffer());
};
CommandNetwork.prototype.ping = function(id){
  this.send(id, instructions.REQ_PING, process.hrtime());
};

module.exports = CommandNetwork;