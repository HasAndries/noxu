var http = require('http');
var config = require('./config');
var Web = require('./web/web');

var web = new Web(config, http);
web.start();
