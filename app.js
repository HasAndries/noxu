var http = require('http');
var config = require('./config')();

var admin = require('./admin/app').build(config);
var RfClient = require('./network/rfClient');

var client = new RfClient();
//run server
http.createServer(admin).listen(admin.get('port'), function () {
  console.log('Admin server listening on port ' + admin.get('port'));
});

//run server
http.createServer(client.app).listen(client.app.get('port'), function () {
  console.log('Network Client listening on port ' + client.app.get('port'));
});