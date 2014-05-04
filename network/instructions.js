var instructions = {
  NETWORK_CONNECT: 1, NETWORK_NEW: 2, NETWORK_CONFIRM: 3, NETWORK_INVALID: 4, WAKE: 5,
  PING: 10, PING_CONFIRM: 11
};
instructions.byVal = function(val){
  for(var key in instructions){
    if (instructions[key] == val) return key;
  }
  return null;
};
module.exports = instructions;