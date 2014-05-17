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

Inbound.loadForDevice = function(db, deviceId){
  var output = [];
  db.query('select * from inbound where deviceId = ?', [deviceId], function(err, rows){
    if (err) throw err;
    for(var ct=0;ct<rows.length;ct++){
      var inbound = new Inbound({
        inboundId: rows[ct].inboundId,
        transactionId: rows[ct].transactionId,
        deviceId: rows[ct].deviceId,
        buffer: rows[ct].buffer,
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

};

module.exports = Inbound;