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

  //========== Helpers ==========
  function createReservation(network, _tempId){
    var tempId = _tempId || Help.random(1, 10000);
    var buffer = new Buffer(2);
    buffer.writeUInt16LE(tempId, 0);
    var message = new Message({instruction: Instructions.NETWORKID_REQ, data: buffer});
    network.radio.queue(message.toBuffer());
    network._processInbound();
    return network.reservations[network.reservations.length-1];
  }
  function confirmReservation(network, networkId){
    var message = new Message({instruction: Instructions.NETWORKID_CONFIRM, networkId: networkId, data: []});
    network.radio.queue(message.toBuffer());
    network._processInbound();
    return network.clients[network.clients.length-1];
  };
  //========== Inbound ==========
  describe('Inbound', function () {
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

        network._processInbound();

        expect(network.reservations.length).toEqual(1);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.NETWORKID_NEW);
        expect(network.radio.lastMessage.fromCommander).toEqual(true);
        expect(network.radio.lastMessage.networkId).toEqual(network.reservations[0].networkId);
        expect(network.radio.lastMessage.data.toJSON()).toEqual(buffer.toJSON());
      });
      it('should raise event [reservationInvalid] and send [NETWORKID_INVALID] for an existing TempId', function (done) {
        //setup
        var reservation = createReservation(network);

        //event
        network.on('reservationInvalid', function (input) {
          expect(input.tempId).toEqual(reservation.tempId);
          done();
        });

        createReservation(network, reservation.tempId);

        expect(network.reservations.length).toEqual(1);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.NETWORKID_INVALID);
        expect(network.radio.lastMessage.fromCommander).toEqual(true);
        expect(network.radio.lastMessage.networkId).toEqual(0);
      });
    });
    describe('NETWORKID_CONFIRM', function () {
      it('should raise event [clientNew], remove reservation and add a new Client', function (done) {
        //setup
        var reservation = createReservation(network);

        //event
        network.on('clientNew', function (input) {
          expect(input.client.networkId).toEqual(1);
          done();
        });

        confirmReservation(network, reservation.networkId);

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
        confirmReservation(network, 1);

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
        //setup
        var reservation = createReservation(network);
        confirmReservation(network, reservation.networkId);

        //event
        network.on('pulseConfirm', function (input) {
          expect(input.client.networkId).toEqual(1);
          done();
        });

        //send outbound pulse
        var message = new Message({instruction: Instructions.PULSE, networkId: 1, data: []});
        network.send(message);

        //inbound pulse confirm
        message = new Message({instruction: Instructions.PULSE_CONFIRM, networkId: 1, data: []});
        network.radio.queue(message.toBuffer());
        network._processInbound();

        expect(network.reservations.length).toEqual(0);
        expect(network.clients.length).toEqual(1);
        expect(network.clients[0].networkId).toEqual(1);
        expect(network.clients[0].sequence).toEqual(1);
        expect(network.clients[0].inbound.length).toEqual(1);
      });
    });
  });
  //========== send ==========
  describe('send', function () {
    it('should raise event [outbound] and send the message to the radio', function(done){
      //setup
      var reservation = createReservation(network);
      confirmReservation(network, reservation.networkId);

      //event
      network.on('outbound', function (input) {
        expect(input.buffer.toJSON()).toEqual(message.toBuffer().toJSON());
        done();
      });

      //send outbound pulse
      var message = new Message({instruction: Instructions.PULSE, networkId: 1, data: [1,2]});
      network.send(message);

      expect(network.radio.lastMessage.toBuffer().toJSON()).toEqual(message.toBuffer().toJSON());
    });
  });
  //========== getClients ==========
  describe('getClients', function () {
    it('should return list of clients', function(){
      //setup
      var reservation = createReservation(network);
      confirmReservation(network, reservation.networkId);
      reservation = createReservation(network);
      confirmReservation(network, reservation.networkId);

      var clients = network.getClients();
      expect(clients.length).toEqual(2);
      expect(clients[0]).toEqual({networkId: 1, sequence: 0, inbound: [], outbound: []});
    });
  });
});