#include "message.h"

//========== PRIVATE ==========
//---------- constructors ----------
void Message::init(){
    control = 0;
    fromCommander = false;
    instruction = 0;
    dataLength = 0;
    networkId = 0;
}

//========== PUBLIC ==========
//---------- constructors ----------
Message::Message(byte _instruction, byte _sequence, uint32_t _networkId, void *_data, byte _dataLength, byte _bufferSize){
    init();
    bufferSize = _bufferSize;
    instruction = _instruction;
    sequence = _sequence;
    networkId = _networkId;
    if (_data != NULL){
        data = (byte*)malloc(sizeof(byte) * _dataLength);
        memset(data, 0, _dataLength);
        for(byte ct=0;ct<_dataLength;ct++)
            data[ct] = ((byte*)_data)[ct];
    }
    dataLength = _dataLength;
}
Message::Message(byte* buffer, byte _bufferSize){
    init();
    bufferSize = _bufferSize;
    //header
    control = buffer[0];
    fromCommander = isBitSet(control, 0);
    instruction = buffer[1];
    sequence = buffer[2];
    memcpy(&networkId, buffer+3, 4);
    dataLength = buffer[7];
    byte dataStart = 8;

    if (validate()){
        data = (byte*)malloc(sizeof(byte) * dataLength);
        for(byte ct=0;ct<dataLength;ct++)
            data[ct] = buffer[dataStart + ct];
    }
}
Message::~Message(){
    if (freed)
        return;
    free(data);
    freed = true;
}

//---------- validation ----------
bool Message::validate(){
    return dataLength+7 < bufferSize;
}

//---------- output ----------
byte* Message::buildBuffer(){
    byte* buffer = (byte*)malloc(sizeof(byte) * bufferSize);
    memset(buffer, 0, bufferSize);
    buffer[0] = setBit(buffer[0], 0, fromCommander);//fromCommander
    buffer[1] = instruction;
    buffer[2] = sequence;
    memcpy(buffer+3, &networkId, 4);
    buffer[7] = dataLength;
    byte dataStart = 8;
    //data
    if (data != NULL){
        for(byte ct=0;ct<dataLength;ct++)
            buffer[dataStart+ct] = data[ct];
    }
    return buffer;
}

//---------- print ----------
void Message::print(char *heading){
    printf("===== %s(Message) =====\r\n", heading);
    printf("control:%d instruction:%d sequence:%d networkId:%lu dataLength:%d\r\n", control, instruction, sequence, networkId, dataLength);

    printf("data:");
    printBytes(data, dataLength);

    printf("buffer:");
    byte* buffer = buildBuffer();
    printBytes(buffer, bufferSize);
    free(buffer);

    printf("==========\r\n");
}