var Help = require('../help');
var Inbound = require('../../network/inbound');

describe('Inbound', function () {
  var db, nextInboundId;
  beforeEach(function () {
    nextInboundId = 1;
    db = new Help.MockDb();
    db.when('select * from inbound where deviceId = ? limit ?', null, function (params) {
      var output = [
        {inboundId: 1, transactionId: 1, deviceId: 2, buffer: '[1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6]', timeS: 40, timeNs: 500, outboundId: 1, latencyS: 10, latencyNs: 100},
        {inboundId: 2, transactionId: 2, deviceId: 2, buffer: '[1,2,3,4,5,6,1,2,3,4,5,6,7,8,9,0]', timeS: 50, timeNs: 600, outboundId: 2, latencyS: 30, latencyNs: 200}
      ];
      return [output];
    });
    db.when('insert into inbound set ?', null, function (params) {
      var output = [];
      output.insertId = nextInboundId++;
      return [output];
    });
  });
  afterEach(function () {
    db.verify();
  });

  describe('Constructor', function () {
    it('should create an Outbound with defaults', function () {
      var inbound = new Inbound();
      expect(inbound.inboundId).toEqual(null);
      expect(inbound.transactionId).toEqual(null);
      expect(inbound.deviceId).toEqual(null);
      expect(inbound.buffer).toEqual(null);
      expect(inbound.time).toEqual(null);
      expect(inbound.outboundId).toEqual(null);
      expect(inbound.latency).toEqual(null);
    });
    it('should create an Outbound based on input options', function () {
      var inbound = new Inbound({inboundId: 5, transactionId: 3, deviceId: 7, buffer: [1,2,3,4,5,6,7,8,9,0], time: [1,5], outboundId: 7, latency: [2,5]});
      expect(inbound.inboundId).toEqual(5);
      expect(inbound.transactionId).toEqual(3);
      expect(inbound.deviceId).toEqual(7);
      expect(inbound.buffer).toEqual([1,2,3,4,5,6,7,8,9,0]);
      expect(inbound.time).toEqual([1,5]);
      expect(inbound.outboundId).toEqual(7);
      expect(inbound.latency).toEqual([2,5]);
    });
  });
  describe('loadForDevice', function () {
    it('should load Inbounds for a DeviceID from the database', function () {
      db.expect('select * from inbound where deviceId = ? limit ?', null, function (params) {
        expect(params).toEqual([2, 5]);
        var output = [
          {inboundId: 1, transactionId: 1, deviceId: 2, buffer: '[1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6]', timeS: 40, timeNs: 500, outboundId: 1, latencyS: 10, latencyNs: 100},
          {inboundId: 2, transactionId: 2, deviceId: 2, buffer: '[1,2,3,4,5,6,1,2,3,4,5,6,7,8,9,0]', timeS: 50, timeNs: 600, outboundId: 2, latencyS: 30, latencyNs: 200}
        ];
        return [output];
      });

      Inbound.loadForDevice(db, 2).then(function(inbound) {
        expect(inbound.length).toEqual(2);
        //0
        expect(inbound[0].inboundId).toEqual(1);
        expect(inbound[0].transactionId).toEqual(1);
        expect(inbound[0].deviceId).toEqual(2);
        expect(inbound[0].buffer).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6]);
        expect(inbound[0].time).toEqual([40, 500]);
        expect(inbound[0].outboundId).toEqual(1);
        expect(inbound[0].latency).toEqual([10, 100]);
        //1
        expect(inbound[1].inboundId).toEqual(2);
        expect(inbound[1].transactionId).toEqual(2);
        expect(inbound[1].deviceId).toEqual(2);
        expect(inbound[1].buffer).toEqual([1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
        expect(inbound[1].time).toEqual([50, 600]);
        expect(inbound[1].outboundId).toEqual(2);
        expect(inbound[1].latency).toEqual([30, 200]);
      });
    });
    it('should load the last x Inbounds for all devices', function () {
      var count = 5;
      db.expect('select * from inbound where deviceId = ? limit ?', null, function (params) {
        expect(params).toEqual([2, count]);
        var output = [];
        return [output];
      });
      Inbound.loadForDevice(db, 2);
      count = 11;
      Inbound.loadForDevice(db, 2, 11);
    });
  });
});