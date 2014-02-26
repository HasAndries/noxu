//var rf24 = require('./build/Release/rf24');
var rf24 = require('./build/Debug/rf24');

var RF24_PA = { RF24_PA_MIN: 0, RF24_PA_LOW: 1, RF24_PA_HIGH: 2, RF24_PA_MAX: 3, RF24_PA_ERROR: 4 };


var radio = new rf24.Radio("/dev/spidev0.0", 8000000, 25);
radio.begin();
radio.setRetries(15, 15);
radio.setChannel(0x4c);
radio.setPALevel(RF24_PA.RF24_PA_MAX);
radio.openWritingPipe(0xF0F0F0F0F0);
radio.openReadingPipe(1, 0xF0F0F0F0F0);
radio.startListening();
if (radio.available()){
  var data = radio.read();
  console.log('data:'+JSON.stringify(data));
}