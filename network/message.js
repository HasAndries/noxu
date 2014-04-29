var Instructions = require('./instructions');

function isBitSet(b, n) {
  var mask = [128, 64, 32, 16, 8, 4, 2, 1];
  return ((b & mask[n]) != 0);
}
function setBit(b, n, on) {
  var mask = [128, 64, 32, 16, 8, 4, 2, 1];
  if (on)
    return b |= mask[n];
  else
    return isBitSet(b, n) ? b ^= mask[n] : b;
}

function Message(options) {
//  var _this = this;
  this.bufferSize = (options || {}).bufferSize || 32;
  this.version = 1;
  this.networkId = 0;
  this.deviceId = 0;
  this.transactionId = 0;
  this.instruction = 0;
  this.control = 0;
  this.fromCommander = true;//control[0]
  this.isRelay = false;//control[1]
  this.sleep = 0;
  this.data = null;

  if (options && options.buffer) {
    var buffer = options.buffer instanceof Buffer && options.buffer || new Buffer(options.buffer);
    this.version = buffer.readUInt8(0);
    this.networkId = buffer.readUInt16LE(1);
    this.deviceId = buffer.readUInt16LE(3);
    this.transactionId = buffer.readUInt8(5);
    this.instruction = buffer.readUInt8(6);
    this.control = buffer.readUInt8(7);
    this.fromCommander = isBitSet(this.control, 0);
    this.isRelay = isBitSet(this.control, 1);
    this.sleep = buffer.readUInt8(8);
    var dataLength = buffer.readUInt8(9);

    var dataStart = 10;
    if (dataLength + 9 > this.bufferSize) throw new Error('CommandMessage cannot have more content than BufferSize');
    this.data = new Buffer(dataLength);
    buffer.copy(this.data, 0, dataStart, dataStart + dataLength);
  }
  else if(options) {
    this.networkId = options.networkId || 0;
    this.deviceId = options.deviceId || 0;
    this.transactionId = options.transactionId || 0;
    this.instruction = options.instruction || 0;
    this.control = options.control || 0;
    this.fromCommander = typeof options.fromCommander == 'undefined' && true || options.fromCommander;
    this.isRelay = typeof options.isRelay == 'undefined' && true || options.isRelay;
    this.sleep = options.sleep || 0;

    if (options.data instanceof Buffer) this.data = options.data;
    else if (options.data instanceof Array || options.data instanceof String) this.data = new Buffer(options.data);
    else if (options.data != null) this.data = new Buffer(options.data.toString());
  }
}
Message.prototype.validate = function(){
  return this.data.length + 7 < this.bufferSize && Instructions.byVal(this.instruction) != null;
};
Message.prototype.toBuffer = function(){
  var dataLength = this.data && this.data.length || 0;
  var control = this.control;
  control = setBit(control, 0, this.fromCommander);
  control = setBit(control, 1, this.isRelay);

  var buffer = new Buffer(this.bufferSize);
  buffer.fill(0);
  buffer[0] = this.version;
  buffer.writeUInt16LE(this.networkId, 1);
  buffer.writeUInt16LE(this.deviceId, 3);
  buffer[5] = this.transactionId;
  buffer[6] = this.instruction;
  buffer[7] = control;
  buffer[8] = this.sleep;
  buffer[9] = dataLength;
  if (dataLength)
    this.data.copy(buffer, 8, 0);
  return buffer;
};

module.exports = Message;