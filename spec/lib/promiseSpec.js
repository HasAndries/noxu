var Promise = require('../../lib/promise');

describe('Promise', function(){
  it('should create a Promise from routine', function(){
    var routine = function(resolve){
      resolve('hello');
    };
    var promise = new Promise(routine);
    expect(promise.routine).toEqual(routine);
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
    var promise1 = new Promise(function(resolve){
      resolve('hello');
    });
    var promise2 = new Promise(function(resolve){
      resolve('world');
    });
    console.log(promise2 instanceof Promise);
    promise1.then(promise2).then(function(val){
      expect(val).toEqual('world');
      done();
    }).run();
  });
});