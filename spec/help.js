var Message = require('../network/message');
var Instructions = require('../network/instructions');

function Help() {

}

Help.random = function (min, max) {
  return Math.floor((Math.random() * max) + min);
}

//========== MockRadio ==========
function MockRadio(){
  this.lastBuffer = null;
  this.lastMessage = null;
  this.messageQueue = [];
  this.listening = false;
};
MockRadio.prototype.write = function(buffer){
  this.lastBuffer = buffer;
  this.lastMessage = new Message({buffer: buffer});
}
MockRadio.prototype.available = function(){
  return {
    any: this.messageQueue.length > 0,
    pipeNum: 0
  };
};
MockRadio.prototype.read = function(){
  return this.messageQueue.shift();
};
MockRadio.prototype.startListening = function () {
  this.listening = true;
};
MockRadio.prototype.stopListening = function () {
  this.listening = false;
};

MockRadio.prototype.queue = function(buffer){
  this.messageQueue.push(buffer);
};
Help.MockRadio = MockRadio;


module.exports = Help;