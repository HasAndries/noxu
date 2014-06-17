var extend = require('node.extend');
var Promise = require('../../lib/promise');
var Help = require('../help');
var Network = require('../../network/network');
var Message = require('../../network/message');
var Instructions = require('../../network/enums').Instructions;

describe('Network', function () {
  Promise.on('error', function (promise) {
    console.log('General error: %s', promise.error);
    console.log(promise.error.stack);
  });
  var db, network, nextDeviceId, nextOuboundId, nextInboundId;
  beforeEach(function () {
    nextDeviceId = 1;
    nextOuboundId = 1;
    nextInboundId = 1;
    db = new Help.MockDb();
    db.when('select * from devices', null, function (params) {
      return [
        []
      ];
    });
    db.when('insert into devices set ?', null, function (params) {
      var output = [];
      output.insertId = nextDeviceId++;
      return [output];
    });
    db.when('update devices set ? where deviceId = ?', null, function (params) {
      return [];
    });
    db.when('select * from outbound where deviceId = ? limit ?', null, function (params) {
      var output = [
        {outboundId: 1, transactionId: 1, deviceId: 2, buffer: '[2, 122, 129, 73, 61, 13, 2, 64, 5, 2, 4, 9, 0, 0, 0, 0]', timeS: 30, timeNs: 400},
        {outboundId: 2, transactionId: 2, deviceId: 2, buffer: '[2, 122, 129, 73, 61, 13, 2, 64, 5, 2, 4, 9, 0, 0, 0, 0]', timeS: 20, timeNs: 400}
      ];
      return [output];
    });
    db.when('insert into outbound set ?', null, function (params) {
      var output = [];
      output.insertId = nextOuboundId++;
      return [output];
    });
    db.when('select * from inbound where deviceId = ? limit ?', null, function (params) {
      var output = [
        {inboundId: 1, transactionId: 1, deviceId: 2, buffer: '[2, 122, 129, 73, 61, 13, 3, 64, 5, 2, 4, 9, 0, 0, 0, 0]', timeS: 40, timeNs: 500, outboundId: 1, latencyS: 10, latencyNs: 100},
        {inboundId: 2, transactionId: 2, deviceId: 2, buffer: '[2, 122, 129, 73, 61, 13, 3, 64, 5, 2, 4, 9, 0, 0, 0, 0]', timeS: 50, timeNs: 600, outboundId: 2, latencyS: 30, latencyNs: 200}
      ];
      return [output];
    });
    db.when('insert into inbound set ?', null, function (params) {
      var output = [];
      output.insertId = nextInboundId++;
      return [output];
    });

    network = new Network({networkId: 99}, db);
    network.radio = new Help.MockRadio();
    network._startListen();
  });
  afterEach(function () {
    network._stopListen();
    db.verify();
  });
  //========== Constructor ==========
  xdescribe('constructor', function () {
    it('should load all devices from the datastore', function (done) {
      db.expect('select * from devices', null, function (params) {
        var output = [
          {deviceId: 1, hardwareId: 4411, nextTransactionId: 1, confirmed: 0},
          {deviceId: 2}
        ];
        return [output];
      });

      var network = new Network({networkId: 99}, db);
      network.init().then(function () {
        expect(network.devices.length).toEqual(2);
        done();
      });
    });
  });
  //========== Helpers ==========
  function NETWORK_INBOUND(input) {
    return new Promise(function (resolve, reject) {
      try {
        var message = new Message(input.message);
        input.network.radio.queue(message.toBuffer());
        input.network._processInbound().success(function () {
          resolve(input);
        }).fail(reject);
      }
      catch (error) {
        reject(error);
      }
    });
  }

  function NETWORK_CONNECT(input) {
    return new Promise(function (resolve, reject) {
      try {
        input.hardwareId = input.hardwareId || Help.random(1, 10000);
        input.networkId = input.network.config.networkId;
        var buffer = new Buffer(2);
        buffer.writeUInt16LE(input.hardwareId, 0);

        var message = {instruction: Instructions.NETWORK_CONNECT, data: buffer, isRelay: false};
        NETWORK_INBOUND(extend({message: message}, input)).success(function () {
          input.device = network.devices[network.devices.length - 1];
          input.deviceId = input.device && input.device.deviceId;
          resolve(input);
        }).fail(reject);
      }
      catch (error) {
        reject(error);
      }
    });
  }

  function NETWORK_CONFIRM(input) {
    try {
      var message = {instruction: Instructions.NETWORK_CONFIRM, networkId: input.networkId, deviceId: input.deviceId, data: [], isRelay: false};
      return NETWORK_INBOUND(extend({message: message}, input));
    }
    catch (error) {
      reject(error);
    }
  };
  //========== Inbound ==========
  describe('Inbound', function () {
    describe('[NETWORK_CONNECT]', function () {
      it('should add device, raise event [deviceConnectNew] and send [NETWORK_NEW] for a new HardwareId', function (done) {
        //event
        network.on('deviceConnectNew', function (input) {
          expect(input.device.deviceId).toEqual(1);
          expect(input.device.hardwareId).toEqual(hardwareId);
        });

        //setup
        var hardwareId = Help.random(1, 10000);
        NETWORK_CONNECT({network: network, hardwareId: hardwareId}).success(function (options) {
          expect(network.devices.length).toEqual(1);
          expect(network.devices[0]).toEqual(options.device);
          expect(options.device.hardwareId).toEqual(hardwareId);
          expect(options.device.nextTransactionId).toEqual(1);
          expect(options.device.confirmed).toEqual(0);

          expect(network.radio.lastMessage.instruction).toEqual(Instructions.NETWORK_NEW);
          expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);

          var buffer = new Buffer(2);
          buffer.writeUInt16LE(hardwareId, 0);
          expect(network.radio.lastMessage.data.toJSON()).toEqual(buffer.toJSON());
          done();
        });
      });
      it('should raise event [deviceConnectNew] and send [NETWORK_NEW] for an existing HardwareId that is not confirmed', function (done) {
        //event
        network.on('deviceConnectNew', function (input) {
          expect(input.device.deviceId).toEqual(1);
          expect(input.device.hardwareId).toEqual(hardwareId);
        });

        var hardwareId = Help.random(1, 10000);
        NETWORK_CONNECT({network: network, hardwareId: hardwareId}).then(NETWORK_CONNECT).success(function (input) {
          expect(network.devices.length).toEqual(1);
          expect(network.devices[0]).toEqual(input.device);
          expect(input.device.hardwareId).toEqual(hardwareId);
          expect(input.device.nextTransactionId).toEqual(2);
          expect(input.device.confirmed).toEqual(0);

          //inbound
          expect(network.devices[0].inbound.length).toEqual(0);

          //outbound
          expect(network.devices[0].nextTransactionId).toEqual(2);
          expect(network.devices[0].outbound.length).toEqual(2);
          expect(network.devices[0].outbound[0].getMessage().instruction).toEqual(Instructions.NETWORK_NEW);
          expect(network.devices[0].outbound[1].getMessage().instruction).toEqual(Instructions.NETWORK_NEW);

          //radio
          expect(network.radio.lastMessage.instruction).toEqual(Instructions.NETWORK_NEW);
          expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);

          var buffer = new Buffer(2);
          buffer.writeUInt16LE(hardwareId, 0);
          expect(network.radio.lastMessage.data.toJSON()).toEqual(buffer.toJSON());
          done();
        });
      });
      it('should raise event [deviceConnectExisting] and send [NETWORK_NEW] for an existing HardwareId that is confirmed', function (done) {
        //event
        network.on('deviceConnectExisting', function (input) {
          expect(input.device.deviceId).toEqual(1);
          expect(input.device.hardwareId).toEqual(hardwareId);
        });

        var hardwareId = Help.random(1, 10000);
        NETWORK_CONNECT({network: network, hardwareId: hardwareId})
          .then(function (input) {
            return input.device.confirm(db).then(input);
          })
          .then(NETWORK_CONNECT)
          .success(function (input) {
            expect(network.devices.length).toEqual(1);
            expect(network.devices[0]).toEqual(input.device);
            expect(input.device.hardwareId).toEqual(hardwareId);
            expect(input.device.nextTransactionId).toEqual(2);
            expect(input.device.confirmed).toEqual(1);

            //inbound
            expect(network.devices[0].inbound.length).toEqual(0);

            //outbound
            expect(network.devices[0].nextTransactionId).toEqual(2);
            expect(network.devices[0].outbound.length).toEqual(2);
            expect(network.devices[0].outbound[0].getMessage().instruction).toEqual(Instructions.NETWORK_NEW);
            expect(network.devices[0].outbound[1].getMessage().instruction).toEqual(Instructions.NETWORK_NEW);

            //radio
            expect(network.radio.lastMessage.instruction).toEqual(Instructions.NETWORK_NEW);
            expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);

            var buffer = new Buffer(2);
            buffer.writeUInt16LE(hardwareId, 0);
            expect(network.radio.lastMessage.data.toJSON()).toEqual(buffer.toJSON());
            done();
          });
      });
    });
    describe('[NETWORK_CONFIRM]', function () {
      it('should confirm the device and raise event [deviceConfirmNew] for an unconfirmed Device', function (done) {
        //event
        network.on('deviceConfirmNew', function (input) {
          expect(input.device.deviceId).toEqual(1);
        });

        //setup
        NETWORK_CONNECT({network: network}).then(NETWORK_CONFIRM).success(function (input) {
          expect(network.devices.length).toEqual(1);
          expect(network.devices[0]).toEqual(input.device);

          expect(input.device.deviceId).toEqual(1);
          expect(input.device.hardwareId).toEqual(input.device.hardwareId);
          expect(input.device.nextTransactionId).toEqual(2);
          expect(input.device.confirmed).toEqual(1);
          done();
        });
      });
      it('should confirm the device and raise event [deviceConfirmExisting] for a confirmed Device', function (done) {
        //event
        network.on('deviceConfirmExisting', function (input) {
          expect(input.device.deviceId).toEqual(1);
        });

        NETWORK_CONNECT({network: network}).then(NETWORK_CONFIRM).then(NETWORK_CONFIRM).success(function (input) {
          expect(network.devices.length).toEqual(1);
          expect(network.devices[0]).toEqual(input.device);

          expect(input.device.deviceId).toEqual(1);
          expect(input.device.hardwareId).toEqual(input.device.hardwareId);
          expect(input.device.nextTransactionId).toEqual(3);
          expect(input.device.confirmed).toEqual(1);
          done();
        });
      });
      it('should raise event [deviceInvalid] and send [NETWORK_INVALID] for an invalid Device', function (done) {
        //event
        network.on('deviceInvalid', function (input) {
          expect(input.deviceId).toEqual(55);
        });
        NETWORK_CONFIRM({network: network, deviceId: 55}).success(function (input) {
          expect(network.devices.length).toEqual(0);

          //radio
          expect(network.radio.lastMessage.instruction).toEqual(Instructions.NETWORK_INVALID);
          expect(network.radio.lastMessage.networkId).toEqual(0);
          expect(network.radio.lastMessage.data).toEqual(null);
          done();
        });
      });
      it('should send [PING] for a new valid [NETWORK_CONFIRM]', function (done) {
        NETWORK_CONNECT({network: network}).then(NETWORK_CONFIRM).success(function (input) {
          //inbound
          expect(network.devices[0].inbound.length).toEqual(1);
          expect(network.devices[0].inbound[0].getMessage().instruction).toEqual(Instructions.NETWORK_CONFIRM);

          //outbound
          expect(network.devices[0].nextTransactionId).toEqual(2);
          expect(network.devices[0].outbound.length).toEqual(2);
          expect(network.devices[0].outbound[0].getMessage().instruction).toEqual(Instructions.NETWORK_NEW);
          expect(network.devices[0].outbound[1].getMessage().instruction).toEqual(Instructions.PING);

          //radio
          expect(network.radio.lastMessage.instruction).toEqual(Instructions.PING);
          expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);
          expect(network.radio.lastMessage.sleep).toEqual(0);
          done();
        });
      });
      it('should send [WAKE] for a new valid [NETWORK_CONFIRM] that is Relayed', function (done) {
        var message = new Message({instruction: Instructions.NETWORK_CONFIRM, networkId: network.config.networkId, isRelay: true});

        NETWORK_CONNECT({network: network}).then(function (input) {
          message.deviceId = input.deviceId;
          input.message = message;
          return NETWORK_INBOUND(input);
        }).success(function (input) {
          //inbound
          //console.log(network.devices[0]);
          expect(network.devices[0].inbound.length).toEqual(1);
          expect(network.devices[0].inbound[0].getMessage().instruction).toEqual(Instructions.NETWORK_CONFIRM);

          //outbound
          expect(network.devices[0].nextTransactionId).toEqual(2);
          expect(network.devices[0].outbound.length).toEqual(2);
          expect(network.devices[0].outbound[0].getMessage().instruction).toEqual(Instructions.NETWORK_NEW);
          expect(network.devices[0].outbound[1].getMessage().instruction).toEqual(Instructions.WAKE);

          //radio
          expect(network.radio.lastMessage.instruction).toEqual(Instructions.WAKE);
          expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);
          expect(network.radio.lastMessage.sleep).toEqual(10);
          done();
        });
      });
    });
    xdescribe('[PING_CONFIRM]', function () {
      it('should raise event [pingConfirm] if message [isRelay]', function (done) {
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

        //inbound
        expect(network.devices[0].inbound.length).toEqual(2);
        expect(network.devices[0].inbound[0].getMessage().instruction).toEqual(Instructions.NETWORK_CONFIRM);
        expect(network.devices[0].inbound[1].getMessage().instruction).toEqual(Instructions.PING_CONFIRM);

        //outbound
        expect(network.devices[0].nextTransactionId).toEqual(2);
        expect(network.devices[0].outbound.length).toEqual(2);
        expect(network.devices[0].outbound[0].getMessage().instruction).toEqual(Instructions.NETWORK_NEW);
        expect(network.devices[0].outbound[1].getMessage().instruction).toEqual(Instructions.PING);
      });
      it('should raise [pingConfirm]+[deviceNextMessage] and send [Next Message] if message not [isRelay]', function (done) {
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

        //inbound
        expect(network.devices[0].inbound.length).toEqual(2);
        expect(network.devices[0].inbound[0].getMessage().instruction).toEqual(Instructions.NETWORK_CONFIRM);
        expect(network.devices[0].inbound[1].getMessage().instruction).toEqual(Instructions.PING_CONFIRM);

        //outbound
        expect(network.devices[0].nextTransactionId).toEqual(3);
        expect(network.devices[0].outbound.length).toEqual(3);
        expect(network.devices[0].outbound[0].getMessage().instruction).toEqual(Instructions.NETWORK_NEW);
        expect(network.devices[0].outbound[1].getMessage().instruction).toEqual(Instructions.PING);
        expect(network.devices[0].outbound[2].getMessage().instruction).toEqual(Instructions.WAKE);

        //radio
        expect(network.radio.lastMessage.instruction).toEqual(Instructions.WAKE);
        expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);
      });
    });
    xdescribe('General', function () {
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
      it('should send [PING] if message is not relay', function () {
        //setup
        var device = NETWORK_CONNECT(network);
        NETWORK_CONFIRM(network, device.deviceId);

        //inbound message
        var message = new Message({instruction: Instructions.WAKE, networkId: network.config.networkId, deviceId: device.deviceId, isRelay: false});
        network.radio.queue(message.toBuffer());
        network._processInbound();

        //inbound
        expect(network.devices[0].inbound.length).toEqual(2);
        expect(network.devices[0].inbound[0].getMessage().instruction).toEqual(Instructions.NETWORK_CONFIRM);
        expect(network.devices[0].inbound[1].getMessage().instruction).toEqual(Instructions.WAKE);

        //outbound
        expect(network.devices[0].nextTransactionId).toEqual(3);
        expect(network.devices[0].outbound.length).toEqual(3);
        expect(network.devices[0].outbound[0].getMessage().instruction).toEqual(Instructions.NETWORK_NEW);
        expect(network.devices[0].outbound[1].getMessage().instruction).toEqual(Instructions.PING);
        expect(network.devices[0].outbound[2].getMessage().instruction).toEqual(Instructions.PING);

        //radio
        expect(network.radio.lastMessage.instruction).toEqual(Instructions.PING);
        expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);
        expect(network.radio.lastMessage.sleep).toEqual(0);
      });
      it('should send [Next Message] if message is relay', function () {
        //setup
        var device = NETWORK_CONNECT(network);
        NETWORK_CONFIRM(network, device.deviceId);

        //inbound message
        var message = new Message({instruction: Instructions.WAKE, networkId: network.config.networkId, deviceId: device.deviceId, isRelay: true});
        network.radio.queue(message.toBuffer());
        network._processInbound();

        //inbound
        expect(network.devices[0].inbound.length).toEqual(2);
        expect(network.devices[0].inbound[0].getMessage().instruction).toEqual(Instructions.NETWORK_CONFIRM);
        expect(network.devices[0].inbound[1].getMessage().instruction).toEqual(Instructions.WAKE);

        //outbound
        expect(network.devices[0].nextTransactionId).toEqual(3);
        expect(network.devices[0].outbound.length).toEqual(3);
        expect(network.devices[0].outbound[0].getMessage().instruction).toEqual(Instructions.NETWORK_NEW);
        expect(network.devices[0].outbound[1].getMessage().instruction).toEqual(Instructions.PING);
        expect(network.devices[0].outbound[2].getMessage().instruction).toEqual(Instructions.WAKE);

        //radio
        expect(network.radio.lastMessage.instruction).toEqual(Instructions.WAKE);
        expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);
        expect(network.radio.lastMessage.sleep).toEqual(10);
      });

    });
  });
  //========== send ==========
  xdescribe('send', function () {
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
      network.send(message, device);

      expect(network.radio.lastMessage.toBuffer().toJSON()).toEqual(message.toBuffer().toJSON());
      var deviceOutbound = network.devices[0].outbound[network.devices[0].outbound.length - 1];
      expect(deviceOutbound.getMessage().toBuffer().toJSON()).toEqual(network.radio.lastMessage.toBuffer().toJSON());
    });
  });

  //========== socket.io ==========
  //---------- getDevices ----------
  xdescribe('getDevices', function () {
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
      expect(devices[1].nextTransactionId).toEqual(2);
      expect(devices[1].inbound.length).toEqual(1);
      expect(devices[1].outbound.length).toEqual(2);
    });
  });
});