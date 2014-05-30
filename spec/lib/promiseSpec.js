var Promise = require('../../lib/promise');

describe('Promise', function () {
  it('should create Promise from routine and run success', function (done) {
    var routine = function (resolve) {
      resolve('hello');
    };
    var promise = new Promise(routine);
    expect(promise.routine).toEqual(routine);
    promise.success(function (val) {
      expect(val).toEqual(['hello']);
      done();
    });
  });

  xit('should chain function and run success', function (done) {
    var promise = new Promise(function (resolve) {
      resolve('hello');
    });
    promise.success(function (val) {
      expect(val).toEqual(['hello']);
      done();
    });
  });

  xit('should chain Promises', function (done) {
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

  xit('should create Promise from a value and run success', function (done) {
    Promise('hello').success(function (val) {
      expect(val).toEqual('hello');
      done();
    });
  });

  xit('should create Promise from a function and run success', function (done) {
    var promise = Promise(function () {
      return 'frikkie';
    });
    promise.success(function (val) {
      expect(val).toEqual('frikkie');
      done();
    });
  });

  xit('should run an array of functions as one Promise', function (done) {
    var calls = [];
    var func1 = function () {
      calls.push(1);
      return 'hello';
    };
    var func2 = function () {
      calls.push(2);
      return 'world';
    };
    var promise = Promise.all([func1, func2]);
    promise.success(function () {
      expect(calls).toEqual([1, 2]);
      done();
    });
  });

  xit('should run an array of Promises in any order as one Promise', function (done) {
    var calls = [];
    var promise1 = new Promise(function (resolve) {
      process.nextTick(function () {
        calls.push(1);
        resolve(1);
      });
    });
    var promise2 = new Promise(function (resolve) {
      calls.push(2);
      resolve(2);
    });
    var promise = Promise.all([promise1, promise2]);
    promise.success(function () {
      expect(calls).toEqual([2, 1]);
      done();
    });
  });

  xit('should run an array of Promises in sequence as one Promise', function (done) {
    var calls = [];
    var promise1 = new Promise(function (resolve) {
      setTimeout(function () {
        calls.push(1);
        resolve();
      }, 10);
    });
    var promise2 = new Promise(function (resolve) {
      calls.push(2);
      resolve();
    });
    var promise = Promise.sequence([promise1, promise2]);
    promise.success(function () {
      expect(calls).toEqual([1, 2]);
      done();
    });
  });

  xit('should fail a Promise on reject', function (done) {
    console.log('=====================');
    new Promise(function (resolve, reject) {
      reject('hello');
    })
      .success(function () {
        console.log('Success called');
        //this.fail(Error('Success called'));
      })
      .fail(function (error) {
        expect(error).toEqual('hello');
        done();
      });
  });
  xit('should fail a Promise wxith Error on reject', function () {
    var promise = new Promise(function (resolve, reject) {
      reject(Error('blah'));
    });
  });

  xit('should fail a Promise on exception in a function', function () {

  });

  xit('should fail a Promise and following chain of Promises until a fail handler', function () {

  });
});