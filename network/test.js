var NRF24 = require("nrf"),
  spiDev = "/dev/spidev0.0",
  cePin = 24, irqPin = 25,            //var ce = require("./gpio").connect(cePin)
  pipes = [0xF0F0F0F0F0, 0xF0F0F0F0F0];

var nrf = NRF24.connect(spiDev, cePin, irqPin);
nrf.channel(62).transmitPower('PA_MAX').dataRate('1Mbps').crcBytes(2).autoRetransmit({count: 15, delay: 500}).begin(function () {
  var rx = nrf.openPipe('rx', pipes[0]),
    tx = nrf.openPipe('tx', pipes[1]);
  rx.on('data', function (d) {
    console.log("Got data, will respond", d.readUInt32BE(0));
    tx.write(d);
  });
  tx.on('error', function (e) {
    console.warn("Error sending reply.", e);
  });
});