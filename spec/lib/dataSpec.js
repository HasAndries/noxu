var Data = require('../../lib/data');

describe('Data', function(){
  beforeEach(function(){

  });
  describe('filterFields', function(){
    it('should filter input fields based on input', function(){
      expect(Data.filterFields({name:'abc',password:'123'})).toEqual({name:'abc',password:'123'});
      expect(Data.filterFields({name:'abc',password:'123'}, ['name'])).toEqual({name:'abc'});
    });
  });
});