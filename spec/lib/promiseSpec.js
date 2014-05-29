var Promise = require('../../lib/promise');

describe('Promise', function(){
  it('should create Promise from routine and run success', function(done){
    var routine = function(resolve){
      resolve('hello');
    };
    var promise = new Promise(routine);
    expect(promise.routine).toEqual(routine);
    promise.success(function(val){
      expect(val).toEqual('hello');
      done();
    }).run();
  });

  it('should chain a Promise and function', function(done){
    var promise = new Promise(function(resolve){
      resolve('hello');
    });
    promise.then(function(val){
      expect(val).toEqual('hello');
      done();
    }).run();
  });

  it('should chain Promises', function(done){
    var calls = [];
    var promise1 = new Promise(function(resolve){
      calls.push(1);
      resolve('hello');
    });
    var promise2 = new Promise(function(resolve){
      calls.push(2);
      resolve('world');
    });
    promise1.then(promise2).then(function(val){
      expect(val).toEqual('world');
      expect(calls).toEqual([1,2]);
      done();
    }).run();
  });

  it('should start from a value Promise', function(done){
    var promise = new Promise('hello');
    promise.then(function(val){
      expect(val).toEqual('hello');
      done();
    }).run();
  });

  it('should run an array of inputs as one Promise', function(done){
    var calls = [];
    var func1 = function(resolve){
      calls.push(1);
      resolve('hello');
    };
    var func2 = function(resolve){
      calls.push(2);
      resolve('world');
    };
    var promise = Promise.all([func1, func2]);
    promise.then(function(){
      expect(calls).toEqual([1,2]);
      done();
    }).run();
  });
});