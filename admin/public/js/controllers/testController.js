TestController.$inject = ['$scope', '$http', 'url'];
function TestController($scope, $http, url) {
  $scope.configServerUrl = 'http://192.168.1.4:9100';
  $scope.broadcastInstruction = 1;
  $scope.broadcastData = '123';
  $scope.init = function(){
    $scope.refreshNodes();
  };
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
  $scope.refreshNodes = function () {
    $http({method: 'GET', url: url.api+'nodes'}).
      success(function (data, status) {
        $scope.nodes = [];
        $.each(data, function(i, val){
          $scope.nodes.push(val);
        });
      }).
      error(function (data, status) {

      });
  };
  $scope.selectNode = function(node){
    $scope.activeNode = node;
  };
  $scope.ping = function(node){
    var httpData = {id: node && node.id || null};
    $http({method: 'POST', url: url.api+'ping', data: httpData}).
      success(function (data, status) {

      }).
      error(function (data, status) {

      });
  };
}