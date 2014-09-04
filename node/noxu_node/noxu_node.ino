#include <EEPROM.h>
#include <SPI.h>

#include "printf.h"
#include "common.h"
#include "network.h"

//---------- settings ----------
const byte bufferSize = 32;//max 32
const unsigned int maxLoopInterval = 1000;
const unsigned int receiveDuration = 2000;
const uint64_t inboundAddress = 0x00F0F0F0F0LL;
const uint64_t outboundAddress = 0x00F0F0F0D2LL;
const uint8_t channel = 0x4c;
const rf24_datarate_e datarate = RF24_1MBPS;

Network *network;

void setup() {
    Serial.begin(57600);
    printf_begin();
    network = new Network(inboundAddress, outboundAddress, channel, datarate, bufferSize, maxLoopInterval, receiveDuration);
    network->setup();
    network->setReceiveHandler(receive);
}

void loop() {
    network->loop();
}

void receive(Message *msg){
    printf("<<DATA(%d) ", msg->instruction);
    printBytes(msg->data, msg->dataLength);
}