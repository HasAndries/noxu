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
      expect(message.control).toEqual(0);
      expect(message.fromCommander).toEqual(true);
      expect(message.instruction).toEqual(null);
      expect(message.sequence).toEqual(0);
      expect(message.networkId).toEqual(0);
      expect(message.data).toEqual(null);
    });
    it('should create a message based on a data Buffer', function () {
      var message = new Message({bufferSize: 16, fromCommander: false, instruction: 23, sequence: 13, networkId: 331456, data: [4, 9]});
      expect(message.bufferSize).toEqual(16);
      expect(message.fromCommander).toEqual(false);
      expect(message.instruction).toEqual(23);
      expect(message.sequence).toEqual(13);
      expect(message.networkId).toEqual(331456);
      expect(message.data.toJSON()).toEqual([4, 9]);
    });
    it('should create a message based on input options', function () {
      var message = new Message({buffer: [0, 23, 13, 192, 14, 5, 0, 2, 4, 9, 0, 0, 0, 0, 0, 0]});
      expect(message.fromCommander).toEqual(false);
      expect(message.instruction).toEqual(23);
      expect(message.sequence).toEqual(13);
      expect(message.networkId).toEqual(331456);
      expect(message.data.toJSON()).toEqual([4, 9]);
    });
  });
  describe('toBuffer', function () {
    it('should serialize to a Buffer object', function () {
      var message = new Message({bufferSize: 16, fromCommander: false, instruction: 23, sequence: 13, networkId: 331456, data: [4, 9]});
      var buffer = message.toBuffer();
      expect(buffer instanceof Buffer).toEqual(true);
      expect(buffer.toJSON()).toEqual([0, 23, 13, 192, 14, 5, 0, 2, 4, 9, 0, 0, 0, 0, 0, 0]);

      var reverse = new Message({buffer: buffer});
      expect(message.control).toEqual(reverse.control);
      expect(message.fromCommander).toEqual(reverse.fromCommander);
      expect(message.instruction).toEqual(reverse.instruction);
      expect(message.sequence).toEqual(reverse.sequence);
      expect(message.networkId).toEqual(reverse.networkId);
      expect(message.data.toJSON()).toEqual(reverse.data.toJSON());
    });
  });
});