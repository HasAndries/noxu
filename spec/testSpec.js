var Promise = require("bluebird");

function Test(){
  this.count = 0;
}

Test.save = function(test){
  return new Promise(function(resolve){
    test.count++;
    resolve();
  });
}

describe('Test', function(){
  it('should increment', function(done){
    var test = new Test();
    Test.save(test).then(Test.save(test)).then(function(){
      expect(test.count).toEqual(2);
      done();
    });
  });
});