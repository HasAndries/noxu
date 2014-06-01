var util = require('util');

function Model(){
  this.limit = 10;
}
Model.defaults = {
  limit: 10
}

Model.prototype.loadAll = function(db, filter, limit){
  var model = this;
  return new Promise(function (resolve, reject) {
    if (limit == null) limit = model.limit;
    var output = [];
    db.query('select * from inbound where deviceId = ? limit ?', [deviceId, limit], function (err, rows) {
      if (err) reject(err);
      for (var ct = 0; ct < rows.length; ct++) {
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
      resolve(output);
    });
  });
}

Model.prototype.save = function(db, fields){

}

module.exports = Model;