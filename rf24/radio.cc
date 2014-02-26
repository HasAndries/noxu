//#define BUILDING_NODE_EXTENSION
#include <node.h>
#include <node_buffer.h>
#include "radio.h"

using namespace v8;

Radio::Radio(string spi, uint32_t spd, uint8_t ce) : _rf24(spi,spd,ce) {
    uv_mutex_init(&_access);
};
Radio::~Radio() {
    uv_mutex_destroy(&_access);
};

void Radio::Init(Handle<Object> target) {
    // Prepare constructor template
    Local<FunctionTemplate> tpl = FunctionTemplate::New(New);
    tpl->SetClassName(String::NewSymbol("Radio"));
    tpl->InstanceTemplate()->SetInternalFieldCount(1);
    // Prototype
    tpl->PrototypeTemplate()->Set(String::NewSymbol("begin"), FunctionTemplate::New(begin)->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("powerUp"), FunctionTemplate::New(powerUp)->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("powerDown"), FunctionTemplate::New(powerDown)->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("isPVariant"), FunctionTemplate::New(isPVariant)->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("testCarrier"), FunctionTemplate::New(testCarrier)->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("testRPD"), FunctionTemplate::New(testRPD)->GetFunction());

    tpl->PrototypeTemplate()->Set(String::NewSymbol("openReadingPipe"), FunctionTemplate::New(openReadingPipe)->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("openWritingPipe"), FunctionTemplate::New(openWritingPipe)->GetFunction());

    tpl->PrototypeTemplate()->Set(String::NewSymbol("startListening"), FunctionTemplate::New(startListening)->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("stopListening"), FunctionTemplate::New(stopListening)->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("available"), FunctionTemplate::New(available)->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("read"), FunctionTemplate::New(read)->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("write"), FunctionTemplate::New(write)->GetFunction());

    tpl->PrototypeTemplate()->Set(String::NewSymbol("setPALevel"), FunctionTemplate::New(setPALevel)->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("getPALevel"), FunctionTemplate::New(getPALevel)->GetFunction());

    tpl->PrototypeTemplate()->Set(String::NewSymbol("setChannel"), FunctionTemplate::New(setChannel)->GetFunction());

    tpl->PrototypeTemplate()->Set(String::NewSymbol("setCRCLength"), FunctionTemplate::New(setCRCLength)->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("disableCRC"), FunctionTemplate::New(disableCRC)->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("getCRCLength"), FunctionTemplate::New(getCRCLength)->GetFunction());

    tpl->PrototypeTemplate()->Set(String::NewSymbol("setDataRate"), FunctionTemplate::New(setDataRate)->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("getDataRate"), FunctionTemplate::New(getDataRate)->GetFunction());

    tpl->PrototypeTemplate()->Set(String::NewSymbol("setRetries"), FunctionTemplate::New(setRetries)->GetFunction());

    tpl->PrototypeTemplate()->Set(String::NewSymbol("setPayloadSize"), FunctionTemplate::New(setPayloadSize)->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("getPayloadSize"), FunctionTemplate::New(getPayloadSize)->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("enableDynamicPayloads"), FunctionTemplate::New(enableDynamicPayloads)->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("getDynamicPayloadSize"), FunctionTemplate::New(getDynamicPayloadSize)->GetFunction());

    tpl->PrototypeTemplate()->Set(String::NewSymbol("setAutoAck"), FunctionTemplate::New(setAutoAck)->GetFunction());
    tpl->PrototypeTemplate()->Set(String::NewSymbol("enableAckPayload"), FunctionTemplate::New(enableAckPayload)->GetFunction());

    Persistent<Function> constructor = Persistent<Function>::New(tpl->GetFunction());
    target->Set(String::NewSymbol("Radio"), constructor);
}

Handle<Value> Radio::New(const Arguments& args) {
  HandleScope scope;

  assert(args.Length() == 3);
  assert(args[0]->IsString());
  assert(args[1]->IsNumber());
  assert(args[2]->IsNumber());

  Radio* obj = new Radio(*String::Utf8Value(args[0]->ToString()), args[1]->NumberValue(), args[2]->NumberValue());
  obj->Wrap(args.This());

  return args.This();
}

Handle<Value> Radio::begin(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 0);
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    self->_rf24.begin();
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Undefined());
}
Handle<Value> Radio::powerUp(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 0);
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    self->_rf24.powerUp();
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Undefined());
}
Handle<Value> Radio::powerDown(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 0);
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    self->_rf24.powerDown();
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Undefined());
}
Handle<Value> Radio::isPVariant(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 0);
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    bool retVal = self->_rf24.isPVariant();
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Boolean::New(retVal));
}
Handle<Value> Radio::testCarrier(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 0);
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    bool retVal = self->_rf24.testCarrier();
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Boolean::New(retVal));
}
Handle<Value> Radio::testRPD(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 0);
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    bool retVal = self->_rf24.testRPD();
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Boolean::New(retVal));
}

Handle<Value> Radio::openReadingPipe(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 2);
    assert(args[0]->IsNumber());
    assert(args[1]->IsNumber());
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    self->_rf24.openReadingPipe(args[0]->NumberValue(), args[1]->Uint32Value());
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Undefined());
}
Handle<Value> Radio::openWritingPipe(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 1);
    assert(args[0]->IsNumber());
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    self->_rf24.openWritingPipe(args[0]->Uint32Value());
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Undefined());
}

