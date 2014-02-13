var http = require('http');
var extend = require('node.extend');

module.exports = {
  sendRequest: function (host, path, data, success, error) {
    var json = JSON.stringify(data);
    var request = extend({}, host);
    request.headers['Content-Length'] = json.length;
    request.path = path;
    var req = http.request(request);
    req.on('data', success.bind(this));
    req.on('error', error.bind(this));
    req.end(json);
  },
  emitSuccess: function (name) {
    var _this = this;
    return function (obj) {
      _this.emit(name, obj);
    }
  },
  emitError: function (name) {
    var _this = this;
    return function (obj) {
      if (!_this.emit(name, obj))
        throw new Error('Unhandled error ' + name + '\r\n' + obj);
    }
  }
};