'use strict';

function DOMCompiler(element, $scope) {
    const appElement = element || document.querySelector('[s-app]'),
        subTask = element !== document.querySelector('[s-app]') && !!$scope;

    if (!appElement) {
        throw new Error('Application is not declared.');
    }

    let currentNode;
    const ni = document.createNodeIterator(
            appElement,
            NodeFilter.SHOW_ALL,
            function () {
                return NodeFilter.FILTER_ACCEPT;
            },
            false
        );

    $scope = $scope || sphere.get('$rootScope').$new();

    while (ni.nextNode()) {
        currentNode = ni.referenceNode;
        if (!currentNode.dataset) {
            currentNode.dataset = {};
        }

        currentNode.dataset.scope = currentNode.parentNode && currentNode.parentNode.dataset && currentNode.parentNode.dataset.scope || $scope.$id;

        [].slice.call(currentNode.attributes || []).forEach(function (attribute) {
            if (attribute.name.substr(0, 2) !== 's-') {
                return;
            }

            if (attribute.name.toLowerCase() === 's-controller') {
                const controller = sphere.get(attribute.value);
                if (!controller) {
                    throw new Error('Controller "' + attribute.value + '" not found');
                }

                const scope = $scope.$get(currentNode.dataset.scope).$new();
                currentNode.dataset.scope = scope.$id;
                controller(scope);
            } else {
                const directive = sphere.get(attribute.name);
                if (directive) {
                    if (directive.scope) {
                        const scope = $scope.$get(currentNode.dataset.scope).$new();
                        currentNode.dataset.scope = scope.$id;
                    }

                    directive.link($scope.$get(currentNode.dataset.scope), currentNode);
                }
            }
        });

        const elementDirective = sphere.get(currentNode.nodeName.toLowerCase());
        if (elementDirective) {
            if (elementDirective.dataset && elementDirective.dataset.scope) {
                const scope = $scope.$get(currentNode.dataset.scope).$new();
                currentNode.dataset.scope = scope.$id;
            }
            elementDirective.link($scope.$get(currentNode.dataset.scope), currentNode);
        }
    }

    if (!subTask) {
        $scope.$root.$$loaded = true;
    }
}

sphere.service('$compile', DOMCompiler);
