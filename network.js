var http = require('http');
var config = require('./config');

var network = require('./network/app').build(config);

//run server
http.createServer(network).listen(network.get('port'), function () {
  console.log('Network server listening on port ' + network.get('port'));
});