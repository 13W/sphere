'use strict';

window.angular = {
    element: function (element) {
        return {
            scope: function () {
                return element.dataset ? sphere.get('$rootScope').$get(element.dataset.scope) : null;
            }
        };
    }
};
