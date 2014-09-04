#include <EEPROM.h>
#include <SPI.h>

#include <printf.h>
#include <common.h>
#include <network.h>
#include "trueRandom.h"

//---------- settings ----------
const byte bufferSize = 16;//max 32
const unsigned int maxLoopInterval = 1000;
const unsigned int receiveDuration = 2000;
const uint64_t inboundAddress = 0x00F0F0F0F0LL;
const uint64_t outboundAddress = 0x00F0F0F0D2LL;
const uint8_t channel = 0x4c;
const rf24_datarate_e datarate = RF24_1MBPS;

uint16_t hardwareId;

Network *network;

void setup() {
    Serial.begin(57600);
    printf_begin();
    hardwareId = TrueRandom.random();
    network = new Network(inboundAddress, outboundAddress, channel, datarate, bufferSize, &hardwareId);
    network->setup();
    network->setReceiveHandler(receive);
}

void loop() {
    network->loop();
}

void receive(Message *msg){
    switch (msg->instruction)
        {
        case WAKE:
            network->send(WAKE, NULL, 0);
        default:
            break;
        }
    //printf("<<DATA(%d) ", msg->instruction);
    //printBytes(msg->data, msg->dataLength);
}
