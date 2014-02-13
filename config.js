var extend = require('node.extend');
var configContent = require('./config.json');
var express = require('express');
var app = express();

var env = app.get('env');
var config = extend({}, configContent.all, configContent[env]);
console.log('Loading config['+env+']');
module.exports = config;
