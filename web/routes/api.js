var config = require('../../config');
var io = require('socket.io');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

//========== init ==========
function Api(wsServer) {
  this.wsServer = wsServer;
  this.messageMap = {
    'client:all': this.clientAll,
    'client:send': this.clientSend
  };

  this.wsServer.on('connection', function(wsClient){
    console.log('Api connection: ' + JSON.stringify(wsClient));
    wsClient.on('message', this.respond(wsClient));
  });
}
util.inherits(Api, EventEmitter);

Api.prototype.respond = function(wsClient){
  return function(message){
    var func = this.messageMap[message.type];
    wsClient.send(func(message.data));
  }
};

Api.prototype.root = function () {
  return {name: 'Noxu Api', version: '0.0.0'}
};
Api.prototype.clientAll = function (input) {

};
Api.prototype.clientSend = function (input) {

};

//========== config ==========
module.exports = Api;