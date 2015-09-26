'use strict';

sphere.directive('s-model', function () {
    return {
        link: function ($scope, element) {
            var $parser = sphere.get('$parser'),
                key = element.getAttribute('s-model'),
                event = element.getAttribute('s-event'),
                currentValue = $parser(key),
                elementValue = readFromInput(element);

            sphere.get('s-bind').link($scope, element);

            function eventListener(event) {
                event.preventDefault();
                var value = readFromInput(element);
                console.log('input change event', currentValue.getter($scope) + '=>' + value);
                if (value !== currentValue.getter($scope)) {
                    currentValue.setter($scope, value);
                }
                return false;
            }

            if (!currentValue.getter($scope) && elementValue) {
                currentValue.setter($scope, elementValue);
            }

            element.addEventListener(event || 'change', eventListener);
        }
    };
});
