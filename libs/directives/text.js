'use strict';

sphere.directive('#text', () => ({
    priority: 100,
    link($scope, element) {
        const originalValue = element.nodeValue,
            re = /{{([^}]+)}}/g;

        if (!originalValue.match(re)) {
            return;
        }

        $scope.$watch(('`' + originalValue + '`').replace(re, '${$1}'), (newValue) => {
            element.nodeValue = newValue;
        });
    }
}));
