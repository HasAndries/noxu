var Help = require('../help');
var Outbound = require('../../network/outbound');

describe('Outbound', function () {
  var db, nextOutboundId;
  beforeEach(function () {
    nextOutboundId = 1;
    db = new Help.MockDb();
    db.when('select * from outbound where deviceId = ? limit ?', null, function (params) {
      var output = [
        {outboundId: 1, transactionId: 1, deviceId: 2, buffer: '[1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6]', timeS: 30, timeNs: 400},
        {outboundId: 2, transactionId: 2, deviceId: 2, buffer: '[1,2,3,4,5,6,1,2,3,4,5,6,7,8,9,0]', timeS: 20, timeNs: 400}
      ];
      return [output];
    });
    db.when('insert into outbound set ?', null, function (params) {
      var output = [];
      output.insertId = nextOutboundId++;
      return [output];
    });
  });
  afterEach(function () {
    db.verify();
  });

  describe('Constructor', function () {
    it('should create an Outbound with defaults', function () {
      var outbound = new Outbound();
      expect(outbound.outboundId).toEqual(null);
      expect(outbound.transactionId).toEqual(null);
      expect(outbound.deviceId).toEqual(null);
      expect(outbound.buffer).toEqual(null);
      expect(outbound.time).toEqual(null);
    });
    it('should create an Outbound based on input options', function () {
      var outbound = new Outbound({outboundId: 5, transactionId: 3, deviceId: 7, buffer: [1,2,3,4,5,6,7,8,9,0], time: [1,5]});
      expect(outbound.outboundId).toEqual(5);
      expect(outbound.transactionId).toEqual(3);
      expect(outbound.deviceId).toEqual(7);
      expect(outbound.buffer).toEqual([1,2,3,4,5,6,7,8,9,0]);
      expect(outbound.time).toEqual([1,5]);
    });
  });
  describe('loadForDevice', function () {
    it('should load Outbounds for a DeviceID from the database', function () {
      db.expect('select * from outbound where deviceId = ? limit ?', null, function (params) {
        expect(params).toEqual([2, 5]);
        var output = [
          {outboundId: 1, transactionId: 1, deviceId: 2, buffer: '[1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6]', timeS: 30, timeNs: 400},
          {outboundId: 2, transactionId: 2, deviceId: 2, buffer: '[1,2,3,4,5,6,1,2,3,4,5,6,7,8,9,0]', timeS: 20, timeNs: 400}
        ];
        return [output];
      });

      Outbound.loadForDevice(db, 2).then(function(outbound){
        expect(outbound.length).toEqual(2);
        //0
        expect(outbound[0].outboundId).toEqual(1);
        expect(outbound[0].transactionId).toEqual(1);
        expect(outbound[0].deviceId).toEqual(2);
        expect(outbound[0].buffer).toEqual([1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6]);
        expect(outbound[0].time).toEqual([30, 400]);
        //1
        expect(outbound[1].outboundId).toEqual(2);
        expect(outbound[1].transactionId).toEqual(2);
        expect(outbound[1].deviceId).toEqual(2);
        expect(outbound[1].buffer).toEqual([1,2,3,4,5,6,1,2,3,4,5,6,7,8,9,0]);
        expect(outbound[1].time).toEqual([20, 400]);
      });
    });
    it('should load the last x Outbounds for all devices', function () {
      var count = 5;
      db.expect('select * from outbound where deviceId = ? limit ?', null, function (params) {
        expect(params).toEqual([2, count]);
        var output = [];
        return [output];
      });
      Outbound.loadForDevice(db, 2);
      count = 11;
      Outbound.loadForDevice(db, 2, 11);
    });
  });
});