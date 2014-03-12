var instructions = {
  NETWORKID_REQ: 1, NETWORKID_NEW: 2, NETWORKID_CONFIRM: 3, NETWORKID_INVALID: 4,
  PULSE: 10, PULSE_CONFIRM: 11
};
instructions.byVal = function(val){
  for(var key in instructions){
    if (instructions[key] == val) return key;
  }
  return null;
};
module.exports = instructions;