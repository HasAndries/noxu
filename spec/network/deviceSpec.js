var Help = require('../help');
var Device = require('../../network/device');
var Outbound = require('../../network/outbound');
var Inbound = require('../../network/inbound');

describe('Device', function () {
  var db, nextDeviceId, nextOutboundId, nextInboundId;
  beforeEach(function () {
    nextDeviceId = 1;
    nextOutboundId = 1;
    nextInboundId = 1;
    db = new Help.MockDb();
    db.when('select * from devices', null, function (params) {
      var output = [
        {deviceId: 1, hardwareId: 4411, nextTransactionId: 1, confirmed: 0},
        {deviceId: 2, hardwareId: 4412, nextTransactionId: 4, confirmed: 1}
      ];
      return [output];
    });
    db.when('insert into devices set ?', null, function (params) {
      var output = [];
      output.insertId = nextDeviceId++;
      return [output];
    });
    db.when('update devices set ? where deviceId = ?', null, function (params) {
      return [];
    });
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
    db.when('select * from inbound where deviceId = ?', null, function (params) {
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
    it('should create a Device with defaults', function () {
      var device = new Device();
      expect(device.deviceId).toEqual(null);
      expect(device.hardwareId).toEqual(null);
      expect(device.nextTransactionId).toEqual(0);
      expect(device.confirmed).toEqual(0);
      expect(device.outbound).toEqual([]);
      expect(device.inbound).toEqual([]);
    });
    it('should create a Device based on input options', function () {
      var device = new Device({deviceId: 5, hardwareId: 32, nextTransactionId: 7, confirmed: 1, outbound: [1, 6], inbound: [1, 5]});
      expect(device.deviceId).toEqual(5);
      expect(device.hardwareId).toEqual(32);
      expect(device.nextTransactionId).toEqual(7);
      expect(device.confirmed).toEqual(1);
      expect(device.outbound).toEqual([1, 6]);
      expect(device.inbound).toEqual([1, 5]);
    });
  });
  describe('loadAll', function () {
    it('should load all devices from the database', function () {
      db.expect('select * from devices', null, function (params) {
        var output = [
          {deviceId: 1, hardwareId: 4411, nextTransactionId: 1, confirmed: 0},
          {deviceId: 3, hardwareId: 4412, nextTransactionId: 4, confirmed: 1}
        ];
        return [output];
      });

      var devices = Device.loadAll(db);
      expect(devices.length).toEqual(2);
      //0
      expect(devices[0].deviceId).toEqual(1);
      expect(devices[0].hardwareId).toEqual(4411);
      expect(devices[0].nextTransactionId).toEqual(1);
      expect(devices[0].confirmed).toEqual(0);
      //1
      expect(devices[1].deviceId).toEqual(3);
      expect(devices[1].hardwareId).toEqual(4412);
      expect(devices[1].nextTransactionId).toEqual(4);
      expect(devices[1].confirmed).toEqual(1);
    });
    it('should load the last 10 Transactions for all devices', function () {

    });
  });
  describe('save', function () {
    it('should insert a new Device and assign [deviceId]', function () {
      var device = new Device({hardwareId: 32, nextTransactionId: 7, confirmed: 1});
      db.expect('insert into devices set ?', null, function (params) {
        expect(params).toEqual([
          {hardwareId: 32, nextTransactionId: 7, confirmed: 1}
        ]);
        var output = [];
        output.insertId = 78;
        return [output];
      });
      device.save(db);
      expect(device.deviceId).toEqual(78);
    });
    it('should update an existing Device', function () {
      var device = new Device({deviceId: 55, hardwareId: 32, nextTransactionId: 7, confirmed: 1});
      db.expect('update devices set ? where deviceId = ?', null, function (params) {
        expect(params).toEqual([
          {hardwareId: 32, nextTransactionId: 7, confirmed: 1},
          55
        ]);
        return [];
      });
      device.save(db);
    });
    it('should exclude fields that are not specified in in input fields list', function () {
      var device = new Device({deviceId: 55, hardwareId: 32, nextTransactionId: 7, confirmed: 1});
      db.expect('update devices set ? where deviceId = ?', null, function (params) {
        expect(params).toEqual([
          {hardwareId: 32},
          55
        ]);
        return [];
      });
      device.save(db, ['hardwareId']);
    });
  });
  describe('confirm', function () {
    it('should set [confirmed] and save the Device', function () {
      var device = new Device({deviceId: 55, hardwareId: 32, nextTransactionId: 7, confirmed: 1});
      db.expect('update devices set ? where deviceId = ?', null, function (params) {
        expect(params).toEqual([
          {hardwareId: 32, nextTransactionId: 7, confirmed: 1},
          55
        ]);
        var output = [];
        output.insertId = 78;
        return [output];
      });
      device.save(db);
    });
  });
  describe('loadTransactions', function () {
    it('should load all Transactions for a device', function () {
      var device = new Device({deviceId: 55});
      device.loadTransactions(db);

      expect(device.outbound.length).toEqual(2);
      expect(device.outbound[0]).toEqual(new Outbound({ outboundId: 1, transactionId: 1, deviceId: 2, buffer: [1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6], time: [30, 400] }));

      expect(device.inbound.length).toEqual(2);
      expect(device.inbound[0]).toEqual(new Inbound({ inboundId: 1, transactionId: 1, deviceId: 2, buffer: [1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6], time: [40, 500], outboundId: 1, latency: [10, 100] }));
    });
  });
  describe('stampOutbound', function () {
    it('should create a new [Outbound] transaction, save it to the db, add it to [Outbound] list and increase [nextTransactionId]', function () {
      var device = new Device({deviceId: 55, nextTransactionId: 3, hrtime: Help.hrtime});
      db.expect('insert into outbound set ?', null, function (params) {
        expect(params).toEqual([
          {transactionId: 3, deviceId: 55, buffer: '[1,2,3,4,5,6,7,8,9,0]', timeS: 100, timeNs: 2000}
        ]);
        var output = [];
        output.insertId = 12;
        return [output];
      });

      device.stampOutbound(db, [1,2,3,4,5,6,7,8,9,0]);
      expect(device.outbound.length).toEqual(1);
      expect(device.outbound[0]).toEqual(new Outbound({outboundId: 12, transactionId: 3, deviceId: 55, buffer: [1,2,3,4,5,6,7,8,9,0], time: [100, 2000]}));
      expect(device.nextTransactionId).toEqual(4);
    });
    it('should push out old outbound items to maintain only the max outbound amount', function () {
      var device = new Device({deviceId: 55, hrtime: Help.hrtime, maxOutbound: 3});
      Help.hrtimeVal = [1,1];
      device.stampOutbound(db, [1,2,3,4,5,6,7,8,9,0]);
      Help.hrtimeVal = [2,2];
      device.stampOutbound(db, [1,2,3,4,5,6,7,8,9,0]);
      Help.hrtimeVal = [3,3];
      device.stampOutbound(db, [1,2,3,4,5,6,7,8,9,0]);
      expect(device.outbound.length).toEqual(3);
      Help.hrtimeVal = [4,4];
      device.stampOutbound(db, [1,2,3,4,5,6,7,8,9,0]);
      expect(device.outbound.length).toEqual(3);
      expect(device.outbound[0].time).toEqual([2,2]);
      expect(device.outbound[2].time).toEqual([4,4]);
    });
  });
  describe('stampInbound', function () {
    it('should create a new [Inbound] transaction, calculate the latency, save it to the db and add it to [Inbound] list', function () {
      var device = new Device({deviceId: 55, nextTransactionId: 3, hrtime: Help.hrtime});
      db.expect('insert into outbound set ?', null, function (params) {
        var output = [];
        output.insertId = 12;
        return [output];
      });
      db.expect('insert into inbound set ?', null, function (params) {
        expect(params).toEqual([
          {transactionId: 3, deviceId: 55, buffer: '[0,9,8,7,6,5,4,3,2,1]', timeS: 102, timeNs: 1500, outboundId: 12, latency: 100000001000}
        ]);
        var output = [];
        output.insertId = 33;
        return [output];
      });
      Help.hrtimeVal = [100, 1000];
      device.stampOutbound(db, [1,2,3,4,5,6,7,8,9,0]);
      device.stampInbound(db, 3, [0,9,8,7,6,5,4,3,2,1], [102, 1500]);
      expect(device.inbound.length).toEqual(1);
      expect(device.inbound[0]).toEqual(new Inbound({inboundId: 33, transactionId: 3, deviceId: 55, buffer: [0,9,8,7,6,5,4,3,2,1], time: [102, 1500], outboundId: 12, latency: 100000001000}));
    });
    it('should push out old outbound items to maintain only the max outbound amount', function () {
      var device = new Device({deviceId: 55, maxInbound: 3});
      device.stampInbound(db, 1, [1,2,3,4,5,6,7,8,9,0], [1,1]);
      device.stampInbound(db, 2, [1,2,3,4,5,6,7,8,9,0], [2,2]);
      device.stampInbound(db, 3, [1,2,3,4,5,6,7,8,9,0], [3,3]);
      expect(device.inbound.length).toEqual(3);
      device.stampInbound(db, 4, [1,2,3,4,5,6,7,8,9,0], [4,4]);
      expect(device.inbound.length).toEqual(3);
      expect(device.inbound[0].time).toEqual([2,2]);
      expect(device.inbound[2].time).toEqual([4,4]);
    });
  });
});