var Message = require('../network/message');

function Help() {

}

Help.random = function (min, max) {
  return Math.floor((Math.random() * max) + min);
}

function MockRadio(){
  this.lastBuffer = null;
  this.lastMessage = null;
  this.queue = [];
  this.listening = false;
};
MockRadio.prototype.write = function(buffer){
  this.lastBuffer = buffer;
  this.lastMessage = new Message({buffer: buffer});
}
MockRadio.prototype.available = function(){
  return this.queue.length > 0;
};
MockRadio.prototype.read = function(){
  return this.queue.shift();
};
MockRadio.prototype.startListening = function () {
  this.listening = true;
};
MockRadio.prototype.stopListening = function () {
  this.listening = false;
};

MockRadio.prototype.queue = function(buffer){
  this.queue.push(buffer);
};
Help.MockRadio = MockRadio;


module.exports = Help;