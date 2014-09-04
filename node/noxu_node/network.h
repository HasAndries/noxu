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

    uint16_t tempId;
    uint16_t networkId;
    byte sequence;
    unsigned long lastRun;
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
    void resetDeviceId();
public:
	//---------- constructors ----------
    Network(uint64_t _inboundAddress, uint64_t _outboundAddress, uint8_t channel, rf24_datarate_e datarate, byte _bufferSize, unsigned int maxLoopInterval, unsigned int receiveDuration);

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
    NETWORKID_REQ = 1, NETWORKID_NEW = 2, NETWORKID_CONFIRM = 3, NETWORKID_INVALID = 4,
    PULSE = 10, PULSE_CONFIRM = 11
} instructions;

#endif