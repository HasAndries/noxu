var Message = require('../../network/message');

describe('Message', function () {
  beforeEach(function () {

  });
  afterEach(function () {
  });

  describe('Constructor', function () {
    it('should create a message with defaults', function () {
      var message = new Message();
      expect(message.bufferSize).toEqual(32);
      expect(message.version).toEqual(1);
      expect(message.networkId).toEqual(0);
      expect(message.deviceId).toEqual(0);
      expect(message.transactionId).toEqual(0);
      expect(message.instruction).toEqual(0);
      expect(message.fromCommander).toEqual(true);
      expect(message.isRelay).toEqual(false);
      expect(message.sleep).toEqual(0);
      expect(message.data).toEqual(null);
    });
    it('should create a message based on input options', function () {
      var message = new Message({
        bufferSize: 16,
        networkId: 33146,
        deviceId: 15689,
        transactionId: 13,
        instruction: 2,
        fromCommander: false,
        isRelay: true,
        sleep: 5,
        data: [4, 9]
      });
      expect(message.bufferSize).toEqual(16);
      expect(message.networkId).toEqual(33146);
      expect(message.deviceId).toEqual(15689);
      expect(message.transactionId).toEqual(13);
      expect(message.instruction).toEqual(2);
      expect(message.fromCommander).toEqual(false);
      expect(message.isRelay).toEqual(true);
      expect(message.sleep).toEqual(5);
      expect(message.data.toJSON()).toEqual([4, 9]);
    });
    it('should create a message based on a data Buffer', function () {
      var message = new Message({buffer: [2, 122, 129, 73, 61, 13, 2, 64, 5, 2, 4, 9, 0, 0, 0, 0]});

      expect(message.version).toEqual(2);
      expect(message.networkId).toEqual(33146);
      expect(message.deviceId).toEqual(15689);
      expect(message.transactionId).toEqual(13);
      expect(message.instruction).toEqual(2);
      expect(message.fromCommander).toEqual(false);
      expect(message.isRelay).toEqual(true);
      expect(message.sleep).toEqual(5);
      expect(message.data.toJSON()).toEqual([4, 9]);
    });
  });
  describe('toBuffer', function () {
    it('should serialize to a Buffer object', function () {
      var message = new Message({
        bufferSize: 16,
        networkId: 33146,
        deviceId: 15689,
        transactionId: 13,
        instruction: 2,
        fromCommander: false,
        isRelay: true,
        sleep: 5,
        data: [4, 9]
      });
      var buffer = message.toBuffer();
      expect(buffer instanceof Buffer).toEqual(true);
      expect(buffer.toJSON()).toEqual([1, 122, 129, 73, 61, 13, 2, 64, 5, 2, 4, 9, 0, 0, 0, 0]);

      var reverse = new Message({buffer: buffer});
      expect(message.version).toEqual(reverse.version);
      expect(message.networkId).toEqual(reverse.networkId);
      expect(message.deviceId).toEqual(reverse.deviceId);
      expect(message.transactionId).toEqual(reverse.transactionId);
      expect(message.instruction).toEqual(reverse.instruction);
      expect(message.fromCommander).toEqual(reverse.fromCommander);
      expect(message.isRelay).toEqual(reverse.isRelay);
      expect(message.sleep).toEqual(reverse.sleep);
      expect(message.data.toJSON()).toEqual(reverse.data.toJSON());
    });
  });
});