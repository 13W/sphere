'use strict'

sphere.directive('s-class', function () {
    return {
        link: function ($scope, element) {
            var sClass = element.getAttribute('s-class'),
                baseClasses = element.className;
            function updateClasses() {
                var classes = $scope.$eval(sClass),
                    result = baseClasses;

                Object.getOwnPropertyNames(classes || {}).forEach(function (name) {
                    if (classes[name]) {
                        result += name;
                    }
                });

                element.className = result;
            }

            $scope.$watch('$update', updateClasses);
        }
    };
});
