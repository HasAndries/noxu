var util = require('util');
var Model = require('../../lib/model');

describe('Model', function(){
  var options;
  beforeEach(function(){
    options = {
      name: 'TestModel',
      fields: ['testId', 'name', 'cell'],
      id: 'testId',
      limit:0,

    }
  });
  describe('loadAll', function(){
    var model = new Model({name: 'Test'});
  });
  describe('save', function(){

  });
});