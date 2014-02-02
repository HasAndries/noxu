var http = require('http');
var config = require('./config')();
var RfServer = require('./network/rfServer');

var server = new RfServer();
server.start(http);