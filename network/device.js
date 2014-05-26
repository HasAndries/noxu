var Q = require('q');
var Outbound = require('./outbound');
var Inbound = require('./inbound');

function Device(options){
  options = options || {};
  this.deviceId = options.deviceId || null;
  this.hardwareId = options.hardwareId || null;
  this.nextTransactionId = typeof options.nextTransactionId == 'undefined' ? 0 : options.nextTransactionId;
  this.confirmed = options.confirmed || 0;
  this.outbound = options.outbound || [];
  this.inbound = options.inbound || [];
  this.hrtime = options.hrtime || process.hrtime;
  this.maxOutbound = options.maxOutbound || 5;
  this.maxInbound = options.maxInbound || 5;
}

Device.loadAll = function(db){
  var deferred = Q.defer();
  var output = [];
  //console.log(db.config.connectionConfig.database);
  var sequence = Q();
  db.query('select * from devices', function(err, rows){
    if (err) throw err;
    for(var ct=0;ct<rows.length;ct++){
      var device = new Device({deviceId: rows[ct].deviceId, hardwareId: rows[ct].hardwareId, nextTransactionId: rows[ct].nextTransactionId, confirmed: rows[ct].confirmed});
      output.push(device);
      sequence = sequence.then(device.loadTransactions(db));
    }
    sequence.then(deferred.resolve(output));
  });
  return deferred.promise;
};
Device.prototype.save = function(db, fields){
  var deferred = Q.defer();
  var input = {
    hardwareId: this.hardwareId,
    nextTransactionId: this.nextTransactionId,
    confirmed: this.confirmed
  };
  if (fields){
    for(var key in input){
      if (fields.indexOf(key) == -1) delete input[key];
    }
  }
  if (!this.deviceId){ //insert new
    db.query('insert into devices set ?', input, function(err, rows){
      if (err) reject(err);
      this.deviceId = rows.insertId;
      deferred.resolve(this);
    }.bind(this));
  }
  else{ //update existing
    db.query('update devices set ? where deviceId = ?',[input, this.deviceId], function(err, rows){
      if (err) reject(err);
      deferred.resolve(this);
    }.bind(this));
  }
  return deferred.promise;
};
Device.prototype.confirm = function(db){
  var deferred = Q.defer();
  this.confirmed = 1;
  this.save(db).then(deferred.resolve, deferred.reject);
  return deferred.promise;
};
Device.prototype.loadTransactions = function(db){
  var deferred = Q.defer();
  Q.all([Outbound.loadForDevice(db, this.deviceId), Inbound.loadForDevice(db, this.deviceId)]).then(function(output){
    this.outbound = output[0];
    this.inbound = output[1];
    deferred.resolve(this);
  }.bind(this), deferred.reject);
  return deferred.promise;
};
Device.prototype.stampOutbound = function(db, buffer){
  var outbound = new Outbound({transactionId: this.nextTransactionId, deviceId: this.deviceId, buffer:buffer, time:this.hrtime()});
  outbound.save(db);
  this.outbound.push(outbound);
  if (this.outbound.length > this.maxOutbound) this.outbound.splice(0, this.outbound.length - this.maxOutbound);
  this.nextTransactionId++;
  this.save(db, ['nextTransactionId']);
};
Device.prototype.stampInbound = function(db, transactionId, buffer, time){
  var inbound = new Inbound({transactionId: transactionId, deviceId: this.deviceId, buffer:buffer, time:time});
  //locate first matching outbound
  for(var ct=0;ct<this.outbound.length;ct++){
    if (this.outbound[ct].transactionId == transactionId){
      inbound.outboundId = this.outbound[ct].outboundId;
      var diff = this.hrtime(this.outbound[ct].time);
      inbound.latency = diff[0] * 1e9 + diff[1];
      break;
    }
  }
  inbound.save(db);
  this.inbound.push(inbound);
  if (this.inbound.length > this.maxInbound) this.inbound.splice(0, this.inbound.length - this.maxInbound);
};

module.exports = Device;