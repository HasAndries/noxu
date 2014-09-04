#include "message.h"

//========== PRIVATE ==========
//---------- constructors ----------
void Message::init(){
    version = 1;
    networkId = 0;
    deviceId = 0;
    transactionId = 0;
    instruction = 0;
    control = 0;
    fromCommander = false;
    sleep = 0;
    dataLength = 0;
}

//========== PUBLIC ==========
//---------- constructors ----------
Message::Message(uint16_t _networkId, uint16_t _deviceId, byte _transactionId, byte _instruction, void *_data, byte _dataLength, byte _bufferSize){
    init();
    bufferSize = _bufferSize;

    networkId = _networkId;
    deviceId = _deviceId;
    transactionId = _transactionId;
    instruction = _instruction;
    
    if (_data != NULL){
        data = (byte*)malloc(sizeof(byte) * _dataLength);
        memset(data, 0, _dataLength);
        for(byte ct=0;ct<_dataLength;ct++)
            data[ct] = ((byte*)_data)[ct];
    }
    dataLength = _dataLength;
}
Message::Message(byte* _buffer, byte _bufferSize){
    init();
    bufferSize = _bufferSize;
    //header
    version = _buffer[0];
    memcpy(&networkId, _buffer+1, 2);
    memcpy(&deviceId, _buffer+3, 2);
    transactionId = _buffer[5];
    instruction = _buffer[6];
    control = _buffer[7];
    fromCommander = isBitSet(control, 0);
    isRelay = isBitSet(control, 1);
    sleep = _buffer[8];
    dataLength = _buffer[9];
    byte dataStart = 10;

    if (validate()){
        data = (byte*)malloc(sizeof(byte) * dataLength);
        for(byte ct=0;ct<dataLength;ct++)
            data[ct] = _buffer[dataStart + ct];
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
    buffer[0] = version;
    memcpy(buffer+1, &networkId, 2);
    memcpy(buffer+3, &deviceId, 2);
    buffer[5] = transactionId;
    buffer[6] = instruction;
    buffer[7] = setBit(buffer[7], 0, fromCommander);//fromCommander
    buffer[7] = setBit(buffer[7], 1, isRelay);//isRelay
    buffer[8] = sleep;    
    buffer[9] = dataLength;
    byte dataStart = 10;
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
    printf("version:%d networkId:%u deviceId:%u transactionId:%d instruction:%d control:%d sleep:%d dataLength:%d\r\n",
        version, networkId, deviceId, transactionId, instruction, control, sleep, dataLength);

    printf("data:");
    printBytes(data, dataLength);

    printf("buffer:");
    byte* buffer = buildBuffer();
    printBytes(buffer, bufferSize);
    free(buffer);

    printf("==========\r\n");
}