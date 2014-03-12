var Help = require('../help');
var Network = require('../../network/network');
var Message = require('../../network/message');
var Instructions = require('../../network/instructions');

describe('Network', function () {
  var network;
  beforeEach(function () {
    network = new Network();
    network.radio = new Help.MockRadio();
  });
  afterEach(function(){
  });

  describe('processInbound', function () {
    describe('NETWORKID_REQ', function () {
      it('should add a new reservation for a new TempId', function (done) {
        //event
        network.on('reservationNew', function(input){
          expect(input.reservation.networkId).toEqual(1);
          expect(input.reservation.tempId).toEqual(tempId);;
          done();
        });

        var tempId = Help.random(1, 10000);
        var buffer = new Buffer(2);
        buffer.writeUInt16LE(tempId, 0);
        var message = new Message({instruction: Instructions.NETWORKID_REQ, data: buffer});
        network.processInbound(message);

        expect(network.reservations.length).toEqual(1);
      });
      it('should send a NETWORKID_NEW instruction for a new Reservation', function(){
        var tempId = Help.random(1, 10000);
        var buffer = new Buffer(2);
        buffer.writeUInt16LE(tempId, 0);
        var message = new Message({instruction: Instructions.NETWORKID_REQ, data: buffer});
        network.processInbound(message);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.NETWORKID_NEW);
        expect(network.radio.lastMessage.fromCommander).toEqual(true);
        expect(network.radio.lastMessage.networkId).toEqual(network.reservations[0].networkId);
        expect(network.radio.lastMessage.data.toJSON()).toEqual(buffer.toJSON());
      });
      it('should not add a reservation with an existing TempId', function(done){
        //event
        network.on('reservationDuplicate', function(input){
          expect(input.tempId).toEqual(tempId);
          done();
        });

        var tempId = Help.random(1, 10000);
        var buffer = new Buffer(2);
        buffer.writeUInt16LE(tempId, 0);
        var message = new Message({instruction: Instructions.NETWORKID_REQ, data: buffer});
        network.processInbound(message);
        network.processInbound(message);

        expect(network.reservations.length).toEqual(1);
      });
      it('should send a NETWORKID_INVALID instruction for an existing TempId', function(){
        var tempId = Help.random(1, 10000);
        var buffer = new Buffer(2);
        buffer.writeUInt16LE(tempId, 0);
        var message = new Message({instruction: Instructions.NETWORKID_REQ, data: buffer});

        network.processInbound(message);
        network.processInbound(message);

        expect(network.radio.lastMessage.instruction).toEqual(Instructions.NETWORKID_INVALID);
        expect(network.radio.lastMessage.fromCommander).toEqual(true);
        expect(network.radio.lastMessage.networkId).toEqual(0);
        expect(network.radio.lastMessage.data.toJSON()).toEqual(buffer.toJSON());
      });
    });
    describe('NETWORKID_CONFIRM', function (){
      it('should add a new Client in place of a reservation', function(done){
        //event
        network.on('reservationConfirm', function(input){
          expect(input.client.networkId).toEqual(1);
          done();
        });
        //create reservation
        var tempId = Help.random(1, 10000);
        var buffer = new Buffer(2);
        buffer.writeUInt16LE(tempId, 0);
        var message = new Message({instruction: Instructions.NETWORKID_REQ, data: buffer});
        network.processInbound(message);

        //send confirm
        message = new Message({instruction: Instructions.NETWORKID_CONFIRM, networkId: 1, data: []});
        network.processInbound(message);

        expect(network.reservations.length).toEqual(0);
        expect(network.clients.length).toEqual(1);
        expect(network.clients[0]).toEqual({networkId: 1, sequence: 0});
      });
      it('should not add a new Client in place of an invalid reservation', function(done){
        //event
        network.on('reservationInvalid', function(input){
          expect(input.networkId).toEqual(1);
          done();
        });
        //send confirm
        var message = new Message({instruction: Instructions.NETWORKID_CONFIRM, networkId: 1, data: []});
        network.processInbound(message);

        expect(network.reservations.length).toEqual(0);
        expect(network.clients.length).toEqual(0);
      });
    });
    describe('PULSE_CONFIRM', function (){
      it('should add a new Client in place of a reservation', function(done){
        //event
        network.on('reservationConfirm', function(input){
          expect(input.client.networkId).toEqual(1);
          done();
        });
        //create reservation
        var tempId = Help.random(1, 10000);
        var buffer = new Buffer(2);
        buffer.writeUInt16LE(tempId, 0);
        var message = new Message({instruction: Instructions.NETWORKID_REQ, data: buffer});
        network.processInbound(message);

        //send confirm
        message = new Message({instruction: Instructions.NETWORKID_CONFIRM, networkId: 1, data: []});
        network.processInbound(message);

        expect(network.reservations.length).toEqual(0);
        expect(network.clients.length).toEqual(1);
        expect(network.clients[0]).toEqual({networkId: 1, sequence: 0});
      });
      it('should not add a new Client in place of an invalid reservation', function(done){
        //event
        network.on('reservationInvalid', function(input){
          expect(input.networkId).toEqual(1);
          done();
        });
        //send confirm
        var message = new Message({instruction: Instructions.NETWORKID_CONFIRM, networkId:1, data: []});
        network.processInbound(message);

        expect(network.reservations.length).toEqual(0);
        expect(network.clients.length).toEqual(0);
      });
    });
  });
  describe('send', function(){

  });
});