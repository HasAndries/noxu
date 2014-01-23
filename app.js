var http = require('http');
var config = require('./config');

var express = require('./express/app').build(config);

//run server
http.createServer(express).listen(express.get('port'), function () {
    console.log('Express server listening on port ' + express.get('port'));
});