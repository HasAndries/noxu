#ifndef RADIO_H
#define RADIO_H

#include <node.h>
#include "RF24.h"

class Radio : public node::ObjectWrap {
public:
    static void Init(v8::Handle<v8::Object> target);
    RF24 _rf24;
    uv_mutex_t _access;

private:
    Radio(string spi, uint32_t spd, uint8_t ce);
    ~Radio();
    static v8::Handle<v8::Value> New(const v8::Arguments& args);

    static v8::Handle<v8::Value> begin(const v8::Arguments& args);
    static v8::Handle<v8::Value> powerUp(const v8::Arguments& args);
    static v8::Handle<v8::Value> powerDown(const v8::Arguments& args);
    static v8::Handle<v8::Value> isPVariant(const v8::Arguments& args);
    static v8::Handle<v8::Value> testCarrier(const v8::Arguments& args);
    static v8::Handle<v8::Value> testRPD(const v8::Arguments& args);

    static v8::Handle<v8::Value> openReadingPipe(const v8::Arguments& args);
    static v8::Handle<v8::Value> openWritingPipe(const v8::Arguments& args);

    static v8::Handle<v8::Value> startListening(const v8::Arguments& args);
    static v8::Handle<v8::Value> stopListening(const v8::Arguments& args);
    static v8::Handle<v8::Value> available(const v8::Arguments& args);
    static v8::Handle<v8::Value> read(const v8::Arguments& args);
    static v8::Handle<v8::Value> write(const v8::Arguments& args);

    static v8::Handle<v8::Value> setPALevel(const v8::Arguments& args);
    static v8::Handle<v8::Value> getPALevel(const v8::Arguments& args);

    static v8::Handle<v8::Value> setChannel(const v8::Arguments& args);

    static v8::Handle<v8::Value> setCRCLength(const v8::Arguments& args);
    static v8::Handle<v8::Value> disableCRC(const v8::Arguments& args);
    static v8::Handle<v8::Value> getCRCLength(const v8::Arguments& args);

    static v8::Handle<v8::Value> setDataRate(const v8::Arguments& args);
    static v8::Handle<v8::Value> getDataRate(const v8::Arguments& args);

    static v8::Handle<v8::Value> setRetries(const v8::Arguments& args);

    static v8::Handle<v8::Value> setPayloadSize(const v8::Arguments& args);
    static v8::Handle<v8::Value> getPayloadSize(const v8::Arguments& args);
    static v8::Handle<v8::Value> enableDynamicPayloads(const v8::Arguments& args);
    static v8::Handle<v8::Value> getDynamicPayloadSize(const v8::Arguments& args);

    static v8::Handle<v8::Value> setAutoAck(const v8::Arguments& args);
    static v8::Handle<v8::Value> enableAckPayload(const v8::Arguments& args);
};

#endif