'use strict';

window.angular = {
    element: function (element) {
        return {
            scope: function () {
                return element.scope;
            }
        };
    }
};
