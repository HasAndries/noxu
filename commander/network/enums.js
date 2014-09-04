var enums = {};
var createByVal = function(target){
  target.byVal = function(val){
    for(var key in target){
      if (target[key] == val) return key;
    }
    return null;
  };
};
//---------- instructions ----------
enums.Instructions = {
  NETWORK_CONNECT: 1, NETWORK_NEW: 2, NETWORK_CONFIRM: 3, NETWORK_INVALID: 4, WAKE: 5,
  PING: 10, PING_CONFIRM: 11
};
createByVal(enums.Instructions);


module.exports = enums;