LayoutController.$inject = ['$scope', '$rootScope', '$location'];
function LayoutController($scope, $rootScope, $location){
  $rootScope.$on('display.mode', function(event, val){
    $scope.displayMode = val;
  });
  console.log($location.absUrl());
  console.log($location.hash());
  console.log($location.path());
  console.log($location.url());
}