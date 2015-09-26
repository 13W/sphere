'use strict';

sphere.directive('s-bind', function () {
    return {
        link: function ($scope, element) {
            var key = element.getAttribute('s-bind') || element.getAttribute('s-model');

            $scope.$watch(key, function (value) {
                writeToInput(element, value);
            });
        }
    };
});
