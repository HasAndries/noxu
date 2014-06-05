var Promise = require('../lib/promise');
var Outbound = require('./outbound');
var Inbound = require('./inbound');

function Device(options) {
  options = options || {};
  this.deviceId = options.deviceId || null;
  this.hardwareId = options.hardwareId || null;
  this.nextTransactionId = options.nextTransactionId == null ? 0 : options.nextTransactionId;
  this.confirmed = options.confirmed || 0;
  this.outbound = options.outbound || [];
  this.inbound = options.inbound || [];
  this.hrtime = options.hrtime || process.hrtime;
  this.maxOutbound = options.maxOutbound || 5;
  this.maxInbound = options.maxInbound || 5;
}

Device.loadAll = function (db) {
  return new Promise(function (resolve, reject) {
    var output = [];
    var sequence = [];
    db.query('select * from devices', function (err, rows) {
      if (err) reject(err);
      for (var ct = 0; ct < rows.length; ct++) {
        var device = new Device({deviceId: rows[ct].deviceId, hardwareId: rows[ct].hardwareId, nextTransactionId: rows[ct].nextTransactionId, confirmed: rows[ct].confirmed});
        output.push(device);
        sequence.push(device.loadTransactions(db));
      }

      Promise.all(sequence).success(function (val) {
        resolve(output)
      }).fail(reject);
    });
  });
};
Device.prototype.save = function (db, fields) {
  var device = this;
  return new Promise(function (resolve) {
    var input = {
      hardwareId: device.hardwareId,
      nextTransactionId: device.nextTransactionId,
      confirmed: device.confirmed
    };
    if (fields) {
      for (var key in input) {
        if (fields.indexOf(key) == -1) delete input[key];
      }
    }
    if (!device.deviceId) { //insert new
      db.query('insert into devices set ?', input, function (err, rows) {
        if (err) reject(err);
        device.deviceId = rows.insertId;
        resolve(device);
      });
    }
    else { //update existing
      db.query('update devices set ? where deviceId = ?', [input, device.deviceId], function (err, rows) {
        if (err) reject(err);
        resolve(device);
      });
    }
  });
};
Device.prototype.confirm = function (db) {
  var device = this;
  device.confirmed = 1;
  return device.save(db);
};
Device.prototype.loadTransactions = function (db) {
  var device = this;
  return new Promise(function (resolve, reject) {
    Promise.all([Outbound.loadForDevice(db, device.deviceId), Inbound.loadForDevice(db, device.deviceId)]).success(function (output) {
      device.outbound = output[0];
      device.inbound = output[1];
      resolve(device);
    }).fail(reject);
  });
};
Device.prototype.stampOutbound = function (db, buffer) {
  var device = this;
  return new Promise(function (resolve, reject) {
    var outbound = new Outbound({transactionId: device.nextTransactionId, deviceId: device.deviceId, buffer: buffer, time: device.hrtime()});
    outbound.save(db)
      .then(function () {
        device.outbound.push(outbound);
        if (device.outbound.length > device.maxOutbound) device.outbound.splice(0, device.outbound.length - device.maxOutbound);
        device.nextTransactionId++;
      })
      .then(device.save(db, ['nextTransactionId']))
      .success(function () {
        resolve(device);
      }).fail(reject);
  });
};
Device.prototype.stampInbound = function (db, transactionId, buffer, time) {
  var device = this;
  return new Promise(function (resolve, reject) {
    var inbound = new Inbound({transactionId: transactionId, deviceId: device.deviceId, buffer: buffer, time: time});
    //locate first matching outbound
    for (var ct = 0; ct < device.outbound.length; ct++) {
      if (device.outbound[ct].transactionId == transactionId) {
        inbound.outboundId = device.outbound[ct].outboundId;
        var diff = device.hrtime(device.outbound[ct].time);
        inbound.latency = diff[0] * 1e9 + diff[1];
        break;
      }
    }
    inbound.save(db).success(function () {
      device.inbound.push(inbound);
      if (device.inbound.length > device.maxInbound) device.inbound.splice(0, device.inbound.length - device.maxInbound);
      resolve(device);
    }).fail(reject);
  });
};

module.exports = Device;