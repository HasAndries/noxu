var Help = require('../help');
var Network = require('../../network/network');
var Message = require('../../network/message');
var Instructions = require('../../network/instructions');

describe('Network', function () {
  var network;
  beforeEach(function () {
    network = new Network();
    network.radio = new Help.MockRadio();
    network._startListen();
  });
  afterEach(function () {
    network._stopListen();
  });

  describe('processInbound', function () {
    describe('NETWORKID_REQ', function () {
      it('should add reservation, raise event [reservationNew] and send [NETWORKID_NEW] for a new TempId', function (done) {
        //event
        network.on('reservationNew', function (input) {
          expect(input.reservation.networkId).toEqual(1);
          expect(input.reservation.tempId).toEqual(tempId);
          ;
          done();
        });

        var tempId = Help.random(1, 10000);
        var buffer = new Buffer(2);
        buffer.writeUInt16LE(tempId, 0);
        var message = new Message({instruction: Instructions.NETWORKID_REQ, data: buffer});
        network.radio.queue(message.toBuffer());

        network.processInbound();

        expect(network.reservations.length).toEqual(1);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.NETWORKID_NEW);
        expect(network.radio.lastMessage.fromCommander).toEqual(true);
        expect(network.radio.lastMessage.networkId).toEqual(network.reservations[0].networkId);
        expect(network.radio.lastMessage.data.toJSON()).toEqual(buffer.toJSON());
      });
      it('should raise event [reservationInvalid] and send [NETWORKID_INVALID] for an existing TempId', function (done) {
        //event
        network.on('reservationInvalid', function (input) {
          expect(input.tempId).toEqual(tempId);
          done();
        });

        var tempId = Help.random(1, 10000);
        var buffer = new Buffer(2);
        buffer.writeUInt16LE(tempId, 0);
        var message = new Message({instruction: Instructions.NETWORKID_REQ, data: buffer});
        network.radio.queue(message.toBuffer());
        network.radio.queue(message.toBuffer());

        network.processInbound();
        network.processInbound();

        expect(network.reservations.length).toEqual(1);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.NETWORKID_INVALID);
        expect(network.radio.lastMessage.fromCommander).toEqual(true);
        expect(network.radio.lastMessage.networkId).toEqual(0);
        expect(network.radio.lastMessage.data.toJSON()).toEqual(buffer.toJSON());
      });
    });
    describe('NETWORKID_CONFIRM', function () {
      it('should raise event [reservationConfirm], remove reservation and add a new Client', function (done) {
        //event
        network.on('reservationConfirm', function (input) {
          expect(input.client.networkId).toEqual(1);
          done();
        });
        //create reservation
        var tempId = Help.random(1, 10000);
        var buffer = new Buffer(2);
        buffer.writeUInt16LE(tempId, 0);
        var message = new Message({instruction: Instructions.NETWORKID_REQ, data: buffer});
        network.radio.queue(message.toBuffer());
        message = new Message({instruction: Instructions.NETWORKID_CONFIRM, networkId: 1, data: []});
        network.radio.queue(message.toBuffer());

        network.processInbound();
        network.processInbound();

        expect(network.reservations.length).toEqual(0);
        expect(network.clients.length).toEqual(1);
        expect(network.clients[0]).toEqual({networkId: 1, sequence: 0, inbound: [], outbound: []});
      });
      it('should raise event [reservationInvalid] and send [NETWORKID_INVALID] for an invalid reservation', function (done) {
        //event
        network.on('reservationInvalid', function (input) {
          expect(input.networkId).toEqual(1);
          done();
        });
        //send confirm
        var message = new Message({instruction: Instructions.NETWORKID_CONFIRM, networkId: 1, data: []});
        network.radio.queue(message.toBuffer());

        network.processInbound();

        expect(network.reservations.length).toEqual(0);
        expect(network.clients.length).toEqual(0);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.NETWORKID_INVALID);
        expect(network.radio.lastMessage.fromCommander).toEqual(true);
        expect(network.radio.lastMessage.networkId).toEqual(0);
        expect(network.radio.lastMessage.data.toJSON()).toEqual([]);
      });
    });
    describe('PULSE_CONFIRM', function () {
      it('should raise event [pulseConfirm]', function (done) {
        //event
        network.on('pulseConfirm', function (input) {
          expect(input.client.networkId).toEqual(1);
          done();
        });
        //create reservation
        var tempId = Help.random(1, 10000);
        var buffer = new Buffer(2);
        buffer.writeUInt16LE(tempId, 0);
        var message = new Message({instruction: Instructions.NETWORKID_REQ, data: buffer});
        network.radio.queue(message.toBuffer());
        message = new Message({instruction: Instructions.NETWORKID_CONFIRM, networkId: 1, data: []});
        network.radio.queue(message.toBuffer());
        message = new Message({instruction: Instructions.PULSE_CONFIRM, networkId: 1, data: []});
        network.radio.queue(message.toBuffer());

        network.processInbound();
        network.processInbound();

        //need to do send ping here for outbound message
        network.processInbound();

        expect(network.reservations.length).toEqual(0);
        expect(network.clients.length).toEqual(1);
        expect(network.clients[0].networkId).toEqual(1);
        expect(network.clients[0].sequence).toEqual(0);

        expect(network.clients[0].inbound.length).toEqual(1);
        expect(network.clients[0].outbound.length).toEqual(0);
      });
    });
  });
  describe('send', function () {

  });
});