var Data = require('../lib/data')
var Promise = require('../lib/promise');
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
  return new Promise(function (resolve) {
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
      resolve(output);
    });
  });
};
Outbound.prototype.save = function (db, fields) {
  var outbound = this;
  return new Promise(function (resolve, reject) {
    var input = Data.filterFields({
      transactionId: outbound.transactionId,
      deviceId: outbound.deviceId,
      buffer: JSON.stringify(outbound.buffer),
      timeS: outbound.time && outbound.time[0],
      timeNs: outbound.time && outbound.time[1]
    }, fields);

    if (!outbound.outboundId) { //insert new
      db.query('insert into outbound set ?', input, function (err, rows) {
        if (err) reject(err);
        outbound.outboundId = rows.insertId;
        resolve(outbound);
      });
    }
    else { //update existing
      db.query('update outbound set ? where outboundId = ?', [input, outbound.outboundId], function (err, rows) {
        if (err) reject(err);
        resolve(outbound);
      });
    }
  });
};
Outbound.prototype.getMessage = function () {
  return new Message({buffer: this.buffer});
};

module.exports = Outbound;