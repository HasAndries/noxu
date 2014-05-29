var Promise = require('../../lib/promise');

describe('Promise', function () {
  it('should create Promise from routine and run', function (done) {
    var routine = function (resolve) {
      resolve('hello');
    };
    var promise = new Promise(routine);
    expect(promise.routine).toEqual(routine);
    promise.then(function (val) {
      expect(val).toEqual('hello');
      done();
    }).run();
  });

  it('should create Promise from routine and run success', function (done) {
    var routine = function (resolve) {
      resolve('hello');
    };
    var promise = new Promise(routine);
    expect(promise.routine).toEqual(routine);
    promise.success(function (val) {
      expect(val).toEqual('hello');
      done();
    });
  });

  it('should chain function and run success', function (done) {
    var promise = new Promise(function (resolve) {
      resolve('hello');
    });
    promise.success(function (val) {
      expect(val).toEqual('hello');
      done();
    });
  });

  it('should chain Promises', function (done) {
    var calls = [];
    var promise1 = new Promise(function (resolve) {
      calls.push(1);
      resolve('hello');
    });
    var promise2 = new Promise(function (resolve) {
      calls.push(2);
      resolve('world');
    });
    promise1.then(promise2).success(function (val) {
      expect(val).toEqual('world');
      expect(calls).toEqual([1, 2]);
      done();
    });
  });

  it('should create Promise from a value and run success', function (done) {
    var promise = Promise('hello');
    promise.success(function (val) {
      expect(val).toEqual('hello');
      done();
    });
  });

  it('should create Promise from a function and run success', function (done) {
    var promise = Promise(function () {
      return 'frikkie';
    });
    promise.success(function (val) {
      expect(val).toEqual('frikkie');
      done();
    });
  });

  it('should run an array of functions as one Promise', function (done) {
    console.log('=====================');
    var calls = [];
    var func1 = function () {
      console.log(1);
      calls.push(1);
      return 'hello';
    };
    var func2 = function () {
      console.log(2);
      calls.push(2);
      return 'world';
    };
    var promise = Promise.all([func1, func2]);
    promise.success(function () {
      expect(calls).toEqual([1, 2]);
      done();
    });
  });
});