'use strict';

function addEventDirective(name, callback) {
    sphere.directive('s-' + name, () => ({
        link($scope, element) {
            const action = element.getAttribute('s-' + name);

            element.addEventListener(name, (event) => {
                event.preventDefault();
                if (typeof callback === 'function') {
                    callback($scope, element, event);
                } else {
                    $scope.$eval(action);
                }
                return false;
            });
        }
    }));
}

['submit', 'click', 'keypress', 'keyup', 'change']
    .forEach((name) => addEventDirective(name));
