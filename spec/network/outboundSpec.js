var Help = require('../help');
var Outbound = require('../../network/outbound');

describe('Outbound', function () {
  var db, nextOutboundId;
  beforeEach(function () {
    nextOutboundId = 1;
    db = new Help.MockDb();
    db.when('select * from outbound where deviceId = ?', null, function (params) {
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
      var device = new Outbound();
      expect(device.outboundId).toEqual(null);
      expect(device.transactionId).toEqual(null);
      expect(device.deviceId).toEqual(null);
      expect(device.buffer).toEqual(null);
      expect(device.time).toEqual(null);
    });
    it('should create an Outbound based on input options', function () {
      var device = new Outbound({outboundId: 5, transactionId: 3, deviceId: 7, buffer: [1,2,3,4,5,6,7,8,9,0], time: [1,5]});
      expect(device.outboundId).toEqual(5);
      expect(device.transactionId).toEqual(3);
      expect(device.deviceId).toEqual(7);
      expect(device.buffer).toEqual([1,2,3,4,5,6,7,8,9,0]);
      expect(device.time).toEqual([1,5]);
    });
  });
  describe('loadForDevice', function () {
    it('should load all Outbounds for a DeviceID from the database', function () {
      db.expect('select * from outbound where deviceId = ?', null, function (params) {
        expect(params).toEqual([2]);
        var output = [
          {outboundId: 1, transactionId: 1, deviceId: 2, buffer: '[1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6]', timeS: 30, timeNs: 400},
          {outboundId: 2, transactionId: 2, deviceId: 2, buffer: '[1,2,3,4,5,6,1,2,3,4,5,6,7,8,9,0]', timeS: 20, timeNs: 400}
        ];
        return [output];
      });

      var outbound = Outbound.loadForDevice(db, 2);
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
    it('should load the last 10 Transactions for all devices', function () {

    });
  });
});