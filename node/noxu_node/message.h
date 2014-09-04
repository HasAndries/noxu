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
    byte control;
    bool fromCommander;
    byte instruction;
    byte sequence;
    uint32_t networkId;
    byte dataLength;
    byte *data;

	//---------- constructors ----------
    Message(byte instruction, byte _sequence, uint32_t _networkId, void *_data, byte _dataLength, byte _bufferSize);
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