var Message = require('../network/message');

function Help() {

}

Help.hrtimeReset = function(){
  Help.hrtimeVal = [100,2000];
};
Help.hrtime = function(){
  return Help.hrtimeVal;
};
Help.hrtimeReset();

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


//========== MockDb ==========
function MockDb(){
  this.whenList = {};
  this.expectList = {};
}
MockDb.prototype.when = function(query, params, callback){
  this.whenList[query] = {params: params, callback: callback, run:0};
};
MockDb.prototype.expect = function(query, params, callback){
  this.expectList[query] = {params: params, callback: callback, run:0};
};
MockDb.prototype.query = function(query, params, callback){
  var list = this.expectList[query] && this.expectList || this.whenList[query] && this.whenList || null;
  if (list){
    if (typeof(params) == 'function') callback = params;
    if (!list[query].params || list[query].params == params) {
      list[query].run++;
      var output = list[query].callback(params);
      var rows = output[0] || null;
      var err = output[1] || null;
      //process.nextTick(function() {
        callback(err, rows);
      //});
      return;
    }
  }
  throw new Error('No query callback for [' + query + ']');
};
MockDb.prototype.verify = function(string, params, callback){
  var errors = [];
  for(var key in this.expectList){
    if (!this.expectList[key].run) errors.push(key);
  }
  if (errors.length){
    throw new Error('Expected queries not run:\r\n'+errors.join('\r\n'));
  }
};
Help.MockDb = MockDb;

module.exports = Help;