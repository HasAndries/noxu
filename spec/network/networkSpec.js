var Help = require('../help');
var sinon = require('sinon');
var mysql = require('mysql')
var Network = require('../../network/network');
var Message = require('../../network/message');
var Instructions = require('../../network/instructions');

describe('Network', function () {
  var db, mock, network, nextDeviceId;
  beforeEach(function () {
    db = mysql.createPool({});
    mock = sinon.mock(db);
    network = new Network({networkId: 99}, db);
    network.radio = new Help.MockRadio();
    network._startListen();
    nextDeviceId = 1;
  });
  afterEach(function () {
    network._stopListen();
    mock.restore();
  });
  //========== Constructor ==========
  describe('constructor', function(){
    it('should load all devices from the datastore', function(){
      var queryString = 'select * from devices';
      var rows = [];
      mock.expects('query').withArgs(queryString).yields(null, rows);

      var network = new Network({networkId: 99}, db);

      mock.verify();
    });
  });
  //========== Helpers ==========
  function NETWORK_CONNECT(network, _hardwareId) {
    mock.expects('query').withArgs('insert into devices set ?').atLeast(0).yields(null, {insertId: nextDeviceId++});

    var hardwareId = _hardwareId || Help.random(1, 10000);
    var buffer = new Buffer(2);
    buffer.writeUInt16LE(hardwareId, 0);
    var message = new Message({instruction: Instructions.NETWORK_CONNECT, data: buffer});
    network.radio.queue(message.toBuffer());
    network._processInbound();
    return network.devices[network.devices.length - 1];
  }

  function NETWORK_CONFIRM(network, deviceId, networkId) {
    var message = new Message({instruction: Instructions.NETWORK_CONFIRM, networkId: networkId || network.config.networkId, deviceId: deviceId, data: []});
    network.radio.queue(message.toBuffer());
    network._processInbound();
    return network.devices[network.devices.length - 1];
  };
  //========== Inbound ==========
  describe('Inbound', function () {
    describe('[NETWORK_CONNECT]', function () {
      it('should add device, raise event [deviceConnectNew] and send [NETWORK_NEW] for a new HardwareId', function (done) {
        //event
        network.on('deviceConnectNew', function (input) {
          expect(input.device.deviceId).toEqual(1);
          expect(input.device.hardwareId).toEqual(hardwareId);
          done();
        });

        //setup
        var hardwareId = Help.random(1, 10000);
        var device = NETWORK_CONNECT(network, hardwareId);

        expect(network.devices.length).toEqual(1);
        expect(network.devices[0]).toEqual(device);
        expect(device.hardwareId).toEqual(hardwareId);
        expect(device.nextTransactionId).toEqual(1);
        expect(device.confirmed).toEqual(0);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.NETWORK_NEW);
        expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);

        var buffer = new Buffer(2);
        buffer.writeUInt16LE(hardwareId, 0);
        expect(network.radio.lastMessage.data.toJSON()).toEqual(buffer.toJSON());
      });
      it('should raise event [deviceConnectNew] and send [NETWORK_NEW] for an existing HardwareId that is not confirmed', function () {
        //event
        network.on('deviceConnectNew', function (input) {
          expect(input.device.deviceId).toEqual(1);
          expect(input.device.hardwareId).toEqual(hardwareId);
          done();
        });

        var hardwareId = Help.random(1, 10000);
        NETWORK_CONNECT(network, hardwareId);
        var device = NETWORK_CONNECT(network, hardwareId);

        expect(network.devices.length).toEqual(1);
        expect(network.devices[0]).toEqual(device);
        expect(device.hardwareId).toEqual(hardwareId);
        expect(device.nextTransactionId).toEqual(1);
        expect(device.confirmed).toEqual(0);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.NETWORK_NEW);
        expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);

        var buffer = new Buffer(2);
        buffer.writeUInt16LE(hardwareId, 0);
        expect(network.radio.lastMessage.data.toJSON()).toEqual(buffer.toJSON());
      });
      it('should raise event [deviceConnectExisting] and send [NETWORK_NEW] for an existing HardwareId that is confirmed', function () {
        //event
        network.on('deviceConnectExisting', function (input) {
          expect(input.device.deviceId).toEqual(1);
          expect(input.device.hardwareId).toEqual(hardwareId);
          done();
        });

        var hardwareId = Help.random(1, 10000);
        var device = NETWORK_CONNECT(network, hardwareId);
        device.confirm(db);
        device = NETWORK_CONNECT(network, hardwareId);

        expect(network.devices.length).toEqual(1);
        expect(network.devices[0]).toEqual(device);
        expect(device.hardwareId).toEqual(hardwareId);
        expect(device.nextTransactionId).toEqual(1);
        expect(device.confirmed).toEqual(0);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.NETWORK_NEW);
        expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);

        var buffer = new Buffer(2);
        buffer.writeUInt16LE(hardwareId, 0);
        expect(network.radio.lastMessage.data.toJSON()).toEqual(buffer.toJSON());
      });
    });
    describe('[NETWORK_CONFIRM]', function () {
      /*
      it('should confirm the device and raise event [deviceConfirmNew] for an unconfirmed Device', function (done) {
        //setup
        var device = NETWORK_CONNECT(network);

        //event
        network.on('deviceConfirmNew', function (input) {
          expect(input.device.deviceId).toEqual(1);
          done();
        });

        device = NETWORK_CONFIRM(network, device.deviceId);

        expect(network.devices.length).toEqual(1);
        expect(network.devices[0]).toEqual(device);

        expect(device.deviceId).toEqual(1);
        expect(device.hardwareId).toEqual(device.hardwareId);
        expect(device.nextTransactionId).toEqual(1);
        expect(device.confirmed).toEqual(1);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.PING);
        expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);
      });
      it('should confirm the device and raise event [deviceConfirmExisting] for a confirmed Device', function (done) {
        //setup
        var device = NETWORK_CONNECT(network);
        device = NETWORK_CONFIRM(network, device.deviceId);

        //event
        network.on('deviceConfirmExisting', function (input) {
          expect(input.device.deviceId).toEqual(1);
          done();
        });

        device = NETWORK_CONFIRM(network, device.deviceId);

        expect(network.devices.length).toEqual(1);
        expect(network.devices[0]).toEqual(device);

        expect(device.deviceId).toEqual(1);
        expect(device.hardwareId).toEqual(device.hardwareId);
        expect(device.nextTransactionId).toEqual(1);
        expect(device.confirmed).toEqual(1);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.PING);
        expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);
      });
      */
      it('should raise event [deviceConfirmInvalid] and send [NETWORK_INVALID] for an invalid Device', function (done) {
        //event
        network.on('deviceConfirmInvalid', function (input) {
          expect(input.deviceId).toEqual(1);
          done();
        });
        NETWORK_CONFIRM(network, 1);

        expect(network.devices.length).toEqual(0);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.NETWORK_INVALID);
        expect(network.radio.lastMessage.networkId).toEqual(0);
        expect(network.radio.lastMessage.data).toEqual(null);
      });
      it('should send [PING] for a new valid [NETWORK_CONFIRM]', function () {
        //setup
        var device = NETWORK_CONNECT(network);
        NETWORK_CONFIRM(network, device.deviceId);

        expect(network.devices[0].nextTransactionId).toEqual(1);
        expect(network.devices[0].outbound[0].message.instruction).toEqual(Instructions.PING);
        //expect(network.devices[0].outbound[0].message).toEqual(network.radio.lastMessage);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.PING);
        expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);
        expect(network.radio.lastMessage.sleep).toEqual(0);
      });
      it('should send [WAKE] for a new valid [NETWORK_CONFIRM] that is Relayed', function () {
        //setup
        var device = NETWORK_CONNECT(network);
        var message = new Message({instruction: Instructions.NETWORK_CONFIRM, networkId: network.config.networkId, deviceId: device.deviceId, isRelay: true});
        network.radio.queue(message.toBuffer());
        network._processInbound();

        expect(network.devices[0].nextTransactionId).toEqual(1);
        expect(network.devices[0].outbound[0].message.instruction).toEqual(Instructions.WAKE);
        //expect(network.devices[0].outbound[0].message).toEqual(network.radio.lastMessage);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.WAKE);
        expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);
        expect(network.radio.lastMessage.sleep).toEqual(10);
      });
    });
    describe('[PING_CONFIRM]', function () {
      it('should raise event [pingConfirm] and log inbound details if message [isRelay]', function (done) {
        //setup
        var device = NETWORK_CONNECT(network);
        NETWORK_CONFIRM(network, device.deviceId);

        //event
        network.on('pingConfirm', function (input) {
          expect(input.device.deviceId).toEqual(1);
          done();
        });

        //inbound [PING_CONFIRM]
        var message = new Message({instruction: Instructions.PING_CONFIRM, networkId: network.config.networkId, deviceId: device.deviceId, isRelay: true});
        network.radio.queue(message.toBuffer());
        network._processInbound();

        expect(network.devices[0].nextTransactionId).toEqual(4);
        expect(network.devices[0].outbound[0].message.instruction).toEqual(Instructions.PING);

        expect(network.devices[0].inbound.length).toEqual(1);
        expect(network.devices[0].inbound[0].message).toEqual(message);
        expect(network.devices[0].inbound[0].message.instruction).toEqual(Instructions.PING_CONFIRM);
        expect(network.devices[0].inbound[0].message.deviceId).toEqual(network.devices[0].deviceId);
      });
      it('should raise [pingConfirm]+[deviceNextMessage] and send [Next Message] if message not [isRelay]', function(done){
        //setup
        var device = NETWORK_CONNECT(network);
        NETWORK_CONFIRM(network, device.deviceId);

        //event
        network.on('pingConfirm', function (input) {
          expect(input.device.deviceId).toEqual(1);
          done();
        });
        network.on('deviceNextMessage', function (input) {
          expect(input.device.deviceId).toEqual(1);
          expect(input.message.instruction).toEqual(Instructions.WAKE);
          done();
        });

        //inbound [PING_CONFIRM]
        var message = new Message({instruction: Instructions.PING_CONFIRM, networkId: network.config.networkId, deviceId: device.deviceId, isRelay: false});
        network.radio.queue(message.toBuffer());
        network._processInbound();

        expect(network.devices[0].inbound.length).toEqual(1);
        expect(network.devices[0].inbound[0].message).toEqual(message);
        expect(network.devices[0].inbound[0].message.instruction).toEqual(Instructions.PING_CONFIRM);
        expect(network.devices[0].inbound[0].message.deviceId).toEqual(network.devices[0].deviceId);

        expect(network.devices[0].nextTransactionId).toEqual(4);
        expect(network.devices[0].outbound[1].message.instruction).toEqual(Instructions.WAKE);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.WAKE);
        expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);
      });
    });
    describe('General', function () {
      it('should raise event [deviceInvalid] if Device does not exist', function (done) {
        //setup
        var device = NETWORK_CONNECT(network);
        NETWORK_CONFIRM(network, device.deviceId);

        //event
        network.on('deviceInvalid', function (input) {
          expect(input.deviceId).toEqual(5);
          done();
        });

        //inbound message
        var message = new Message({instruction: Instructions.WAKE, networkId: 299, deviceId: 5});
        network.radio.queue(message.toBuffer());
        network._processInbound();
      });
      it('should send [PING] if message is not relay', function(){
        //setup
        var device = NETWORK_CONNECT(network);
        NETWORK_CONFIRM(network, device.deviceId);

        //inbound message
        var message = new Message({instruction: Instructions.WAKE, networkId: network.config.networkId, deviceId: device.deviceId, isRelay: false});
        network.radio.queue(message.toBuffer());
        network._processInbound();

        //expect(network.devices[0].outbound[0].message).toEqual(network.radio.lastMessage);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.PING);
        expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);
        expect(network.radio.lastMessage.sleep).toEqual(0);
      });
      it('should send [Next Message] if message is relay', function(){
        //setup
        var device = NETWORK_CONNECT(network);
        NETWORK_CONFIRM(network, device.deviceId);

        //inbound message
        var message = new Message({instruction: Instructions.WAKE, networkId: network.config.networkId, deviceId: device.deviceId, isRelay: true});
        network.radio.queue(message.toBuffer());
        network._processInbound();

        //expect(network.devices[0].outbound[0].message).toEqual(network.radio.lastMessage);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.WAKE);
        expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);
        expect(network.radio.lastMessage.sleep).toEqual(10);
      });

    });
  });
  //========== send ==========
  describe('send', function () {
    it('should raise event [outbound], increase the Device transactionId and send the message to the radio', function (done) {
      //setup
      var device = NETWORK_CONNECT(network);
      NETWORK_CONFIRM(network, device.deviceId);

      //event
      network.on('outbound', function (input) {
        expect(input.buffer.toJSON()).toEqual(message.toBuffer().toJSON());
        done();
      });

      //send outbound pulse
      var message = new Message({instruction: Instructions.PING, networkId: network.config.networkId, deviceId: device.deviceId, data: [1, 2]});
      network.send(message);

      expect(network.radio.lastMessage.toBuffer().toJSON()).toEqual(message.toBuffer().toJSON());
      var deviceOutbound = network.devices[0].outbound[network.devices[0].outbound.length-1];
      expect(deviceOutbound.message.toBuffer().toJSON()).toEqual(network.radio.lastMessage.toBuffer().toJSON());
    });
  });

  //========== socket.io ==========
  //---------- getDevices ----------
  describe('getDevices', function () {
    it('should return list of devices', function () {
      //setup
      var device = NETWORK_CONNECT(network);
      NETWORK_CONFIRM(network, device.deviceId);
      device = NETWORK_CONNECT(network);
      NETWORK_CONFIRM(network, device.deviceId);

      var devices = network.getDevices();
      expect(devices.length).toEqual(2);
      expect(devices[1].deviceId).toEqual(2);
      expect(devices[1].hardwareId).toEqual(device.hardwareId);
      expect(devices[1].nextTransactionId).toEqual(1);
      expect(devices[1].inbound.length).toEqual(0);
      expect(devices[1].outbound.length).toEqual(1);
    });
  });
});