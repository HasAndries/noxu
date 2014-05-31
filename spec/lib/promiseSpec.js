var Promise = require('../../lib/promise');

describe('Promise', function () {
  beforeEach(function(){
    Promise.failRemoveAll();
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

  it('should create Promise from a value and run success', function (done) {
    Promise('hello').success(function (val) {
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

  it('should chain Promises', function (done) {
    var calls = [];
    var promise1 = new Promise(function (resolve) {
      expect(this.inputVal).toEqual(undefined);
      calls.push(1);
      resolve('hello');
    });
    var promise2 = new Promise(function (resolve) {
      expect(this.inputVal).toEqual('hello');
      calls.push(2);
      resolve(this.inputVal + ' world');
    });
    promise1.then(promise2).success(function (input) {
      expect(input).toEqual('hello world');
      expect(calls).toEqual([1, 2]);
      done();
    });
  });

  it('should chain functions and return last function value', function (done) {
    var calls = [];
    var func1 = function (input) {
      expect(input).toEqual(undefined);
      calls.push(1);
      return 'hello';
    };
    var func2 = function (input) {
      expect(input).toEqual('hello');
      calls.push(2);
      return input + ' world';
    };
    Promise().then(func1).then(func2).success(function(input){
      expect(input).toEqual('hello world');
      expect(calls).toEqual([1, 2]);
      done();
    });
  });

  it('should chain values and return the last value', function (done) {
    var calls = [];
    var func1 = function () {
      calls.push(1);
      return 'hello';
    };
    var func2 = function () {
      calls.push(2);
      return 'world';
    };
    Promise().then(func1()).then(func2()).success(function(input){
      expect(input).toEqual('world');
      expect(calls).toEqual([1, 2]);
      done();
    });
  });

  it('should run an array of functions as one Promise', function (done) {
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
    promise.success(function (input) {
      expect(input).toEqual(['hello', 'world']);
      expect(calls).toEqual([1, 2]);
      done();
    });
  });

  it('should run an array of Promises in any order as one Promise with results in sequence', function (done) {
    var calls = [];
    var promise1 = new Promise(function (resolve) {
      process.nextTick(function () {
        calls.push(1);
        resolve('hello');
      });
    });
    var promise2 = new Promise(function (resolve) {
      calls.push(2);
      resolve('world');
    });
    var promise = Promise.all([promise1, promise2]);
    promise.success(function (input) {
      expect(input).toEqual(['hello', 'world']);
      expect(calls).toEqual([2, 1]);
      done();
    });
  });

  it('should run an array of Promises in sequence as one Promise', function (done) {
    var calls = [];
    var promise1 = new Promise(function (resolve) {
      setTimeout(function () {
        calls.push(1);
        resolve('hello');
      }, 10);
    });
    var promise2 = new Promise(function (resolve) {
      calls.push(2);
      resolve('world');
    });
    var promise = Promise.sequence([promise1, promise2]);
    promise.success(function (input) {
      expect(input).toEqual(['hello', 'world']);
      expect(calls).toEqual([1, 2]);
      done();
    });
  });

  it('should fail a Promise on reject', function (done) {
    new Promise(function (resolve, reject) {
      reject('hello');
    })
      .success(function () {
        console.log('Success called');
      })
      .fail(function (error) {
        expect(error).toEqual('hello');
        done();
      });
  });
  it('should fail a Promise with Error on reject', function (done) {
    new Promise(function (resolve, reject) {
      reject(Error('hello'));
    })
      .success(function () {
        console.log('Success called');
      })
      .fail(function (error) {
        expect(error instanceof Error).toEqual(true);
        expect(error.message).toEqual('hello');
        done();
      });
  });

  it('should fail a Promise on exception in a function', function (done) {
    Promise(function () {
      throw Error('hello');
    })
      .success(function () {
        console.log('Success called');
      })
      .fail(function (error) {
        expect(error instanceof Error).toEqual(true);
        expect(error.message).toEqual('hello');
        done();
      });
  });

  it('should fail a Promise and skip chain of Promises until a fail handler', function (done) {
    var chainCalled = false;
    Promise(function () {
      throw Error('hello');
    }).then(function(){
      chainCalled = true;
    })
      .success(function () {
        console.log('Success called');
      })
      .fail(function (error) {
        expect(error instanceof Error).toEqual(true);
        expect(error.message).toEqual('hello');
        expect(chainCalled).toEqual(false);
        done();
      });
  });

  it('should fire a global fail handler', function(done){
    Promise.fail(function(error){
      expect(error instanceof Error).toEqual(true);
      expect(error.message).toEqual('hello');
      done();
    });

    Promise(function(){
      throw Error('hello');
    }).success();
  });

  it('should not fire global fail handler if there is local fail handler', function(done){
    Promise.fail(function(error){
      throw Error('this should not have been called');
      done();
    });

    Promise(function(){
      throw Error('hello');
    }).success().fail(function(error){
      expect(error instanceof Error).toEqual(true);
      expect(error.message).toEqual('hello');
      done();
    });
  });

  it('should fire a global fail handler if Error in local fail', function(done){
    Promise.fail(function(error){
      expect(error instanceof Error).toEqual(true);
      expect(error.message).toEqual('world');
      done();
    });

    Promise(function(){
      throw Error('hello');
    }).success().fail(function(error){
      expect(error.message).toEqual('hello');
      throw Error('world');
    });
  });
});