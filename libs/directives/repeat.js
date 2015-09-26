'use strict'

sphere.directive('s-repeat', function () {
    return {
        link: function ($scope, element) {
            if (element.className.indexOf('s-repeat-element') !== -1) {
                return;
            }
            var repeatStr = element.getAttribute('s-repeat'),
                parsed = /\s*(?:\(\s*(\w+)\s*,\s*(\w+)\s*\)|\s*(\w+)\s*)\s*in\s*(\w+)\s*/g.exec(repeatStr) || {},
                entryKey = parsed[1] || parsed[3],
                entryIndex = parsed[2],
                collectionKey = parsed[4],
                parentElement = element.parentNode,
                $repeatScope = $scope.$new(),
                original = element.cloneNode(true),
                comment = document.createComment(original.outerHTML);

            parentElement.replaceChild(comment, element);

            if (!collectionKey) {
                return;
            }

            function repeat() {
                'use strict';
                if ($repeatScope) {
                    var children = parentElement.querySelectorAll('.s-repeat-element');
                    [].slice.apply(children).forEach(function (child) {
                        child.scope.$destroy();
                        parentElement.removeChild(child);
                    });
                    $repeatScope.$destroy();
                }

                var collection = $scope.$eval(collectionKey) || [],
                    length = Object.keys(collection).length,
                    lastElement = comment;

                $repeatScope = $scope.$new();

                Object.keys(collection).forEach(function (key, index) {
                    var last = index === (length - 1),
                        scope = $repeatScope.$new(),
                        dom = original.cloneNode(true);
                    dom.className += ' s-repeat-element';

                    scope[entryKey] = collection[key];
                    scope.$index = index;
                    scope.$last = last;

                    if (entryIndex) {
                        scope[entryIndex] = key;
                    }

                    DOMCompiler(dom, scope);
                    parentElement.insertBefore(dom, lastElement.nextSibling);
                    lastElement = dom;
                });

            }

            $scope.$watch(collectionKey, repeat);
        }
    };
});
