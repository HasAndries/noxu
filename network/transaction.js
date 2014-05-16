function Transaction(options){
  options = options || {};
  this.transactionId = options.transactionId || null;
  this.deviceId = options.deviceId || null;
  this.outboundBuffer = options.outboundBuffer || null;
  this.outboundTime = options.outboundTime || null;
  this.inboundBuffer = options.inboundBuffer || null;
  this.inboundTime = options.inboundTime || null;
  this.latency = options.latency || null;
}

Transaction.loadForDevice = function(db, deviceId){

};
Transaction.prototype.save = function(db, fields){

};

module.exports = Transaction;