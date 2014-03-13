var config = require('../../config');
var io = require('socket.io');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

//========== init ==========
function Api(ioServer) {
  this.ioServer = ioServer;
  this.setupIoServer(ioServer);
}
util.inherits(Api, EventEmitter);

Api.prototype.setupIoServer = function(ioServer){
  var _this = this;
  ioServer.of('/api')
    .on('connection', function (socket) {
      socket.on('', _this.root);
      socket.on('getNodes', _this.getNodes);
      socket.on('send', _this.send);
    });
};

Api.prototype.root = function (input) {
  return {name: 'Noxu Api', version: '0.0.0'}
};
Api.prototype.getNodes = function (input) {

};
Api.prototype.send = function (input) {

};

//========== config ==========
module.exports = Api;