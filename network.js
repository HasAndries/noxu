var http = require('http');
var config = require('./config')();

var RfServer = require('./network/rfServer');
var server = new RfServer();

//run server
http.createServer(server.app).listen(server.app.get('port'), function () {
  console.log('Network server listening on port ' + server.app.get('port'));
});
