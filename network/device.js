var Outbound = require('./outbound');
var Inbound = require('./inbound');

function Device(options){
  options = options || {};
  this.deviceId = options.deviceId || null;
  this.hardwareId = options.hardwareId || null;
  this.nextTransactionId = options.nextTransactionId || 0;
  this.confirmed = options.confirmed || 0;
  this.outbound = options.outbound || [];
  this.inbound = options.inbound || [];
}

Device.loadAll = function(db){
  var output = [];
  //console.log(db.config.connectionConfig.database);
  db.query('select * from devices', function(err, rows){
    if (err) throw err;
    for(var ct=0;ct<rows.length;ct++){
      var device = new Device({deviceId: rows[ct].deviceId, hardwareId: rows[ct].hardwareId, nextTransactionId: rows[ct].nextTransactionId, confirmed: rows[ct].confirmed});
      device.loadTransactions(db);
      output.push(device);
    }
  });
  return output;
};
Device.prototype.save = function(db, fields){
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
    db.query('insert into devices set ?', [input], function(err, rows){
      if (err) throw err;
      this.deviceId = rows.insertId;
    }.bind(this));
  }
  else{ //update existing
    db.query('update devices set ? where deviceId = ?',[input, this.deviceId], function(err, rows){
      if (err) throw err;
    }.bind(this));
  }
};
Device.prototype.confirm = function(db){
  this.confirmed = 1;
  this.save(db);
};
Device.prototype.loadTransactions = function(db){
  this.outbound = Outbound.loadForDevice(db, this.deviceId);
  this.inbound = Inbound.loadForDevice(db, this.deviceId);
};
Device.prototype.stampOutbound = function(db, buffer){
  var outbound = new Outbound({transactionId: this.nextTransactionId, deviceId: this.deviceId, buffer:buffer, time:process.hrtime()});
  outbound.save(db);
  this.outbound.push(outbound);
  this.nextTransactionId++;
  this.save(db, ['nextTransactionId']);

};
Device.prototype.stampInbound = function(db, transactionId, buffer, time){
  var inbound = new Inbound({transactionId: transactionId, deviceId: this.deviceId, buffer:buffer, time:time});
  //locate first matching outbound
  for(var ct=0;ct<this.outbound.length;ct++){
    if (this.outbound[ct].transactionId == transactionId){
      inbound.outboundId = this.outbound[ct].outboundId;
      var diff = process.hrtime(this.outbound[ct].time);
      inbound.latency = diff[0] * 1e9 + diff[1];
      break;
    }
  }
  inbound.save(db);
  this.inbound.push(inbound);
};

module.exports = Device;