#include "network.h"

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
    bool processDeviceId = false, processHardwareId = false;

    if (msg->fromCommander && networkId == msg->networkId && deviceId == msg->deviceId){
        printf("CONSUME NetworkId/DeviceId\r\n");
        processDeviceId = true;
    }
    else if (msg->fromCommander && networkId == 0 && deviceId == 0 && msg->dataLength == sizeof(hardwareId) && ((uint16_t*)msg->data)[0]==*hardwareId){//message is for this hardwareId
        printf("CONSUME HardwareId\r\n");
        processHardwareId = true;
    }
    if (processDeviceId || processHardwareId){
        msg->print(">>INBOUND<<");
        if (processDeviceId){
            byte expectedTransactionId = transactionId+1;
            transactionId = msg->transactionId;
            if (expectedTransactionId != transactionId){
                printf("ERROR Expected TransactionId %d and got %d\r\n", expectedTransactionId, transactionId);
            }
        }
        switch (msg->instruction)
        {
        case NETWORK_NEW:
            networkId = msg->networkId;
            deviceId = msg->deviceId;
            printf(">>NETWORK_NEW -> %d/%d\r\n", networkId, deviceId);
            send(NETWORK_CONFIRM, NULL, 0);
            break;
        case NETWORK_INVALID:
            printf(">>NETWORK_INVALID -> %d\r\n", msg->networkId);
            resetNetwork();
            break;
        case PING:
            printf(">>PING_CONFIRM -> ");
            printBytes(msg->data, msg->dataLength);
            send(PING_CONFIRM, NULL, 0);
            break;
        default:
            break;
        }
        if (msg->sleep > 0) sleep(msg->sleep, msg);
        else (*receiveHandler)(msg);
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
void Network::resetNetwork(){
    networkId = 0;
    deviceId = 0;
    transactionId = 0;
}
void Network::sleep(byte seconds, Message *msg){
    unsigned long now = millis();
    sleepWakeMillis = seconds*1000 + now;
    if (sleepWakeMillis == 0) sleepWakeMillis = 1;
    sleepOverflow = sleepWakeMillis < now;
    sleepMessage = msg->buildBuffer();
    printf("SLEEP %lu -> %lu\r\n", millis(), sleepWakeMillis);
}
void Network::wake(){
    printf("WAKE %lu\r\n", millis());
    sleepWakeMillis = 0;
    sleepOverflow = false;
    Message *msg = new Message(sleepMessage, bufferSize);
    (*receiveHandler)(msg);
    delete msg;
    free(sleepMessage);
}
//========== PUBLIC ==========
//---------- constructors ----------
Network::Network(uint64_t _inboundAddress, uint64_t _outboundAddress, uint8_t _channel, rf24_datarate_e _datarate, byte _bufferSize, uint16_t* _hardwareId){
    inboundAddress = _inboundAddress;
    outboundAddress = _outboundAddress;
    channel = _channel;
    datarate = _datarate;
    bufferSize = _bufferSize;
    hardwareId = _hardwareId;
    outboundQueue = (byte**)malloc(0);
    outboundQueueLength = 0;

    maxLoopInterval = 1000;
    receiveDuration = 1000;

    sleepWakeMillis = 0;
    sleepOverflow = false;
}

//---------- lifetime ----------
void Network::setup(){
    printf("\r\n====== RFnode ======\r\n");
    listening = false;
    resetNetwork();
    printf("HardwareId: %u %lu\r\n", hardwareId, hardwareId);

    radio = new RF24(9, 10);
    radio->begin();
    radio->setPALevel(RF24_PA_MAX);
    radio->setChannel(channel);
    radio->setCRCLength(RF24_CRC_16);
    radio->setDataRate(datarate);
    radio->setRetries(15,15);
    radio->setPayloadSize(bufferSize);
    radio->enableDynamicPayloads();
    radio->setAutoAck(true);
    radio->powerUp();
    //radio->setAutoAck(epBroadcast.pipe, true);
    //radio->printDetails();
    printf("\r\n=====================\r\n");
}
void Network::loop(){
    unsigned long now = millis();
    if (sleepWakeMillis != 0){ //sleeping
        if (sleepOverflow && now < sleepWakeMillis) sleepOverflow = false; //overflow is done
        if (!sleepOverflow && sleepWakeMillis > now) return; //still sleeping
        wake();
    }

    bool runNetwork = true;
    if (diff(lastNetworkRun, now) >= maxLoopInterval){
        lastNetworkRun = now;
        start();
        while(diff(now, millis()) < receiveDuration){
            processInbound();
        }
        stop();
        if (networkId == 0){
            send(NETWORK_CONNECT, hardwareId, sizeof(deviceId));
        }
    }
}

//---------- inbound ----------
void Network::setReceiveHandler(void (*f)(Message*)){
    receiveHandler = *f;
}

//---------- outbound ----------
void Network::send(byte instruction, void* data, byte byteLength){
    Message *msg = new Message(networkId, deviceId, transactionId, instruction, data, byteLength, bufferSize);
    sendMessage(msg);
    delete msg;
}