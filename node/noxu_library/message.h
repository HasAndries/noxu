//message.h
#ifndef Message_H
#define Message_H

#include "base.h"
#include "common.h"

class Message{
private:
    //---------- properties ----------
    bool freed;
    void init();
protected:
public:
    //---------- properties ----------
    byte bufferSize;
    byte version;
    uint16_t networkId;
    uint16_t deviceId;
    byte transactionId;
    byte instruction;
    byte control;
    bool fromCommander;//control[0]
    bool isRelay;//control[1]
    byte sleep;
    byte dataLength;
    byte *data;

	//---------- constructors ----------
    Message(uint16_t _networkId, uint16_t _deviceId, byte _transactionId, byte _instruction, void *_data, byte _dataLength, byte _bufferSize);
    Message(byte *buffer, byte _bufferSize);
    ~Message();

	//---------- validation ----------
    bool validate();
	
	//---------- output ----------
    byte* buildBuffer();

	//---------- print ----------
    void print(char *heading);
};
#endif