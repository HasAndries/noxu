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
  var _this = this;
  _this.bufferSize = (options || {}).bufferSize || 32;
  _this.control = 0;
  _this.fromCommander = true;
  _this.instruction = null;
  _this.sequence = 0;
  _this.networkId = 0;
  _this.data = null;

  if (options && options.buffer) {
    var buffer = options.buffer instanceof Buffer && options.buffer || new Buffer(options.buffer);
    this.control = buffer.readUInt8(0);
    this.fromCommander = isBitSet(this.control, 0);
    this.instruction = buffer.readUInt8(1);
    this.sequence = buffer.readUInt8(2);
    this.networkId = buffer.readUInt32LE(3);
    var dataLength = buffer.readUInt8(7);
    var dataStart = 8;

    if (dataLength + 7 > this.bufferSize) throw new Error('CommandMessage cannot have more content than BufferSize');

    this.data = new Buffer(dataLength);
    buffer.copy(this.data, 0, dataStart, dataStart + dataLength);
  }
  else if(options) {
    this.fromCommander = typeof options.fromCommander == 'undefined' && true || options.fromCommander;
    this.instruction = options.instruction || null;
    this.sequence = options.sequence || 0;
    this.networkId = options.networkId || 0;
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
  var buffer = new Buffer(this.bufferSize);
  buffer.fill(0);
  this.control = setBit(this.control, 0, this.fromCommander);
  buffer[0] = this.control;
  buffer[1] = this.instruction;
  buffer[2] = this.sequence;
  buffer.writeUInt32LE(this.networkId, 3);
  buffer[7] = dataLength;
  if (dataLength)
    this.data.copy(buffer, 8, 0);
  return buffer;
};

module.exports = Message;