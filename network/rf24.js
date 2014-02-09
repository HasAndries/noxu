function RF24(){

}
RF.PA = {
  RF24_PA_MIN:0,RF24_PA_LOW:1, RF24_PA_HIGH:2, RF24_PA_MAX:3, RF24_PA_ERROR:4
};
RF.DataRate = {
  RF24_1MBPS:0, RF24_2MBPS:1, RF24_250KBPS:2
}
RF.CrcLength = {
  RF24_CRC_DISABLED:0, RF24_CRC_8:1, RF24_CRC_16:2
};
//private
RF24.prototype._csn = function(mode){

};
RF24.prototype._ce = function(level){

};

RF24.prototype._read_register = function(reg, buf, len){

};
RF24.prototype._write_register = function(reg, buf, len){

};
RF24.prototype._write_payload = function(buf, len){

};
RF24.prototype._read_payload = function(buf, len){

};
RF24.prototype._flush_rx = function(){

};
RF24.prototype._flush_tx = function(){

};
RF24.prototype._get_status = function(){

};
RF24.prototype._toggle_features = function(){

};
//public
RF24.prototype.begin = function(){

};
RF24.prototype.startListening = function(){

};
RF24.prototype.stopListening = function(){

};
RF24.prototype.write = function(){

};
RF24.prototype.available = function(){

};
RF24.prototype.read = function(){

};
RF24.prototype.openWritingPipe = function(){

};
RF24.prototype.openReadingPipe = function(){

};
RF24.prototype.setRetries = function(){

};
RF24.prototype.setChannel = function(){

};
RF24.prototype.setPayloadSize = function(){

};
RF24.prototype.getPayloadSize = function(){

};
RF24.prototype.getDynamicPayloadSize = function(){

};
RF24.prototype.enableAckPayload = function(){

};
RF24.prototype.enableDynamicPayloads = function(){

};
RF24.prototype.isPVariant = function(){

};
RF24.prototype.setAutoAck = function(){

};
RF24.prototype.setPALevel = function(){

};
RF24.prototype.getPALevel = function(){

};
RF24.prototype.setDataRate = function(){

};
RF24.prototype.getDataRate = function(){

};
RF24.prototype.setCRCLength = function(){

};
RF24.prototype.getCRCLength = function(){

};
RF24.prototype.disableCRC = function(){

};
RF24.prototype.powerDown = function(){

};
RF24.prototype.powerUp = function(){

};
RF24.prototype.startWrite = function(){

};
RF24.prototype.writeAckPayload = function(){

};
RF24.prototype.isAckPayloadAvailable = function(){

};
RF24.prototype.whatHappened = function(){

};
RF24.prototype.testCarrier = function(){

};
RF24.prototype.testRPD = function(){

};
RF24.prototype.isValid = function(){

};