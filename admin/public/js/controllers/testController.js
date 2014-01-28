SettingsController.$inject = ['$scope', '$http', 'url'];
function SettingsController($scope, $http, url) {
  $scope.configure = function () {
    $http({method: 'POST', url: [url.api, 'configure'].join('')}).
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