//network.h
/*

Instruction types are at the bottom

*/
#ifndef Network_H
#define Network_H

#include "base.h"
#include <SPI.h>
#include "nRF24L01.h"
#include "RF24.h"
#include "printf.h"
#include "common.h"
#include "message.h"

class Network{
private:
    //---------- properties ----------
    uint64_t inboundAddress;
    uint64_t outboundAddress;
    uint8_t channel;
    rf24_datarate_e datarate;
    byte bufferSize;//max 32
    unsigned int maxLoopInterval;
    unsigned int receiveDuration;
    RF24 *radio;

    uint16_t networkId;
    uint16_t deviceId;
    uint16_t* hardwareId;
    byte transactionId;
    unsigned long sleepWakeMillis;
    bool sleepOverflow;
    byte* sleepMessage;
    unsigned long lastNetworkRun;
    bool listening;
    void (*receiveHandler)(Message*);

    byte** outboundQueue;
    uint64_t outboundQueueLength;

    //---------- inbound ----------
    void start();
    void stop();
    void processInbound();
    void receive(Message *msg);

    //---------- outbound ----------
    void queueMessage(Message *msg);
    void processOutbound();
    void sendMessage(Message *msg);
    void sendBuffer(uint64_t address, byte buffer[]);

    //---------- control ----------
    void resetNetwork();
    void sleep(byte seconds, Message *msg);
    void wake();
public:
	//---------- constructors ----------
    Network(uint64_t _inboundAddress, uint64_t _outboundAddress, uint8_t channel, rf24_datarate_e datarate, byte _bufferSize, uint16_t* _hardwareIdId);

	//---------- lifetime ----------
    void setup();
    void loop();

	//---------- inbound ----------
    void setReceiveHandler(void (*f)(Message*));

	//---------- outbound ----------
    void send(byte instruction, void* data, byte byteLength);
};

//---------- instructions ----------
typedef enum {
    NETWORK_CONNECT = 1, NETWORK_NEW = 2, NETWORK_CONFIRM = 3, NETWORK_INVALID = 4, WAKE = 5,
    PING = 10, PING_CONFIRM = 11
} instructions;

#endif