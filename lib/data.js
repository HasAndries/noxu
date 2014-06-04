var extend = require('node.extend');

function Data(){
}

Data.filterFields = function(input, fields){
  var output = extend({}, input);
  if (fields) {
    for (var key in output) {
      if (fields.indexOf(key) == -1) delete output[key];
    }
  }
  return output;
}

module.exports = Data;