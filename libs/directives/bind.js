'use strict';

sphere.directive('s-bind', () => ({
  priority: 60,
  link($scope, element) {
    const key = element.getAttribute('s-bind') || element.getAttribute('s-model');

    $scope.$watch(key, function (value) {
      writeToInput(element, value);
    });
  }
}));
