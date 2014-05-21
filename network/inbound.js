var Message = require('./message');

function Inbound(options){
  options = options || {};
  this.inboundId = options.inboundId || null;
  this.transactionId = options.transactionId || null;
  this.deviceId = options.deviceId || null;
  this.buffer = options.buffer || null;
  this.time = options.time || null;
  this.outboundId = options.outboundId || null;
  this.latency = options.latency || null;
}
Inbound.loadLimit = 5;

Inbound.loadForDevice = function(db, deviceId, limit){
  if (limit == null) limit = Inbound.loadLimit;
  var output = [];
  db.query('select * from inbound where deviceId = ? limit ?', [deviceId, limit], function(err, rows){
    if (err) throw err;
    for(var ct=0;ct<rows.length;ct++){
      var inbound = new Inbound({
        inboundId: rows[ct].inboundId,
        transactionId: rows[ct].transactionId,
        deviceId: rows[ct].deviceId,
        buffer: JSON.parse(rows[ct].buffer),
        time: rows[ct].timeS && rows[ct].timeNs && [rows[ct].timeS, rows[ct].timeNs],
        outboundId: rows[ct].outboundId,
        latency: rows[ct].latencyS && rows[ct].latencyNs && [rows[ct].latencyS, rows[ct].latencyNs]
      });
      output.push(inbound);
    }
  });
  return output;
};
Inbound.prototype.save = function(db, fields){
  var input = {
    transactionId: this.transactionId,
    deviceId: this.deviceId,
    buffer: JSON.stringify(this.buffer),
    timeS: this.time && this.time[0],
    timeNs: this.time && this.time[1],
    outboundId: this.outboundId,
    latency: this.latency
  };
  if (fields){
    for(var key in input){
      if (fields.indexOf(key) == -1) delete input[key];
    }
  }
  if (!this.inboundId){ //insert new
    db.query('insert into inbound set ?', input, function(err, rows){
      if (err) throw err;
      this.inboundId = rows.insertId;
    }.bind(this));
  }
  else{ //update existing
    db.query('update inbound set ? where inboundId = ?',[input, this.inboundId], function(err, rows){
      if (err) throw err;
    }.bind(this));
  }
};
Inbound.prototype.getMessage = function(){
  return new Message({buffer: this.buffer});
};

module.exports = Inbound;