var http = require('http');
var config = require('./config');
var Server = require('./network/server');
var Promise = require('./lib/promise');

Promise.on('error', function(error){
  console.log('Unhandled Error: %s', error);
});
var server = new Server(config, http);
server.start();