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

function CommandMessage(options) {
  var _this = this;
  _this.bufferSize = options.bufferSize || 32;
  _this.control = 0;
  _this.fromCommander = 0;
  _this.instruction = null;
  _this.data = [];
  _this.hops = [];

  if (options.data && options.data instanceof Array) {
    var buffer = new Buffer(options.data);
    this.control = buffer.readUInt8(0);
    this.fromCommander = isBitSet(this.control, 0);
    this.instruction = buffer.readUInt8(1);
    var dataLength = buffer.readUInt8(2);
    var dataStart = 4;
    var hopCount = buffer.readUInt8(3);
    var hopStart = dataStart + dataLength;

    if (dataLength + hopCount + 4 > this.bufferSize) throw new Error('CommandMessage cannot have more content than BufferSize');

    this.data = new Buffer(dataLength);
    buffer.copy(this.data, 0, dataStart, dataStart + dataLength);
    this.hops = new Buffer(hopCount);
    buffer.copy(this.hops, 0, hopStart, hopStart + hopCount);
  }
  else {
    this.fromCommander = options.fromCommander;
    this.instruction = options.instruction;
    if (options.data instanceof Buffer) this.data = options.data;
    else if (options.data instanceof Array || options.data instanceof String) this.data = new Buffer(options.data);
    else if (options.data != null) this.data = new Buffer(options.data.toString());
  }
}
CommandMessage.prototype.validate = function(){
  return this.data.length + this.hops.length + 4 < this.bufferSize && this.data.length + this.hops.length > 0;
};
CommandMessage.prototype.toBuffer = function(){
  var length = Math.min(this.bufferSize, 4 + this.data.length + this.hops.length);
  var buffer = new Buffer(length);
  this.control = setBit(this.control, 0, this.fromCommander);
  buffer[0] = this.control;
  buffer[1] = this.instruction;
  buffer[2] = this.data.length;
  buffer[3] = this.hops.length;

  this.data.copy(buffer, 4, 0);
  console.log(JSON.stringify(buffer));
  if (this.hops && this.hops.length) this.hops.copy(buffer, 4 + this.data.length, 0);
  return buffer;
};

module.exports = CommandMessage;