Handle<Value> Radio::startListening(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 0);
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    self->_rf24.startListening();
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Undefined());
}
Handle<Value> Radio::stopListening(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 0);
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    self->_rf24.stopListening();
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Undefined());
}
Handle<Value> Radio::available(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 0);
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    bool dataAvailable = self->_rf24.available();
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Boolean::New(dataAvailable));
}
Handle<Value> Radio::read(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 0);
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    uint8_t payloadSize = self->_rf24.getPayloadSize();
    //node::Buffer* buffer = node::Buffer::New(payloadSize);
    uint8_t* buffer = (uint8_t*)malloc(sizeof(uint8_t) * payloadSize);
    self->_rf24.read(buffer, payloadSize);
    uv_mutex_unlock(&(self->_access));

    node::Buffer *slowBuffer = node::Buffer::New(payloadSize);
    memcpy(node::Buffer::Data(slowBuffer), buffer, payloadSize);

    Local<Object> globalObj = Context::GetCurrent()->Global();
    Local<Function> bufferConstructor = Local<Function>::Cast(globalObj->Get(String::New("Buffer")));
    Handle<Value> constructorArgs[3] = { slowBuffer->handle_, v8::Integer::New(payloadSize), v8::Integer::New(0) };
    Local<Object> actualBuffer = bufferConstructor->NewInstance(3, constructorArgs);
    return scope.Close(actualBuffer);
}
Handle<Value> Radio::write(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 1);
    assert(node::Buffer::HasInstance(args[0]));
    Local<Object> buffer = args[0]->ToObject();
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    self->_rf24.write(node::Buffer::Data(buffer), node::Buffer::Length(buffer));
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Undefined());
}

Handle<Value> Radio::setPALevel(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 1);
    assert(args[0]->IsNumber());
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    self->_rf24.setPALevel(static_cast<rf24_pa_dbm_e>(args[0]->NumberValue()));
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Undefined());
}
Handle<Value> Radio::getPALevel(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 0);
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    rf24_pa_dbm_e retVal = self->_rf24.getPALevel();
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Number::New(retVal));
}

Handle<Value> Radio::setChannel(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 1);
    assert(args[0]->IsNumber());
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    self->_rf24.setChannel(args[0]->NumberValue());
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Undefined());
}

Handle<Value> Radio::setCRCLength(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 1);
    assert(args[0]->IsNumber());
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    self->_rf24.setCRCLength(static_cast<rf24_crclength_e>(args[0]->NumberValue()));
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Undefined());
}
Handle<Value> Radio::disableCRC(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 0);
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    self->_rf24.disableCRC();
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Undefined());
}
Handle<Value> Radio::getCRCLength(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 0);
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    rf24_crclength_e retVal = self->_rf24.getCRCLength();
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Number::New(retVal));
}

Handle<Value> Radio::setDataRate(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 1);
    assert(args[0]->IsNumber());
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    self->_rf24.setDataRate(static_cast<rf24_datarate_e>(args[0]->NumberValue()));
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Undefined());
}
Handle<Value> Radio::getDataRate(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 0);
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    rf24_datarate_e retVal = self->_rf24.getDataRate();
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Number::New(retVal));
}

Handle<Value> Radio::setRetries(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 2);
    assert(args[0]->IsNumber());
    assert(args[1]->IsNumber());
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    self->_rf24.setRetries(args[0]->NumberValue(), args[1]->NumberValue());
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Undefined());
}

Handle<Value> Radio::setPayloadSize(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 1);
    assert(args[0]->IsNumber());
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    self->_rf24.setPayloadSize(args[0]->NumberValue());
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Undefined());
}
Handle<Value> Radio::getPayloadSize(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 1);
    assert(args[0]->IsNumber());
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    uint8_t retVal = self->_rf24.getPayloadSize();
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Number::New(retVal));
}
Handle<Value> Radio::enableDynamicPayloads(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 0);
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    self->_rf24.enableDynamicPayloads();
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Undefined());
}
Handle<Value> Radio::getDynamicPayloadSize(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 1);
    assert(args[0]->IsNumber());
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    uint8_t retVal = self->_rf24.getDynamicPayloadSize();
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Number::New(retVal));
}

Handle<Value> Radio::setAutoAck(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() >= 1);
    assert(args[0]->IsBoolean());
    if (args.Length() == 2)
        assert(args[1]->IsNumber());
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    if (args.Length() == 2)
        self->_rf24.setAutoAck(args[1]->NumberValue(), args[0]->BooleanValue());
    else
        self->_rf24.setAutoAck(args[0]->BooleanValue());
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Undefined());
}
Handle<Value> Radio::enableAckPayload(const Arguments& args) {
    HandleScope scope;
    assert(args.Length() == 0);
    Radio* self = ObjectWrap::Unwrap<Radio>(args.This());

    uv_mutex_lock(&(self->_access));
    self->_rf24.enableAckPayload();
    uv_mutex_unlock(&(self->_access));
    return scope.Close(Undefined());
}

void InitAll(Handle<Object> exports) {
  Radio::Init(exports);
}

NODE_MODULE(rf24, InitAll)