'use strict';

window.angular = {
    element: function (element) {
        return {
            scope: function () {
                return sphere.get('$compile').findScope(element);
            }
        };
    }
};
