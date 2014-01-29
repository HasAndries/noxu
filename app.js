var http = require('http');
var config = require('./config')();

var admin = require('./admin/app').build(config);
var rfClient = require('./network/rfClient')(config);

//run server
http.createServer(admin).listen(admin.get('port'), function () {
  console.log('Admin server listening on port ' + admin.get('port'));
});

//run server
http.createServer(rfClient.app).listen(rfClient.app.get('port'), function () {
  console.log('Network Client listening on port ' + rfClient.app.get('port'));
});