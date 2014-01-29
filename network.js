var http = require('http');
var config = require('./config')();

var rfServer = require('./network/rfServer')();

//run server
http.createServer(rfServer.app).listen(rfServer.app.get('port'), function () {
  console.log('Network server listening on port ' + rfServer.app.get('port'));
});