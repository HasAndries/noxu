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
CommandNetwork.prototype._getNode = function(id){
  for(var ct=0;ct<this.nodes.length;ct++){
    if (this.nodes[ct].id == id) return this.nodes[ct];
  }
  return null;
};
CommandNetwork.prototype._getNodeTempId = function(tempId){
  for(var ct=0;ct<this.nodes.length;ct++){
    if (this.nodes[ct].tempId == tempId) return this.nodes[ct];
  }
  return null;
};
CommandNetwork.prototype._deleteNode = function(id){
  for(var ct=0;ct<this.nodes.length;ct++){
    if (this.nodes[ct].id == id) this.nodes.splice(ct, 1);
  }
  this._saveNodes();
};
CommandNetwork.prototype._deleteNodesAll = function(){
  this.nodes = [];
  this._saveNodes();
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
  if(message.instruction == instructions.NETWORKID_REQ){
    var tempId = message.data.readUInt32LE(0);
    if (this._getNodeTempId(tempId)) return;
    //reply
    message.fromCommander = true;
    message.instruction = instructions.NETWORKID_NEW;
    //allocate new node id
    var node = this._newNode(tempId);
    console.log('New Node: ' + JSON.stringify(node));
    this.sendMessage(node.id, message);
  }
  else if(message.instruction == instructions.NETWORKID_CONFIRM){
    var node = this._getNode(message.hops[message.hops.length-1]);
    node.confirmed = true;
    this._saveNodes();
  }
  else if(message.instruction == instructions.PING_REPLY){
    var node = this._getNode(message.hops[message.hops.length-1]);
    var diff = process.hrtime(node.pingStart);
    node.ping = diff[0] * 1e9 + diff[1];
    delete node.pingStart;
    console.log('Ping Response Node('+node.id+') '+node.ping+'ns');
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
  if (nodeId)
    message.hops.push(nodeId);
  console.log('send message to node(' + (nodeId || '**ALL**') + ') ' + JSON.stringify(message));
  this.client.send(this.pipes.broadcast.address, message.toBuffer());
};
CommandNetwork.prototype.ping = function(id){
  if (id){
    this._getNode(id).pingStart = process.hrtime();
    this.send(id, instructions.PING, []);
  }
  else{
    for(var ct=0;ct<this.nodes.length;ct++){
      this.nodes[ct].pingStart = process.hrtime();
      this.send(this.nodes[ct].id, instructions.PING, []);
    }
  }
};

module.exports = CommandNetwork;