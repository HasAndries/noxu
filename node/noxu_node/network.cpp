#include "network.h"
#include "trueRandom.h"

//========== PRIVATE ==========
//---------- inbound ----------
void Network::start(){
    if (listening) return;
    //printf("<<LISTEN START\n");
    //todo: set channel
    radio->openReadingPipe(1, inboundAddress);
    radio->startListening();
    listening = true;
}
void Network::stop(){
    if (!listening) return;
    //printf("<<LISTEN STOP\n");
    radio->stopListening();
    listening = false;
}
void Network::processInbound(){
    uint8_t pipe;
    if (radio->available(&pipe)){
        byte* buffer = (byte*)malloc(sizeof(byte) * bufferSize);
        if (radio->read(buffer, bufferSize)) {
            printf("<<INBOUND(%x) -> ", pipe);
            printBytes(buffer, bufferSize);
            Message *msg = new Message(buffer, bufferSize);
            if (msg->validate()){
                receive(msg);
            }
            delete msg;
        }
        free(buffer);
    }
}
void Network::receive(Message *msg) {
    bool shouldProcess = false;

    if (msg->fromCommander && networkId == msg->networkId){
        printf("CONSUME DEVICEID\r\n");
        shouldProcess = true;
    }
    else if (msg->fromCommander && networkId == 0 && msg->dataLength == sizeof(tempId) && ((uint16_t*)msg->data)[0]==tempId){//message is for this devices' tempId
        printf("CONSUME TEMPID\r\n");
        shouldProcess = true;
    }

    if (shouldProcess){
        msg->print(">>INBOUND<<");
        sequence = msg->sequence;
        switch (msg->instruction)
        {
        case NETWORKID_NEW:
            networkId = msg->networkId;
            printf(">>NETWORKID_NEW -> %d\r\n", networkId);
            send(NETWORKID_CONFIRM, NULL, 0);
            break;
        case NETWORKID_INVALID:
            printf(">>NETWORKID_INVALID -> %d\r\n", msg->networkId);
            resetDeviceId();
            break;
        case PULSE:
            printf(">>PULSE_CONFIRM -> ");
            printBytes(msg->data, msg->dataLength);
            send(PULSE_CONFIRM, NULL, 0);
            break;
        default:
            break;
        }
        (*receiveHandler)(msg);
    }
}

//---------- outbound ----------
void Network::queueMessage(Message *msg){
    byte* buffer = msg->buildBuffer();
    //printf(">>QUEUEMESSAGE -> ");
    //printBytes(buffer, bufferSize);
    outboundQueueLength++;
    realloc(outboundQueue, outboundQueueLength * sizeof(byte));
    outboundQueue[outboundQueueLength-1] = buffer;
    processOutbound();
}

void Network::processOutbound(){
    //broadcast
    uint64_t ct =0;
    while(ct < outboundQueueLength){
        sendBuffer(outboundAddress, outboundQueue[ct]);
        free(outboundQueue[ct]);
        ct++;
    }
    outboundQueueLength = 0;
    realloc(outboundQueue, 0);
}
void Network::sendMessage(Message *msg){
    byte* buffer = msg->buildBuffer();
    sendBuffer(outboundAddress, buffer);
    free(buffer);
}
void Network::sendBuffer(uint64_t address, byte buffer[]) {
    bool wasListening = listening;
    if (listening)
        stop();

    printf(">>OUTBOUND(");
    printLL(address, 16);
    printf(") -> ");
    printBytes(buffer, bufferSize);

    radio->openWritingPipe(address);
    radio->write(buffer, bufferSize);

    if (wasListening)
        start();
}

//---------- control ----------
void Network::resetDeviceId(){
    networkId = 0;
    //tempId = random(10000, 65535);
    tempId = TrueRandom.random();
    sequence = 0;
}

//========== PUBLIC ==========
//---------- constructors ----------
Network::Network(uint64_t _inboundAddress, uint64_t _outboundAddress, uint8_t _channel, rf24_datarate_e _datarate, byte _bufferSize, unsigned int _maxLoopInterval, unsigned int _receiveDuration){
    inboundAddress = _inboundAddress;
    outboundAddress = _outboundAddress;
    channel = _channel;
    datarate = _datarate;
    bufferSize = _bufferSize;
    maxLoopInterval = _maxLoopInterval;
    receiveDuration = _receiveDuration;
    outboundQueue = (byte**)malloc(0);
    outboundQueueLength = 0;
}

//---------- lifetime ----------
void Network::setup(){
    printf("\r\n====== RFnode ======\r\n");
    listening = false;
    //randomSeed((analogRead(0)+analogRead(1))/2);
    resetDeviceId();
    printf("TempId: %u\r\n", tempId);

    radio = new RF24(9, 10);
    radio->begin();
    radio->setPALevel(RF24_PA_MAX);
    radio->setChannel(channel);
    radio->setCRCLength(RF24_CRC_16);
    radio->setDataRate(datarate);
    radio->setRetries(10,15);
    radio->setPayloadSize(bufferSize);
    radio->enableDynamicPayloads();
    radio->setAutoAck(true);
    radio->powerUp();
    //radio->setAutoAck(epBroadcast.pipe, true);
    //radio->printDetails();
    printf("\r\n=====================\r\n");
}
void Network::loop(){
    bool shouldRun = true;
    unsigned long now = millis();
    unsigned int runDiff = diff(lastRun, now);
    if (runDiff < maxLoopInterval) shouldRun = false;
    if (networkId == 0) shouldRun = true;
    if (shouldRun){//run that shit!
        lastRun = now;
        start();
        while(diff(now, millis()) < receiveDuration){
            processInbound();
        }
        stop();
        if (networkId == 0){
            send(NETWORKID_REQ, &tempId, sizeof(tempId));
        }
        //processOutbound();
    }
}

//---------- inbound ----------
void Network::setReceiveHandler(void (*f)(Message*)){
    receiveHandler = *f;
}

//---------- outbound ----------
void Network::send(byte instruction, void* data, byte byteLength){
    Message *msg = new Message(instruction, sequence, networkId, data, byteLength, bufferSize);
    sendMessage(msg);
    delete msg;
}