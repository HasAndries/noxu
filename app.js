var http = require('http');
var config = require('./config')();
var Admin = require('./admin/admin');

var admin = new Admin(config);
admin.start(http);