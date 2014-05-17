function Outbound(options){
  options = options || {};
  this.outboundId = options.outboundId || null;
  this.transactionId = options.transactionId || null;
  this.deviceId = options.deviceId || null;
  this.buffer = options.buffer || null;
  this.time = options.time || null;
}

Outbound.loadForDevice = function(db, deviceId){
  var output = [];
  db.query('select * from outbound where deviceId = ?', [deviceId], function(err, rows){
    if (err) throw err;
    for(var ct=0;ct<rows.length;ct++){
      var outbound = new Outbound({
        outboundId: rows[ct].outboundId,
        transactionId: rows[ct].transactionId,
        deviceId: rows[ct].deviceId,
        buffer: rows[ct].buffer,
        time: rows[ct].timeS && rows[ct].timeNs && [rows[ct].timeS, rows[ct].timeNs]
      });
      output.push(outbound);
    }
  });
  return output;
};
Outbound.prototype.save = function(db, fields){
  var input = {
    transactionId: this.transactionId,
    deviceId: this.deviceId,
    buffer: this.buffer,
    timeS: this.time && this.time[0],
    timeNs: this.time && this.time[1]
  };
  if (fields){
    for(var key in input){
      if (fields.indexOf(key) == -1) delete input[key];
    }
  }
  if (!this.outboundId){ //insert new
    db.query('insert into outbound set ?', [input], function(err, rows){
      if (err) throw err;
      this.outboundId = rows.insertId;
    }.bind(this));
  }
  else{ //update existing
    db.query('update outbound set ? where outboundId = ?',[input, this.outboundId], function(err, rows){
      if (err) throw err;
    }.bind(this));
  }
};

module.exports = Outbound;