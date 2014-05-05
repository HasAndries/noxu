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
    return network.clients[network.clients.length - 1];
  };
  //========== Inbound ==========
  describe('Inbound', function () {
    describe('NETWORK_CONNECT', function () {
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
    describe('NETWORK_CONFIRM', function () {
      it('should raise event [clientNew], remove reservation and add a new Client', function (done) {
        //setup
        var reservation = createReservation(network);

        //event
        network.on('clientNew', function (input) {
          expect(input.client.networkId).toEqual(99);
          expect(input.client.deviceId).toEqual(1);
          done();
        });

        confirmReservation(network, reservation.deviceId);

        expect(network.reservations.length).toEqual(0);
        expect(network.clients.length).toEqual(1);
        expect(network.clients[0].networkId).toEqual(99);
        expect(network.clients[0].deviceId).toEqual(1);
        expect(network.clients[0].hardwareId).toEqual(reservation.hardwareId);
        expect(network.clients[0].transactionId).toEqual(1);
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
        expect(network.clients.length).toEqual(0);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.NETWORK_INVALID);
        expect(network.radio.lastMessage.fromCommander).toEqual(true);
        expect(network.radio.lastMessage.networkId).toEqual(0);
        expect(network.radio.lastMessage.data.toJSON()).toEqual([]);
      });
      it('should send default [WAKE] for a new valid [NETWORK_CONFIRM]', function () {
        //setup
        var reservation = createReservation(network);

        confirmReservation(network, reservation.deviceId);

        expect(network.reservations.length).toEqual(0);
        expect(network.clients.length).toEqual(1);
        expect(network.clients[0].networkId).toEqual(99);
        expect(network.clients[0].deviceId).toEqual(1);
        expect(network.clients[0].hardwareId).toEqual(reservation.hardwareId);
        expect(network.clients[0].transactionId).toEqual(1);
        expect(network.clients[0].inbound).toEqual([]);
        expect(network.clients[0].outbound).toEqual([]);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.WAKE);
        expect(network.radio.lastMessage.fromCommander).toEqual(true);
        expect(network.radio.lastMessage.networkId).toEqual(network.clients[0].networkId);
        expect(network.radio.lastMessage.deviceId).toEqual(network.clients[0].deviceId);
        expect(network.radio.lastMessage.sleep).toEqual(10);
      });
    });
    describe('PING_CONFIRM', function () {
      it('should raise event [pingConfirm]', function (done) {
        //setup
        var reservation = createReservation(network);
        confirmReservation(network, reservation.deviceId);

        //event
        network.on('pingConfirm', function (input) {
          expect(input.client.networkId).toEqual(99);
          expect(input.client.deviceId).toEqual(1);
          done();
        });

        //send outbound pulse
        var message = new Message({instruction: Instructions.PING, networkId: 99, deviceId: 1, data: []});
        network.send(message);

        //inbound pulse confirm
        message = new Message({instruction: Instructions.PING_CONFIRM, networkId: 99, deviceId: 1, data: []});
        network.radio.queue(message.toBuffer());
        network._processInbound();

        expect(network.reservations.length).toEqual(0);
        expect(network.clients.length).toEqual(1);
        expect(network.clients[0].networkId).toEqual(99);
        expect(network.clients[0].deviceId).toEqual(1);
        expect(network.clients[0].hardwareId).toEqual(reservation.hardwareId);
        expect(network.clients[0].transactionId).toEqual(1);
        expect(network.clients[0].inbound.length).toEqual(1);
      });
    });
  });
  //========== send ==========
  describe('send', function () {
    it('should raise event [outbound] and send the message to the radio', function (done) {
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
    });
  });

  //========== socket.io ==========
  //---------- getClients ----------
  describe('getClients', function () {
    it('should return list of clients', function () {
      //setup
      var reservation = createReservation(network);
      confirmReservation(network, reservation.deviceId);
      reservation = createReservation(network);
      confirmReservation(network, reservation.deviceId);

      var clients = network.getClients();
      expect(clients.length).toEqual(2);
      expect(clients[0]).toEqual({networkId: 99, deviceId: 1, transactionId: 0, inbound: [], outbound: []});
    });
  });
});