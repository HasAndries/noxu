var Transaction = require('./transaction');

function Device(options){
  options = options || {};
  this.deviceId = options.deviceId || null;
  this.hardwareId = options.hardwareId || null;
  this.nextTransactionId = options.nextTransactionId || 0;
  this.confirmed = options.confirmed || 0;
  this.transactions = options.transactions || [];
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
  Transaction.loadForDevice(db, this.deviceId);
};
Device.prototype.addTransaction = function(db, transaction){

};

module.exports = Device;