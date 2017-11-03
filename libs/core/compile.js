'use strict';

(() => {
    const scopes = new Map();
    const $rootScope = sphere.get('$rootScope');

    const findScope = (dom, $scope) => {
        $scope = $scope || $rootScope;
        do {
            const scope = scopes.get(dom);
            if (scope) {
                return scope;
            }
            dom = dom.parentNode;
        } while (dom);

        return $scope;
    };

    const mapScope = (dom, $scope) => scopes.set(dom, $scope);

    const $compile = (dom, $scope, queue = []) => {
        $scope = $scope || $rootScope;

        do {
            const name = dom.nodeName.toLowerCase();
            const attributes = dom.attributes;
            const directive = sphere.get(name);
            let skipChild = false;
            if (directive) {
                queue.push({
                    dom,
                    directive
                });
                skipChild = true;
            }

            sphere.forEach(attributes, (attribute) => {
                const key = attribute.name.replace(/^data-/, '');
                const directive = sphere.get(key);
                if (directive) {
                    queue.push({
                        dom,
                        directive
                    });
                    skipChild = true;
                }
            });

            if (!skipChild && dom.children.length > 0) {
                $compile(dom.firstChild, $scope, queue);
            }

            dom = dom.nextSibling;
        } while (dom);

        queue.sort((prev, next) => {
            const pp = prev.directive.priority || 1000,
                np = next.directive.priority || 1000;

            return pp < np ? -1 : pp > np ? 1 : 0;
        });

        for (let {dom, directive} of queue.splice(0)) {
            const {attributes} = dom;

            if (directive.scope) {
                if (scopes.has(dom)) {
                    $scope = scopes.get(dom);
                } else {
                    $scope = findScope(dom, $scope);
                    $scope = $scope.$new(directive.scope);
                    scopes(dom, $scope);
                }

                if (typeof directive.scope === 'object') {
                    // Object.assign($scope, directive.scope);
                }
            }

            if (typeof directive.compile === 'function') {
                directive.compile($scope, dom, attributes);
            }

            if (typeof directive.controller === 'function') {
                $scope = $scope.$new();
                scopes.set(dom, $scope);
                directive.controller($scope, dom, attributes);
            }

            if (directive.template) {
                dom = $compile(directive.template, $scope);
            }

            if (typeof directive.link === 'function') {
                directive.link($scope, dom, attributes);
            }

            if (!directive.replace && !directive.template && dom.firstChild) {
                $compile(dom.firstChild, $scope);
            }
        }
    };

    $compile.findScope = findScope;
    $compile.mapScope = mapScope;

    sphere.service('$compile', $compile);
})();

// function DOMCompiler(element, $scope) {
//     const appElement = element || document.querySelector('[s-app]'),
//         subTask = element !== document.querySelector('[s-app]') && !!$scope;
//
//     if (!appElement) {
//         throw new Error('Application is not declared.');
//     }
//
//     let currentNode;
//     const ni = document.createNodeIterator(
//             appElement,
//             NodeFilter.SHOW_ALL,
//             function () {
//                 return NodeFilter.FILTER_ACCEPT;
//             },
//             false
//         );
//
//     $scope = $scope || sphere.get('$rootScope').$new();
//
//     while (ni.nextNode()) {
//         currentNode = ni.referenceNode;
//         if (!currentNode.dataset) {
//             currentNode.dataset = {};
//         }
//
//         currentNode.dataset.scope = currentNode.parentNode &&
//             currentNode.parentNode.dataset && currentNode.parentNode.dataset.scope || $scope.$id;
//
//         [].slice.call(currentNode.attributes || []).forEach(function (attribute) {
//             if (attribute.name.substr(0, 2) !== 's-') {
//                 return;
//             }
//
//             if (attribute.name.toLowerCase() === 's-controller') {
//                 const controller = sphere.get(attribute.value);
//                 if (!controller) {
//                     throw new Error('Controller "' + attribute.value + '" not found');
//                 }
//
//                 const scope = $scope.$root.$get(currentNode.dataset.scope).$new();
//                 currentNode.dataset.scope = scope.$id;
//                 controller(scope);
//             } else {
//                 const directive = sphere.get(attribute.name);
//                 if (directive) {
//                     if (directive.scope) {
//                         const scope = $scope.$root.$get(currentNode.dataset.scope).$new();
//                         currentNode.dataset.scope = scope.$id;
//                     }
//
//                     directive.link($scope.$root.$get(currentNode.dataset.scope), currentNode);
//                 }
//             }
//         });
//
//         const elementDirective = sphere.get(currentNode.nodeName.toLowerCase());
//         if (elementDirective) {
//             if (elementDirective.dataset && elementDirective.dataset.scope) {
//                 const scope = $scope.$root.$get(currentNode.dataset.scope).$new();
//                 currentNode.dataset.scope = scope.$id;
//             }
//             elementDirective.link($scope.$root.$get(currentNode.dataset.scope), currentNode);
//         }
//     }
//
//     if (!subTask) {
//         $scope.$root.$$loaded = true;
//     }
// }
//
// sphere.service('$compile', DOMCompiler);
