var extend = require('node.extend');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var RF24 = require('../rf24');
var Message = require('./message');
var instructions = require('./instructions');

function Network(config){
  this.nodes = [];
  this.config = {
    bufferSize: 32,
    channel: 0x4c,
    dataRate: RF24.DataRate.kb1000,
    crcBytes: RF24.Crc.bit16,
    retryCount: 0,
    retryDelay: 0,
    spiDev: '/dev/spidev0.0',
    pinCe: 25,
    address: 0x00F0F0F0F0
  };
  extend(this.config, config);
  console.log(JSON.stringify(this.config));

  //setup rf device
  var radio = new RF24(config.spiDev, config.pinCe);
  this.radio = radio;
  radio.begin();
  radio.setPALevel(RF24.Power.max);
  radio.setChannel(this.config.channel);
  radio.setCRCLength(this.config.crcBytes);
  radio.setDataRate(this.config.dataRate);
  radio.setRetries(this.config.retryCount, this.config.retryDelay);
  radio.setPayloadSize(this.config.bufferSize);
  radio.enableDynamicPayloads();
  radio.setAutoAck(false);
  radio.powerUp();
  radio.openReadingPipe(1, this.config.address);
  radio.openWritingPipe(this.config.address);
  radio.printDetails();

  this._loadNodes();
}
util.inherits(Network, EventEmitter);

//========== PUBLIC ==========
Network.prototype.start = function(){
  this._start();
  this.running = true;
  this._loop();
};

Network.prototype.stop = function(){
  this._stop();
  this.running = false;
};

Network.prototype.send = function(obj){
  var list = obj instanceof Array && extend([], obj) || [obj];
  if (!list.length) return;
  //stop inbound
  if (this.running) this._stop();
  //write messages
  for(var ct in list){
    var buffer = list[ct].toBuffer();
    this.radio.write(buffer);
    this.emit('outbound', buffer);
  }
  //start inbound
  if (this.running) this._start();
};

//========== PRIVATE ==========
Network.prototype._loop = function(){
  //process inbound
  if (this.listening){
    var avail = this.radio.available();
    if (avail.any){
      var data = this.radio.read();
      var buffer = new Buffer(this.config.bufferSize);
      buffer.fill(0);
      data.copy(buffer);
      var message = new Message({data: data, bufferSize: this.config.bufferSize});
      this.emit('inbound', buffer);
      this._processInbound(message);
    }
    //var message = new Message({fromCommander:true, instruction: 4, data: [0,1], bufferSize: 32});
    //this.send([message]);
  }
  //loop
  if (this.running)
    setImmediate(this._loop.bind(this));
};

Network.prototype._start = function(){
  if (this.listening) return;
  this.radio.startListening();
  this.listening = true;
};

Network.prototype._stop = function(){
  if (!this.listening) return;
  this.radio.startListening();
  this.listening = true;
};

Network.prototype._processInbound = function(message){
  console.log(message);
  if(message.instruction == instructions.NETWORKID_REQ){
    var tempId = message.data.readUInt32LE(0);
    if (this._getNodeTempId(tempId)) return;//know this tempId
    message.fromCommander = true;
    message.instruction = instructions.NETWORKID_NEW;
    //allocate new node id
    var node = this._newNode(tempId);
    message.hops.push(node.id);
    this.emit('nodeNew', node);
    this.send(message);
  }
  else if(message.instruction == instructions.NETWORKID_CONFIRM){
    var node = this._getNode(message.hops[message.hops.length-1]);
    node.confirmed = true;
    this._saveNodes();
    this.emit('nodeConfirm', node);
  }
  else if(message.instruction == instructions.PING_REPLY){
    var node = this._getNode(message.hops[message.hops.length-1]);
    var diff = process.hrtime(node.pingStart);
    node.ping = diff[0] * 1e9 + diff[1];
    delete node.pingStart;
    this.emit('nodePing', node);
  }
};

Network.prototype._newNode = function(tempId){
  var newNode = {id: 1+this.nodes.length, tempId: tempId};
  this.nodes.push(newNode);
  this._saveNodes();
  return newNode;
};
Network.prototype._getNode = function(id){
  for(var ct=0;ct<this.nodes.length;ct++){
    if (this.nodes[ct].id == id) return this.nodes[ct];
  }
  return null;
};
Network.prototype._getNodeTempId = function(tempId){
  for(var ct=0;ct<this.nodes.length;ct++){
    if (this.nodes[ct].tempId == tempId) return this.nodes[ct];
  }
  return null;
};
Network.prototype._deleteNode = function(id){
  for(var ct=0;ct<this.nodes.length;ct++){
    if (this.nodes[ct].id == id) this.nodes.splice(ct, 1);
  }
  this._saveNodes();
};
Network.prototype._deleteNodesAll = function(){
  this.nodes = [];
  this._saveNodes();
};
Network.prototype._saveNodes = function(){
  var json = JSON.stringify(this.nodes);
  fs.writeFile('nodes.txt', json, function(err){
    if (!err) this.emit('savedNodes');
    else this.emit('saveNodesError', err);
  }.bind(this));
};
Network.prototype._loadNodes = function(){
  if (!fs.existsSync('nodes.txt')) return;
  fs.readFile('nodes.txt', function(err, data){
    if (!err){
      this.nodes = JSON.parse(data);
      this.emit('loadedNodes');
    }
    else this.emit('loadNodesError', err);
  }.bind(this));
};

module.exports = Network;