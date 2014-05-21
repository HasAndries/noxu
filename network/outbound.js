var Q = require('q');
var Message = require('./message');

function Outbound(options) {
  options = options || {};
  this.outboundId = options.outboundId || null;
  this.transactionId = options.transactionId || null;
  this.deviceId = options.deviceId || null;
  this.buffer = options.buffer || null;
  this.time = options.time || null;
}
Outbound.loadLimit = 5;

Outbound.loadForDevice = function (db, deviceId, limit) {
  var deferred = Q.defer();
  if (limit == null) limit = Outbound.loadLimit;
  var output = [];
  db.query('select * from outbound where deviceId = ? limit ?', [deviceId, limit], function (err, rows) {
    if (err) reject(err);
    for (var ct = 0; ct < rows.length; ct++) {
      var outbound = new Outbound({
        outboundId: rows[ct].outboundId,
        transactionId: rows[ct].transactionId,
        deviceId: rows[ct].deviceId,
        buffer: JSON.parse(rows[ct].buffer),
        time: rows[ct].timeS && rows[ct].timeNs && [rows[ct].timeS, rows[ct].timeNs]
      });
      output.push(outbound);
    }
    deferred.resolve(output);
  });
  return deferred.promise;
};
Outbound.prototype.save = function (db, fields) {
  var deferred = Q.defer();
  var input = {
    transactionId: this.transactionId,
    deviceId: this.deviceId,
    buffer: JSON.stringify(this.buffer),
    timeS: this.time && this.time[0],
    timeNs: this.time && this.time[1]
  };
  if (fields) {
    for (var key in input) {
      if (fields.indexOf(key) == -1) delete input[key];
    }
  }
  if (!this.outboundId) { //insert new
    db.query('insert into outbound set ?', input, function (err, rows) {
      if (err) reject(err);
      this.outboundId = rows.insertId;
      deferred.resolve(this);
    }.bind(this));
  }
  else { //update existing
    db.query('update outbound set ? where outboundId = ?', [input, this.outboundId], function (err, rows) {
      if (err) reject(err);
      deferred.resolve(this);
    }.bind(this));
  }
  return deferred.promise;
};
Outbound.prototype.getMessage = function () {
  return new Message({buffer: this.buffer});
};

module.exports = Outbound;