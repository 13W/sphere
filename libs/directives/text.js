'use strict'

sphere.directive('#text', function () {
    return {
        link: function ($scope, element) {
            var originalValue = element.nodeValue,
                paths = {},
                result;
            originalValue.replace(/\{\{([^\}]+)\}\}/g, function (o, path) {
                result = $scope.$eval(path);
                if (paths[path]) {
                    return result === undefined ? '' : result;
                }

                $scope.$watch(path, function (nv, ov) {
                    if (nv !== ov) {
                        element.nodeValue = originalValue.replace(/\{\{([^\}]+)\}\}/g, function (o, path) {
                            var result = $scope.$eval(path);
                            return result === undefined ? '' : result;
                        });
                    }
                });

                return result === undefined ? '' : result;
            });
        }
    };
});
