function Device(options){
  this.deviceId = options.deviceId || null;
  this.hardwareId = options.hardwareId || null;
  this.nextTransactionId = options.nextTransactionId || 0;
  this.confirmed = options.confirmed || 0;
  this.inbound = options.inbound || [];
  this.outbound = options.outbound || [];
}

Device.loadAll = function(db){
  var output = [];
  //console.log(db.config.connectionConfig.database);
  db.query('select * from devices', function(err, rows){
    if (err) throw err;
    for(var ct=0;ct<rows.length;ct++){
      var device = new Device({deviceId: rows[ct].deviceId, hardwareId: rows[ct].hardwareId, nextTransactionId: rows[ct].nextTransactionId, confirmed: rows[ct].confirmed});
      device.loadTraffic(db);
      output.push(device);
    }
  });
  return output;
};
Device.prototype.save = function(db){
  var input = {
    hardwareId: this.hardwareId,
    nextTransactionId: this.nextTransactionId,
    confirmed: this.confirmed
  };
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
Device.prototype.loadTraffic = function(db){

};
Device.prototype.addTraffic = function(db, traffic){

};

module.exports = Device;