var http = require('http');
var config = require('./config');
var Server = require('./network/server');

var server = new Server(config);
server.start(http);