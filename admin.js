var http = require('http');
var config = require('./config');

var admin = require('./admin/app').build(config);

//run server
http.createServer(admin).listen(admin.get('port'), function () {
  console.log('Admin server listening on port ' + admin.get('port'));
});