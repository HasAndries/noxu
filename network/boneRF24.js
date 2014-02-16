//var b = require('bonescript');
//var gpio = require('rpi-gpio');
//var gpio = require('pi-gpio');
var gpio = require('./gpio');
var consts = require('./consts');
var SPI = require('spi');
var bignum = require('bignum');

var HIGH = 1, LOW = 0;

function BoneRF24(){
  //var csnPin = 'P9_17';
  // var sckPin = 'P9_22';
  // var mosiPin = 'P9_18';
  // var misoPin = 'P9_21';
  //var cePin = 'P9_16';
  var csnPin = 8;
  var cePin = 24;
  //var csnPin = 24;
  //var cePin = 18;
  var csn = gpio.connect(csnPin);
  var ce = gpio.connect(cePin);

  var inSendMode = false;

  var address = 'serv1';
  var payload = 16;
  var channel = 1;

  var spi;

  var _this = this;

  Object.defineProperty(_this, 'cePin', {
    get: function() { return cePin; },
    set: function(y) {
      cePin = y;
      //b.pinMode(cePin, b.OUTPUT);
      //gpio.setup(cePin, gpio.DIR_OUT);
      //gpio.open(cePin, 'output');
      ce = gpio.connect(cePin);
      ce.mode('out');
    }
  });

  Object.defineProperty(_this, 'spiDev', {
    set: function(y) {
      spi = new SPI.Spi(y);
      spi.open();
    }
  });

  Object.defineProperty(_this, 'payload', {
    get: function() { return payload; },
    set: function(y) {
      payload = y;
      var payloadBuf = new Buffer(1);
      payloadBuf[0] = payload;
      _this.writeRegister(consts.RX_PW_P0, payloadBuf);
      _this.writeRegister(consts.RX_PW_P1, payloadBuf);
    }
  });

  Object.defineProperty(_this, 'channel', {
    get: function() { return channel; },
    set: function(y) {
      channel = y;
      var channelBuf = new Buffer(1);
      channelBuf[0] = channel;
      _this.writeRegister(consts.RF_CH, channelBuf);
    }
  });

  Object.defineProperty(_this, 'address', {
    get: function() { return address; },
    set: function(y) {
      address = y;
      var addressBuf = bignum(address.toString(16), 16).toBuffer();
      _this.writeRegister(consts.RX_ADDR_P1, addressBuf);
    }
  });

  _this.ceHigh = function() {
    //b.digitalWrite(cePin, b.HIGH);
    //gpio.write(cePin, HIGH);
    ce.value(HIGH);
  };

  _this.ceLow = function() {
    //b.digitalWrite(cePin, b.LOW);
    //gpio.write(cePin, LOW);
    ce.value(LOW);
  };

  _this.csnHigh = function() {
    //b.digitalWrite(csnPin, b.HIGH);
    //gpio.write(csnPin, HIGH);
    csn.value(HIGH);
  };

  _this.csnLow = function() {
    //b.digitalWrite(csnPin, b.LOW);
    //gpio.write(csnPin, LOW);
    csn.value(LOW);
  };

  _this.setToAddr = function(addrBuf) {
    this.writeRegister(consts.RX_ADDR_P0, addrBuf);
    this.writeRegister(consts.TX_ADDR, addrBuf);
  };

  _this.send = function(val) {

    // Wait for it to send all the packages
    while (inSendMode) {
      var status = this.getStatus();

      if (status & ((1 << consts.TX_DS) | (1 << consts.MAX_RT)))
      {
        inSendMode = false;
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

  _this.isSending = function() {
    if (inSendMode) {

      var status = this.getStatus();
      if ( status & ( (1 << consts.TX_DS) | (1 << consts.MAX_RT) ) ) {
        this.powerUpRx();
        return false;
      }

      return true;
    }

    return false;
  };

  _this.getStatus = function() {
    var status;
    var statusRdy = 0;

    this.readRegister(consts.STATUS, new Buffer(1), function(b) {
      status = b[0];
      statusRdy = 1;
    });

    while(!statusRdy);

    return status;
  };

  _this.dataReady = function() {
    var status = this.getStatus();

    if (status & (1 << consts.RX_DR)) return 1;

    return !this.rxFifoEmpty();
  };

  _this.rxFifoEmpty = function() {
    var fifoStatus;
    var fifoStatusReady = 0;

    this.readRegister(consts.FIFO_STATUS, new Buffer(1), function(b) {
      fifoStatus = b[0];
      fifoStatusReady = 1;
    });

    while(!fifoStatusReady);

    return (fifoStatus & (1 << consts.RX_EMPTY));
  };

  _this.getData = function() {
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

  _this.readRegister = function(reg, val, callback)
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
  _this.readRegisterSync = function(reg){
    var val = 0, valReady = false;
    this.readRegister(consts.RF_SETUP, new Buffer(1), function(b){
      val = b[0];
      valReady = true;
    });
    while(!valReady);
    return val;
  };

  _this.writeRegister = function(reg, buffer) {
    this.csnLow();
    var b = new Buffer(1 + buffer.length);
    b[0] = consts.WRITE_REGISTER | (consts.REGISTER_MASK & reg);

    for (var i = 0; i < buffer.length; i++) {
      b[i+1] = buffer[i];
    }

    spi.write(b);
    this.csnHigh();
  };

  _this.startReceiving = function() {
    this.powerUpRx();
    this.flushRx();
  };

  _this.close = function() {
    this.ceLow();
    this.writeRegister(consts.CONFIG, consts.RF_CONFIG);
    spi.close();
  };

  //levels=0,1,2,3 increasing in power output
  _this.setPower = function(level){
    var setup = this.readRegisterSync(consts.RF_SETUP);
    setup &= ~((1 << consts.RF_PWR_LOW) | (1 << consts.RF_PWR_HIGH));
    if (level==3) setup |= (1 << consts.RF_PWR_LOW) | (1 << consts.RF_PWR_HIGH);
    else if (level==2) setup |= (1 << consts.RF_PWR_HIGH);
    else if (level==1) setup |= (1 << consts.RF_PWR_LOW);
    this.writeRegister(consts.RF_SETUP, new Buffer([setup]));
  };

  //rates=250,1000,2000
  _this.setDataRate = function(rate){
    var setup = this.readRegisterSync(consts.RF_SETUP);
    setup &= ~((1 << consts.RF_DR_LOW) | (1 << consts.RF_DR_HIGH));
    //default is 1000/1mbps
    if (rate == 250) setup |= (1 << consts.RF_DR_LOW);
    else if (rate == 2000) setup |= (1 << consts.RF_DR_HIGH);
    this.writeRegister(consts.RF_SETUP, new Buffer([setup]));
  };

  //length=0,1,2
  _this.setCRC = function(length){
    var setup = this.readRegisterSync(consts.RF_SETUP);
    setup &= ~((1 << consts.CRCO) | (1 << consts.EN_CRC));
    //default is 0
    if (length == 1) setup |= (1 << consts.EN_CRC);//length 1
    if (length == 2) setup |= (1 << consts.CRCO);//add for length 2
    this.writeRegister(consts.RF_SETUP, new Buffer([setup]));
  };

  _this.setRetries = function(delay, count){
    var val = (delay&0xf)<<consts.ARD | (count&0xf)<<consts.ARC;
    this.writeRegister(consts.SETUP_RETR, new Buffer([val]));
  };

  _this.powerUpRx = function () {
    inSendMode = false;
    this.ceLow();
    var buf1 = new Buffer(1);
    var buf2 = new Buffer(1);

    buf1[0] = consts.RF_CONFIG | ((1 << consts.PWR_UP) | (1 << consts.PRIM_RX));
    buf2[0] = (1 << consts.TX_DS) | (1 << consts.MAX_RT);

    this.writeRegister(consts.CONFIG, buf1);
    this.ceHigh();
    this.writeRegister(consts.STATUS, buf2);
  };

  _this.powerUpTx = function() {
    inSendMode = true;
    var buf = new Buffer(1);
    buf[0] = consts.RF_CONFIG | ( (1 << consts.PWR_UP) | (0 << consts.PRIM_RX) );
    this.writeRegister(consts.CONFIG, buf);
  };

  _this.flushRx = function() {
    this.csnLow();
    var buf = new Buffer(1);
    buf[0] = consts.FLUSH_RX;
    spi.write(buf);
  };

  //Initialization
  //b.pinMode(cePin, b.OUTPUT);
  //b.pinMode(csnPin, b.OUTPUT);
  //gpio.setup(cePin, gpio.DIR_OUT);
  //gpio.setup(csnPin, gpio.DIR_OUT);
  //gpio.open(cePin, 'output');
  //gpio.open(csnPin, 'output');
  ce = gpio.connect(cePin);
  ce.mode('out');
  csn = gpio.connect(csnPin);
  csn.mode('out');

  _this.ceLow();
  _this.csnHigh();
};
module.exports = BoneRF24;