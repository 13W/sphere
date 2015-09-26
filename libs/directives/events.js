'use strict';

function addEventDirective(name, callback) {
    sphere.directive('s-' + name, function () {
        return {
            link: function ($scope, element) {
                var action = element.getAttribute('s-' + name);
                element.addEventListener(name, function (event) {
                    event.preventDefault();
                    if (typeof callback === 'function') {
                        callback($scope, element, event);
                    } else {
                        $scope.$eval(action);
                    }
                    return false;
                });
            }
        };
    });
}

['submit', 'click', 'keypress', 'keyup', 'change'].forEach(function (action) {
    addEventDirective(action);
});
