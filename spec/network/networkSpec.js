var Help = require('../help');
var Network = require('../../network/network');
var Message = require('../../network/message');
var Instructions = require('../../network/instructions');

describe('Network', function () {
  var network;
  beforeEach(function () {
    network = new Network({networkId: 99});
    network.radio = new Help.MockRadio();
    network._startListen();
  });
  afterEach(function () {
    network._stopListen();
  });

  //========== Helpers ==========
  function createReservation(network, _hardwareId) {
    var hardwareId = _hardwareId || Help.random(1, 10000);
    var buffer = new Buffer(2);
    buffer.writeUInt16LE(hardwareId, 0);
    var message = new Message({instruction: Instructions.NETWORK_CONNECT, data: buffer});
    network.radio.queue(message.toBuffer());
    network._processInbound();
    return network.reservations[network.reservations.length - 1];
  }

  function confirmReservation(network, deviceId, networkId) {
    var message = new Message({instruction: Instructions.NETWORK_CONFIRM, networkId: networkId || network.config.networkId, deviceId: deviceId, data: []});
    network.radio.queue(message.toBuffer());
    network._processInbound();
    return network.devices[network.devices.length - 1];
  };
  //========== Inbound ==========
  describe('Inbound', function () {
    describe('[NETWORK_CONNECT]', function () {
      it('should add reservation, raise event [reservationNew] and send [NETWORK_NEW] for a new HardwareId', function (done) {
        //event
        network.on('reservationNew', function (input) {
          expect(input.reservation.networkId).toEqual(99);
          expect(input.reservation.deviceId).toEqual(1);
          expect(input.reservation.hardwareId).toEqual(hardwareId);
          done();
        });

        var hardwareId = Help.random(1, 10000);
        var buffer = new Buffer(2);
        buffer.writeUInt16LE(hardwareId, 0);
        var message = new Message({instruction: Instructions.NETWORK_CONNECT, data: buffer});
        network.radio.queue(message.toBuffer());

        network._processInbound();

        expect(network.reservations.length).toEqual(1);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.NETWORK_NEW);
        expect(network.radio.lastMessage.fromCommander).toEqual(true);
        expect(network.radio.lastMessage.networkId).toEqual(network.reservations[0].networkId);
        expect(network.radio.lastMessage.deviceId).toEqual(network.reservations[0].deviceId);
        expect(network.radio.lastMessage.data.toJSON()).toEqual(buffer.toJSON());
      });
      it('should send [NETWORK_NEW] for an existing reservation', function () {
        //setup
        var reservation = createReservation(network);
        createReservation(network, reservation.hardwareId);

        expect(network.reservations.length).toEqual(1);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.NETWORK_NEW);
        expect(network.radio.lastMessage.fromCommander).toEqual(true);
        expect(network.radio.lastMessage.networkId).toEqual(network.reservations[0].networkId);
        expect(network.radio.lastMessage.deviceId).toEqual(network.reservations[0].deviceId);
      });
    });
    describe('[NETWORK_CONFIRM]', function () {
      it('should raise event [deviceNew], remove reservation and add a new Device', function (done) {
        //setup
        var reservation = createReservation(network);

        //event
        network.on('deviceNew', function (input) {
          expect(input.device.networkId).toEqual(99);
          expect(input.device.deviceId).toEqual(1);
          done();
        });

        confirmReservation(network, reservation.deviceId);

        expect(network.reservations.length).toEqual(0);
        expect(network.devices.length).toEqual(1);
        expect(network.devices[0].networkId).toEqual(99);
        expect(network.devices[0].deviceId).toEqual(1);
        expect(network.devices[0].hardwareId).toEqual(reservation.hardwareId);
        expect(network.devices[0].nextTransactionId).toEqual(1);
        expect(network.devices[0].outbound[0].message.instruction).toEqual(Instructions.PING);
      });
      it('should raise event [reservationInvalid] and send [NETWORK_INVALID] for an invalid reservation', function (done) {
        //event
        network.on('reservationInvalid', function (input) {
          expect(input.networkId).toEqual(99);
          expect(input.deviceId).toEqual(1);
          done();
        });
        confirmReservation(network, 1);

        expect(network.reservations.length).toEqual(0);
        expect(network.devices.length).toEqual(0);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.NETWORK_INVALID);
        expect(network.radio.lastMessage.fromCommander).toEqual(true);
        expect(network.radio.lastMessage.networkId).toEqual(0);
        expect(network.radio.lastMessage.data).toEqual(null);
      });
      it('should send [PING] for a new valid [NETWORK_CONFIRM]', function () {
        //setup
        var reservation = createReservation(network);
        confirmReservation(network, reservation.deviceId);

        expect(network.devices.length).toEqual(1);
        expect(network.devices[0].networkId).toEqual(99);
        expect(network.devices[0].deviceId).toEqual(1);
        expect(network.devices[0].hardwareId).toEqual(reservation.hardwareId);
        expect(network.devices[0].nextTransactionId).toEqual(1);

        expect(network.devices[0].outbound[0].message.instruction).toEqual(Instructions.PING);
        expect(network.devices[0].outbound[0].message).toEqual(network.radio.lastMessage);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.PING);
        expect(network.radio.lastMessage.networkId).toEqual(network.devices[0].networkId);
        expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);
      });
      it('should send [WAKE] for a new valid [NETWORK_CONFIRM] that is Relayed', function () {
        //setup
        var reservation = createReservation(network);
        var message = new Message({instruction: Instructions.NETWORK_CONFIRM, networkId: network.config.networkId, deviceId: reservation.deviceId, isRelay: true});
        network.radio.queue(message.toBuffer());
        network._processInbound();

        expect(network.devices.length).toEqual(1);
        expect(network.devices[0].networkId).toEqual(99);
        expect(network.devices[0].deviceId).toEqual(1);
        expect(network.devices[0].hardwareId).toEqual(reservation.hardwareId);
        expect(network.devices[0].nextTransactionId).toEqual(1);

        expect(network.devices[0].outbound[0].message.instruction).toEqual(Instructions.WAKE);
        expect(network.devices[0].outbound[0].message).toEqual(network.radio.lastMessage);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.WAKE);
        expect(network.radio.lastMessage.networkId).toEqual(network.devices[0].networkId);
        expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);
        expect(network.radio.lastMessage.sleep).toEqual(10);
      });
    });
    describe('[PING_CONFIRM]', function () {
      it('should raise event [pingConfirm]', function (done) {
        //setup
        var reservation = createReservation(network);
        confirmReservation(network, reservation.deviceId);

        //event
        network.on('pingConfirm', function (input) {
          expect(input.device.networkId).toEqual(99);
          expect(input.device.deviceId).toEqual(1);
          done();
        });

        //send outbound ping
        expect(network.devices[0].nextTransactionId).toEqual(1);
        var message = new Message({instruction: Instructions.PING, networkId: 99, deviceId: 1});
        network.send(message);

        //inbound ping confirm
        message = new Message({instruction: Instructions.PING_CONFIRM, networkId: 99, deviceId: 1});
        network.radio.queue(message.toBuffer());
        network._processInbound();

        expect(network.devices.length).toEqual(1);
        expect(network.devices[0].networkId).toEqual(99);
        expect(network.devices[0].deviceId).toEqual(1);
        expect(network.devices[0].hardwareId).toEqual(reservation.hardwareId);
        expect(network.devices[0].nextTransactionId).toEqual(4);

        expect(network.devices[0].outbound[0].message.instruction).toEqual(Instructions.PING);
        expect(network.devices[0].outbound[1].message.instruction).toEqual(Instructions.WAKE);
        expect(network.devices[0].inbound.length).toEqual(1);

        var deviceInbound = network.devices[0].inbound[network.devices[0].inbound.length-1];
        expect(deviceInbound.message).toEqual(message);

        expect(deviceInbound.message.instruction).toEqual(Instructions.PING_CONFIRM);
        expect(deviceInbound.message.networkId).toEqual(network.devices[0].networkId);
        expect(deviceInbound.message.deviceId).toEqual(network.devices[0].deviceId);
      });
      it('should raise [deviceNextMessage] and send [Next Message] if message is not relay', function(done){
        //setup
        var reservation = createReservation(network);
        confirmReservation(network, reservation.deviceId);

        //event
        network.on('deviceNextMessage', function (input) {
          expect(input.device.networkId).toEqual(99);
          expect(input.device.deviceId).toEqual(1);
          expect(input.message.instruction).toEqual(Instructions.WAKE);
          done();
        });

        //send outbound ping
        var message = new Message({instruction: Instructions.PING, networkId: 99, deviceId: 1});
        network.send(message);

        //inbound message
        var message = new Message({instruction: Instructions.PING_CONFIRM, networkId: 99, deviceId: 1, isRelay: false});
        network.radio.queue(message.toBuffer());
        network._processInbound();

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.WAKE);
        expect(network.radio.lastMessage.fromCommander).toEqual(true);
        expect(network.radio.lastMessage.networkId).toEqual(network.devices[0].networkId);
        expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);
      });
    });
    describe('General', function () {
      it('should raise event [deviceInvalid] if client does not exist', function (done) {
        //setup
        var reservation = createReservation(network);
        confirmReservation(network, reservation.deviceId);

        //event
        network.on('deviceInvalid', function (input) {
          expect(input.networkId).toEqual(299);
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
        var reservation = createReservation(network);
        confirmReservation(network, reservation.deviceId);

        //inbound message
        var message = new Message({instruction: Instructions.WAKE, networkId: 99, deviceId: 1, isRelay: false});
        network.radio.queue(message.toBuffer());
        network._processInbound();

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.PING);
        expect(network.radio.lastMessage.fromCommander).toEqual(true);
        expect(network.radio.lastMessage.networkId).toEqual(network.devices[0].networkId);
        expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);
      });
      it('should send [Next Message] if message is relay', function(){
        //setup
        var reservation = createReservation(network);
        confirmReservation(network, reservation.deviceId);

        //inbound message
        var message = new Message({instruction: Instructions.WAKE, networkId: 99, deviceId: 1, isRelay: true});
        network.radio.queue(message.toBuffer());
        network._processInbound();

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.WAKE);
        expect(network.radio.lastMessage.fromCommander).toEqual(true);
        expect(network.radio.lastMessage.networkId).toEqual(network.devices[0].networkId);
        expect(network.radio.lastMessage.deviceId).toEqual(network.devices[0].deviceId);
      });
    });
  });
  //========== send ==========
  describe('send', function () {
    it('should raise event [outbound], increase the device transactionId and send the message to the radio', function (done) {
      //setup
      var reservation = createReservation(network);
      confirmReservation(network, reservation.deviceId);

      //event
      network.on('outbound', function (input) {
        expect(input.buffer.toJSON()).toEqual(message.toBuffer().toJSON());
        done();
      });

      //send outbound pulse
      var message = new Message({instruction: Instructions.PING, networkId: 99, deviceId: 1, data: [1, 2]});
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
      var reservation = createReservation(network);
      confirmReservation(network, reservation.deviceId);
      reservation = createReservation(network);
      confirmReservation(network, reservation.deviceId);

      var devices = network.getDevices();
      expect(devices.length).toEqual(2);
      expect(devices[1].networkId).toEqual(99);
      expect(devices[1].deviceId).toEqual(2);
      expect(devices[1].hardwareId).toEqual(reservation.hardwareId);
      expect(devices[1].nextTransactionId).toEqual(1);
      expect(devices[1].inbound.length).toEqual(0);
      expect(devices[1].outbound.length).toEqual(1);
    });
  });
});