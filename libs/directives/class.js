'use strict';

sphere.directive('s-class', function () {
    return {
        link: function ($scope, element) {
            var sClass = element.getAttribute('s-class'),
                baseClasses = element.className;
            function updateClasses() {
                var classes = $scope.$eval(sClass),
                    result = baseClasses.split(' ');

                Object.getOwnPropertyNames(classes || {}).forEach(function (name) {
                    if (classes[name]) {
                        result.push(name);
                    }
                });

                element.className = result.join(' ');
            }

            $scope.$watch('$update', updateClasses);
        }
    };
});
