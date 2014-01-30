function isBitSet (b, n) {
  var mask = [128, 64, 32, 16, 8, 4, 2, 1];
  return ((b & mask[n]) != 0);
}
function setBit(b, n, on){
  var mask = [128, 64, 32, 16, 8, 4, 2, 1];
  if (on)
    return b |= mask[n];
  else
    return isBitSet(b, n) ? b ^= mask[n] : b;
}

function CommandMessage(bufferSize) {
  var _this = this;
  _this.bufferSize = bufferSize;
  _this.control = 0;
  _this.fromCommander = 0;
  _this.instruction = null;
  _this.data = null;
  _this.hops = null;

  this.validate = function () {
    return _this.data.length + _this.hops.length + 4 < _this.bufferSize && _this.data.length + _this.hops.length > 0;
  };
  this.toBuffer = function () {
    var buffer = new Buffer(_this.bufferSize);
    buffer[0] = 0;
    setBit(_this.control, 0, _this.fromCommander);
    buffer[1] = _this.instruction;
    buffer[2] = _this.data.length;
    buffer[3] = _this.hops.length;
    _this.data.copy(buffer, 4, 0);
    _this.hops.copy(buffer, 4+data.length, 0);
    return buffer;
  };
}
exports = function (options) {
  var message = new CommandMessage(options.bufferSize);
  if (options.buffer && typeof options.buffer == 'Buffer') {
    message.control = options.readUInt8(0);
    message.fromCommander = isBitSet(message.control, 0);
    message.instruction = options.readUInt8(1);
    var dataLength = options.readUInt8(2);
    var dataStart = 4;
    var hopCount = options.readUInt8(3);
    var hopStart = dataStart + dataLength;

    if (message.validate()) {
      message.data = new Buffer(dataLength);
      options.copy(message.data, 0, dataStart, dataStart + dataLength);
      message.hops = new Buffer(hopCount);
      options.copy(message.hops, 0, hopStart, hopStart + hopCount);
    }
  }
  else {
    message.instruction = options.instruction;
    message.data = options.data;
  }
  return message;
};