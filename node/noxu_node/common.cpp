#include "common.h"

//---------- bit operations ----------
bool isBitSet (byte b, int n) {
    static byte mask[] = {128, 64, 32, 16, 8, 4, 2, 1};
    return ((b & mask[n]) != 0);
}
byte setBit(byte b, byte n, bool on){
    static byte mask[] = {128, 64, 32, 16, 8, 4, 2, 1};
    if (on)
        return b |= mask[n];
    else
        return isBitSet(b, n) ? b ^= mask[n] : b;
}
//---------- math ----------
unsigned long diff(unsigned long a, unsigned long b){
    if (a > b) return abs(a - b);
    else return abs(b - a);
}
//---------- printing ----------
void printBytes(byte* ptr, int length){
    for(int ct=0;ct<length-1;ct++){
        printf("%d,", ptr[ct]);
    }
    printf("%d\r\n", ptr[length-1]);
}
//---------- printLL ----------
void printLL(uint64_t n, uint8_t base)
{
    unsigned char buf[16 * sizeof(long)]; 
    unsigned int i = 0;

    if (n == 0) 
    {
        Serial.write((char)'0');
        return;
    }

    while (n > 0) 
    {
        buf[i++] = n % base;
        n /= base;
    }

    for (; i > 0; i--)
        Serial.write((char) (buf[i - 1] < 10 ?
        '0' + buf[i - 1] :
    'A' + buf[i - 1] - 10));
}
int findIndex(byte arr[], byte length, byte searchVal)
{
    byte i;
    for (i=0; i<length; i++)
        if (arr[i] == searchVal) return(i);
    return(-1);
}