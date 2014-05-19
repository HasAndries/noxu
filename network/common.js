Buffer.prototype.toByteArray = function () {
  return Array.prototype.slice.call(this, 0);
};

module.exports = {};