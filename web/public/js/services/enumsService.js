idpServices.factory('enums', [function () {
  function Enums() {
    this.byVal = function (e, val) {
      var retVal = null;
      $.each(e, function (iIndex, iValue) {
        if (iValue == val) retVal = iIndex;
      });
      return retVal;
    };

    this.parse = function (e, val) {
      var retVal = null;
      $.each(e, function (iIndex, iValue) {
        if (iValue == val) retVal = iValue;
      });
      return retVal;
    };

    this.instructions = {
      REQ_NETWORKID: 1, RES_NETWORKID: 101,
      REQ_PING: 2, RES_PING: 102
    };
  }
  return new Enums();
}]);