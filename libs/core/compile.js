'use strict';

function DOMCompiler(element, $scope) {
    var appElement = element || document.querySelector('[s-app]'),
        subTask = element !== document.querySelector('[s-app]') && !!$scope;

    if (!appElement) {
        throw new Error('Application is not declared.');
    }

    var currentNode,
        ni = document.createNodeIterator(
            appElement,
            NodeFilter.SHOW_ALL,
            function () {
                return NodeFilter.FILTER_ACCEPT;
            },
            false
        );

    $scope = $scope || Scope();
    sphere.service('$rootScope', $scope.$root);

    while (ni.nextNode()) {
        currentNode = ni.referenceNode;
        currentNode.scope = currentNode.parentNode && currentNode.parentNode.scope || $scope;

        [].slice.call(currentNode.attributes || []).forEach(function (attribute) {
            if (attribute.name.substr(0, 2) !== 's-') {
                return;
            }
            if (attribute.name.toLowerCase() === 's-controller') {
                var controller = sphere.get(attribute.value);
                if (!controller) {
                    throw new Error('Controller "' + attribute.value + '" not found');
                }
                currentNode.scope = currentNode.scope.$new();
                controller(currentNode.scope);
            } else {
                var directive = sphere.get(attribute.name);
                if (directive) {
                    if (directive.scope) {
                        currentNode.scope = currentNode.scope.$new();
                    }

                    directive.link(currentNode.scope, currentNode);
                }
            }
        });

        var elementDirective = sphere.get(currentNode.nodeName.toLowerCase());
        if (elementDirective) {
            if (elementDirective.scope) {
                currentNode.scope = currentNode.scope.$new();
            }
            elementDirective.link(currentNode.scope, currentNode);
        }
    }
    if (!subTask) {
        $scope.$root.$$loaded = true;
    }
}

sphere.service('$compile', DOMCompiler);
sphere.service('$parser', Parser);
