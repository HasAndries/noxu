var util = require('util');
var EventEmitter = require('events').EventEmitter;
var spi = require('spi');
var gpio = require('rpi-gpio');
var consts = require('./const');

var HIGH = 0x1;
var LOW = 0x0;

//constructor
function RF24(options){
  EventEmitter.call(this);
  this.cePin = options.cePin;
  this.csnPin = options.csnPin;
  this.payload = options.payload;
  this.channel = options.channel;
  this.spiDev = options.spiDev;

  this.inSendMode = false;

  //spi
  this.spi = new spi.Spi(this.spiDev);
  this.spi.open();

  //gpio
  var readyVals = [];
  var ready = function(val){
    readyVals.push(val);
    if (readyVals == ['cePin', 'csnPin'])
      this.emit('ready');
  }
  gpio.setup(this.cePin, gpio.DIR_OUT, function(){
    ready('cePin');
  }.bind(this));
  gpio.setup(this.csnPin, gpio.DIR_OUT, function(){
    ready('cePin');
  }.bind(this));

  //state
  this.ceLow();
  this.csnHigh();
}
util.inherits(RfClient, EventEmitter);

RF24.prototype.ceHigh = function() {
  gpio.write(this.cePin, HIGH);
};

RF24.prototype.ceLow = function() {
  gpio.write(this.cePin, LOW);
};

RF24.prototype.csnHigh = function() {
  gpio.write(this.csnPin, HIGH);
};

RF24.prototype.csnLow = function() {
  gpio.write(this.csnPin, LOW);
};

RF24.prototype.setToAddr = function(addr) {
  var buf = new Buffer(addr);
  this.writeRegister(consts.RX_ADDR_P0, buf);
  this.writeRegister(consts.TX_ADDR, buf);
};

RF24.prototype.send = function(val) {
  // Wait for it to send all the packages
  while (this.inSendMode) {
    var status = this.getStatus();

    if (status & ((1 << consts.TX_DS) | (1 << consts.MAX_RT)))
    {
      this.inSendMode = false;
      break;
    }
  }

  this.ceLow();

  this.powerUpTx();

  var flushBuf = new Buffer(1);
  flushBuf[0] = consts.FLUSH_TX;

  this.csnLow();
  spi.write(flushBuf);
  this.csnHigh();

  var sendBuf = new Buffer(val.length+1);
  sendBuf[0] = consts.W_TX_PAYLOAD;

  for (var i = 0; i < val.length; i++) {
    sendBuf[i+1] = val[i];
  }

  this.csnLow();
  spi.write(sendBuf);
  this.csnHigh();

  this.ceHigh();
};

RF24.prototype.isSending = function() {
  if (this.inSendMode) {

    var status = this.getStatus();
    if ( status & ( (1 << consts.TX_DS) | (1 << consts.MAX_RT) ) ) {
      this.powerUpRx();
      return false;
    }

    return true;
  }

  return false;
};

RF24.prototype.getStatus = function() {
  var status;
  var statusRdy = 0;

  this.readRegister(consts.STATUS, new Buffer(1), function(b) {
    status = b[0];
    statusRdy = 1;
  });

  while(!statusRdy);

  return status;
};

RF24.prototype.dataReady = function() {
  var status = this.getStatus();

  if (status & (1 << consts.RX_DR)) return 1;

  return !this.rxFifoEmpty();
};

RF24.prototype.rxFifoEmpty = function() {
  var fifoStatus;
  var fifoStatusReady = 0;

  this.readRegister(consts.FIFO_STATUS, new Buffer(1), function(b) {
    fifoStatus = b[0];
    fifoStatusReady = 1;
  });

  while(!fifoStatusReady);

  return (fifoStatus & (1 << consts.RX_EMPTY));
};

RF24.prototype.getData = function() {
  var data;
  var dataReady = 0;

  this.csnLow();

  var buf = new Buffer(1+payload);
  buf[0] = consts.R_RX_PAYLOAD;

  spi.transfer(buf, buf, function(device, buf) {
    data = buf;
    dataReady = 1;
  });

  while(!dataReady);
  this.csnHigh();

  var wBuf = new Buffer(1);
  wBuf[0] = (1<<consts.RX_DR);

  this.writeRegister(consts.STATUS, wBuf);
  data = data.slice(1);

  return data;
};

RF24.prototype.readRegister = function(reg, val, callback)
{
  this.csnLow();
  var buf1 = new Buffer(1 + val.length);
  buf1[0] = consts.READ_REGISTER | (consts.REGISTER_MASK & reg);

  for (var i = 0; i < val.length; i++) {
    buf1[i+1] = val[i];
  }

  spi.transfer(buf1, new Buffer(buf1.length), function(device, buf) {
    var rBuf = new Buffer(buf.length-1);
    for (var i = 1; i < buf.length; i++) {
      rBuf[i-1] = buf[i];
    }
    callback(rBuf);
  });
  this.csnHigh();
};

RF24.prototype.writeRegister = function(reg, buffer) {
  this.csnLow();
  var b = new Buffer(1 + buffer.length);
  b[0] = consts.WRITE_REGISTER | (consts.REGISTER_MASK & reg);

  for (var i = 0; i < buffer.length; i++) {
    b[i+1] = buffer[i];
  }

  spi.write(b);
  this.csnHigh();
};

RF24.prototype.startReceiving = function() {
  this.powerUpRx();
  this.flushRx();
};

RF24.prototype.close = function() {
  this.ceLow();
  this.writeRegister(consts.CONFIG, consts.RF_CONFIG);
  spi.close();
};

RF24.prototype.powerUpRx = function () {
  this.inSendMode = false;
  this.ceLow();
  var buf1 = new Buffer(1);
  var buf2 = new Buffer(1);

  buf1[0] = consts.RF_CONFIG | ((1 << consts.PWR_UP) | (1 << consts.PRIM_RX));
  buf2[0] = (1 << consts.TX_DS) | (1 << consts.MAX_RT);

  this.writeRegister(consts.CONFIG, buf1);
  this.ceHigh();
  this.writeRegister(consts.STATUS, buf2);
};

RF24.prototype.powerUpTx = function() {
  this.inSendMode = true;
  var buf = new Buffer(1);
  buf[0] = consts.RF_CONFIG | ( (1 << consts.PWR_UP) | (0 << consts.PRIM_RX) );
  this.writeRegister(consts.CONFIG, buf);
};

RF24.prototype.flushRx = function() {
  this.csnLow();
  var buf = new Buffer(1);
  buf[0] = consts.FLUSH_RX;
  spi.write(buf);
};