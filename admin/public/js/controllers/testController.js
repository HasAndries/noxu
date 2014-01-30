TestController.$inject = ['$scope', '$http', 'url'];
function TestController($scope, $http, url) {
  $scope.configServerUrl = 'http://10.0.0.236:9100';
  $scope.broadcastInstruction = 1;
  $scope.broadcastData = '123';
  $scope.configure = function () {
    var fullUrl = [url.api, 'configure'].join('');
    var httpData = {
      serverUrl: $scope.configServerUrl
    }
    $http({method: 'POST', url: fullUrl, data: JSON.stringify(httpData)}).
      success(function (data, status) {

      }).
      error(function (data, status) {

      });
  };
  $scope.broadcast = function () {
    var fullUrl = [url.api, 'broadcast'].join('');
    var httpData = {instruction:  $scope.broadcastInstruction, data:  $scope.broadcastData};
    $http({method: 'POST', url: fullUrl, data: httpData}).
      success(function (data, status) {

      }).
      error(function (data, status) {

      });
  };
  $scope.getNodes = function () {
    $http({method: 'GET', url: [url.api, 'nodes'].join('')}).
      success(function (data, status) {

      }).
      error(function (data, status) {

      });
  };
}