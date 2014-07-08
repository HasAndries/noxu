var mysql = require('mysql');
var config = require('./config');
var Promise = require('./lib/promise');

var db = mysql.createPool(config.networkDb);

new Promise(function (resolve, reject) {
  db.query('select * from devices', function (err, rows) {
    if (err) reject(err);
    console.log('devices callback');
    console.log(rows);
    resolve(rows)
  });
}).success(function (input) {
    console.log('done');
    console.log(input);
  }).fail(function(error){
    console.log('error');
    console.log(error);
  });