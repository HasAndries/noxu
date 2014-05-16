var Help = require('../help');
var Device = require('../../network/device');

describe('Device', function () {
  var db;
  beforeEach(function () {
    db = new Help.MockDb();
    db.when('select * from devices', null, function(params){
      var output = [
        {deviceId:1, hardwareId: 4411, nextTransactionId: 1, confirmed: 0},
        {deviceId:2, hardwareId: 4412, nextTransactionId: 4, confirmed: 1}];
      return [output];
    });
    db.when('insert into devices set ?', null, function(params){
      var output = [];
      output.insertId = nextDeviceId++;
      return [output];
    });
    db.when('update devices set ? where deviceId = ?', null, function(params){
      return [];
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
      expect(device.inbound).toEqual([]);
      expect(device.outbound).toEqual([]);
    });
    it('should create a Device based on input options', function () {
      var device = new Device({deviceId:5, hardwareId: 32, nextTransactionId: 7, confirmed: 1, inbound: [1], outbound: [5]});
      expect(device.deviceId).toEqual(5);
      expect(device.hardwareId).toEqual(32);
      expect(device.nextTransactionId).toEqual(7);
      expect(device.confirmed).toEqual(1);
      expect(device.inbound).toEqual([1]);
      expect(device.outbound).toEqual([5]);
    });
  });
  describe('loadAll', function(){
    it('should load all devices from the database', function(){
      db.expect('select * from devices', null, function(params){
        var output = [
          {deviceId:1, hardwareId: 4411, nextTransactionId: 1, confirmed: 0},
          {deviceId:3, hardwareId: 4412, nextTransactionId: 4, confirmed: 1}];
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
    it('should load the last 10 Transactions for all devices', function(){

    });
  });
  describe('save', function(){
    it('should insert a new Device', function(){

    });
    it('should update an existing Device', function(){

    });
  });
  describe('confirm', function(){
    it('should set [confirmed] and save the Device', function(){

    });
  });
  describe('loadTransactions', function(){
    it('should load all Transactions for a device', function(){

    });
    it('should load the 10 last Transactions for a device', function(){

    });
  });
  describe('addTransaction', function(){
    it('should add a Transaction and insert to the db', function(){

    });
    it('should push out old Transactions from a device to maintain the last 10', function(){

    });
  });
});