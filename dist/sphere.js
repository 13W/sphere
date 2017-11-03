'use strict';

/*eslint no-unused-vars: 0*/

function hex(int) {
    int = int.toString(16);
    return int.length % 2 ? int : '0' + int;
}

function isServiceName(name) {
    var startsWith = String(name).substr(0, 1);
    return startsWith === '$' || startsWith === '_';
}

function fire($events, name) {
    // console.warn('Fire: ', name);
    var args = [].slice.call(arguments, 2),
        events = $events[name],
        updateEvents = $events.$update || [];

    if (!Array.isArray(events)) {
        return;
    }

    [].concat(events, updateEvents).forEach(function (watcher) {
        setTimeout(function () {
            watcher.apply(null, args);
        }, 0);
    });
}

function writeToInput(element, value) {
    var date;
    if (value === undefined) {
        value = '';
    }

    if (element.nodeName === 'INPUT') {
        if (element.type === 'checkbox') {
            element.checked = !!value;
        } else if (element.type === 'radio') {
            element.checked = element.value === value;
        } else if (element.type === 'date') {
            date = value instanceof Date ? value : new Date(value);
            element.value = date.toISOString().split('T')[0];
        } else if (element.type === 'datetime-local') {
            date = value instanceof Date ? value : new Date(value);
            element.value = date.toISOString();
        } else {
            element.value = value;
        }
    } else if (element.nodeName === 'SELECT') {
        element.value = value;
    } else if (element.nodeName === 'TEXTAREA') {
        element.value = value;
    } else {
        element.innerText = value;
    }
}

function readFromInput(element) {
    var result;
    if (element.nodeName === 'INPUT') {
        if (element.type === 'checkbox') {
            result = element.checked;
        } else if (element.type === 'radio') {
            result = element.value;
        } else if (element.type === 'date') {
            result = new Date(element.value);
        } else if (element.type === 'datetime-local') {
            result = new Date(element.value);
        } else {
            result = element.value;
        }
    } else if (element.nodeName === 'SELECT') {
        result = element.value;
    } else if (element.nodeName === 'TEXTAREA') {
        result = element.value;
    }
    return result;
}

'use strict';

class Sphere {
    constructor() {
        this.collections = {};
    }
    directive(name, directive) {
        this.collections[name] = directive();
        return this;
    }

    controller(name, controller) {
        this.collections[name] = controller;
        return this;
    }

    service(name, service) {
        this.collections[name] = service;
        return this;
    }

    get(name) {
        return this.collections[name];
    }

    forEach(object, callback) {
        if (!object) {
            return;
        }

        let collection;
        if (Array.isArray(object)) {
            collection = object.entries();
        } else if (typeof object === 'object') {
            collection = Object.entries(object || {});
        } else if (typeof object[Symbol.iterator] === 'function') {
            collection = object;
        } else {
            return;
        }

        let index = 0;
        for (const [key, value] of collection) {
            const res = callback(value, key, index++);
            if (res === false) {
                return;
            }
        }
    }

    divide(object, divider, pushKey) {
        const trues = [], fails = [];
        this.forEach(object, (item, key) => {
            key = pushKey ? key : item;
            if (divider(item)) {
                trues.push(key);
            } else {
                fails.push(key);
            }
        });

        return [trues, fails];
    }

    get$scope(id) {
        return this.get('$rootScope').$get(id);
    }
}

/*eslint no-unused-vars: 0*/
window.sphere = new Sphere();

'use strict';

(() => {
    const scopes = new Map();
    const scope = (target = {}) => {
        const EMITTER = Symbol('Emitter'),
            COLLECT = Symbol('Collect'),
            TARGET = Symbol('Target'),
            REVOKE = Symbol('Revoke'),
            PROXY = Symbol('Proxy');

        let counter = 0;
        let eventsHolderId = 0;

        const baseArrayFuncs = new Map();
        const baseObjectFuncs = new Map();

        const mapProtoFuncs = (object, map) => {
            Object.getOwnPropertyNames(Object.getPrototypeOf(object))
                .forEach((key) => map.set(object[key], true));
        };

        mapProtoFuncs({}, baseObjectFuncs);
        mapProtoFuncs([], baseArrayFuncs);

        const getEventHolderId = () => eventsHolderId++;
        const getNextId = () => ('0'.repeat(5) + (counter++).toString(16)).substr(-5);

        const isFunction = (value) => typeof value === 'function';
        const isSymbol = (value) => typeof value === 'symbol';
        const isString = (value) => typeof value === 'string';
        const isObject = (value) => String(value) === '[object Object]';
        const isArray = (value) => Array.isArray(value);

        const getKey = (...path) => []
            .concat(...path)
            .filter(Boolean)
            .filter((key) => !isSymbol(key))
            .join('.');

        const EventEmitter = (ee) => ({
            $emit(name, ...args) {
                if (!ee.events) {
                    ee.events = {};
                }

                if (!ee.nextHolder) {
                    ee.nextHolder = getEventHolderId();
                    const holder = ee.events[ee.nextHolder] = ee.events[ee.nextHolder] || new Map();
                    holder.set(name, args);
                    setTimeout(() => {
                        delete ee.events[ee.nextHolder];
                        ee.nextHolder = null;
                        holder.forEach((args, eventName) => ee.dispatchEvent(
                            new CustomEvent(eventName, {detail: args})
                        ));
                        holder.clear();
                    });
                } else {
                    ee.events[ee.nextHolder].set(name, args);
                }
            }
        });

        const Observer = (target = {}, parentKey = '', self) => Proxy.revocable(target, Object.assign({...Reflect,
            get(target, key) {
                if (key === PROXY) {
                    return true;
                }

                if (key === TARGET) {
                    return target;
                }

                const value = target[key];

                if (COLLECT in self && isString(key) && key[0] !== '$') {
                    EventEmitter(self[COLLECT]).$emit('get', key, value, target);
                }

                if ((isObject(value) || isFunction(value) || isArray(value)) && !value[PROXY]) {
                    if (isFunction(target) && key === 'prototype') {
                        return value;
                    }

                    if (self.$observer.has(value)) {
                        return self.$observer.get(value).proxy;
                    }
                    const observer = Observer(value, getKey(parentKey, key), self);
                    self.$observer.set(value, observer);
                    return observer.proxy;
                }

                return value;
            },
            set(target, key, value) {
                const oldValue = target[key];
                const isArrayLength = key === 'length' && isArray(target);
                const oldLength =  isArrayLength ? target.length : 0;

                target[key] = value;

                if (!parentKey && Symbol.unscopables in self) {
                    self[Symbol.unscopables][key] = false;
                }

                if (self.$observer.has(oldValue) && self.$destroyed) {
                    self.$observer.get(oldValue).revoke();
                }

                if (isString(key) && key[0] !== '$') {
                    if (EMITTER in self) {
                        const $emitter = EventEmitter(self[EMITTER]);
                        $emitter.$emit(getKey(parentKey, key), oldValue, value, target);

                        if (isArrayLength) {
                            $emitter.$emit(parentKey, oldLength, target.length, target);
                        }
                    }
                }

                return true;
            },
            has(target, key) {
                if (key === TARGET) {
                    return true;
                }

                if (isSymbol(key)) {
                    return key in self[TARGET];
                }

                return true;
            },
            apply(func, scope, args) {
                if ([].indexOf === func) {
                    scope = scope.map((el) => TARGET in el ? el[TARGET] : el);
                    args = args.map((el) => TARGET in el ? el[TARGET] : el);
                }

                return func.call(scope, ...args);
            }
        }));

        const PereScope = () => ({
            toString() {
                return String(this[TARGET]);
            },
            valueOf() {
                return this[TARGET];
            },
            toJSON() {
                return this[TARGET];
            }
        });

        const Scope = (target = {}) => ({
            [TARGET]: target,
            [REVOKE]: () => {},
            [EMITTER]: document.createElement('a'),
            [Symbol.unscopables]: {},

            $id: getNextId(),
            $destroyed: false,
            $children: [],
            $watchers: {},
            $listener: new Map(),
            $observer: new Map(),
            $parent: null,
            $root: null,
            $events: {},
            $get: ($id) => scopes.get($id),

            $new(isolated) {
                const scope = Scope();
                // console.debug(`Creating new Scope ${this.$id} -> ${scope.$id}`, scope);
                const perescope = PereScope();
                const observer = Observer(scope[TARGET], undefined, scope);

                scope[REVOKE] = observer.revoke;

                if (!isolated) {
                    scope.$parent = this;
                    this.$children.push(scope);
                    Object.setPrototypeOf(scope[TARGET], this[TARGET]);
                }

                scope.$root = this.$root;
                if (!this.$root) {
                    scope.$root = this.$root = this;
                }

                Object.setPrototypeOf(perescope, observer.proxy);
                Object.setPrototypeOf(scope, perescope);

                scopes.set(scope.$id, scope);
                return scope;
            },

            $destroy() {
                if (this.$destroyed) {
                    return;
                }

                this.$emit('$destroy');
                this.$children.forEach((child) => child.$destroy());

                Object.keys(this.$watchers).forEach((expression) => {
                    this.$watchers[expression].splice(0).forEach((unwatch) => unwatch());
                    delete this.$watchers[expression];
                });

                this.$listener.forEach((stopListening) => stopListening());

                if (this.$parent) {
                    const index = this.$parent.$children.indexOf(this);
                    if (index === -1) {
                        return;
                        // throw new Error('Something went wrong, $scope already detached!');
                    }
                    Object.setPrototypeOf(this[TARGET], null);
                    this.$parent.$children.splice(index, 1);
                    this.$parent = null;
                }

                this.$root = null;
                this.$destroyed = true;
                this[REVOKE]();
                Object.setPrototypeOf(Object.getPrototypeOf(this), this[TARGET]);
                Object.freeze(this);
            },

            $emit(eventName, ...args) {
                EventEmitter(this[EMITTER]).$emit(eventName, ...args);
            },

            $on(eventName, lnr) {
                const listener = ({detail: args} = {detail: []}) => {
                    // console.log(`$scope.${this.$id}:$on:${eventName}`, ...args);
                    lnr(...args);
                };

                this[EMITTER].addEventListener(eventName, listener);

                let removed = false;
                const stopListening = () => {
                    if (removed) {
                        return;
                    }
                    removed = true;

                    this[EMITTER].removeEventListener(eventName, listener);
                    this.$listener.delete(listener);
                };

                this.$listener.set(listener, stopListening);
                return stopListening;
            },

            $once(eventName, lnr) {
                const stopListening = this.$on(eventName, (...args) => {
                    stopListening();
                    lnr(...args);
                });
            },

            $eval(expression, scope) {
                scope = scope || this;
                if (isFunction(expression)) {
                    return expression.call(scope);
                }

                return new Function('scope', `try{with(scope){return ${expression};}}catch(e){}`)(scope);
            },

            $watch(expression, listener) {
                this.$watchers[expression] = [];
                const keys = {};
                const scope = {
                    $id: this.$id,
                    $destroyed: false,
                    $observer: new Map(),
                    [COLLECT]: document.createElement('a'),
                    [TARGET]: this[TARGET],
                    [Symbol.unscopables]: this[Symbol.unscopables]
                };

                let oldValue;
                const keyWatcher = ({detail: [key]}) => {
                    if (this.$destroyed) {
                        scope.$destroy();
                    }

                    if (scope.$destroyed) {
                        return;
                    }

                    if (!(key in keys)) {
                        keys[key] = true;
                        const listener = () => {
                            let newValue = this.$eval(expression, scope);
                            this.$emit(`$watch:${expression}`, newValue, oldValue, scope);
                            oldValue = newValue;
                        };

                        const stopListening = this.$on(key, listener);
                        this.$watchers[expression].push(stopListening);
                    }
                };

                const pereScope = PereScope();
                const observer = Observer(scope[TARGET], undefined, scope);
                scope[COLLECT].addEventListener('get', keyWatcher);
                Object.setPrototypeOf(pereScope, observer.proxy);
                Object.setPrototypeOf(scope, pereScope);
                const newValue = this.$eval(expression, scope);
                const stopListening = this.$on(`$watch:${expression}`, listener);
                this.$emit(`$watch:${expression}`, newValue, undefined, this);

                scope.$destroy = () => {
                    scope.$destroyed = true;
                    stopListening();
                    scope[COLLECT].removeEventListener('get', keyWatcher);

                    if (!this.$destroyed) {
                        this.$watchers[expression].forEach((unwatch) => unwatch());
                        this.$observer.forEach((observer) => observer.revoke());
                        this.$observer.clear();
                    }

                    observer.revoke();
                    scope[COLLECT].remove();
                    delete scope[COLLECT];
                };

                return scope.$destroy;
            }
        });

        return Scope(target).$new();
    };

    sphere.service('$rootScope', scope().$root);
})();

'use strict';

(() => {
    const parsers = {};

    class Parser {
        constructor(key) {
            this.key = key;
            parsers[key] = this;
            this.getter = function noop () {};
            this.setter = function noop () {};
            this.compile();
        }

        static new(key) {
            if (parsers[key]) {
                return parsers[key];
            }

            return new Parser(key);
        }

        compile() {
            const getter = this.key.split('.').reduce(function (result, key) {
                    return result + ' && (scope = scope["' + key + '"])';
                }, 'scope'),
                keys = this.key.split('.'),
                lastKey = keys.pop(),
                setter = keys.reduce(function (result, key) {
                    return result + ' || {}) && (scope = scope["' + key + '"] = scope["' + key + '"]';
                }, '(scope = scope') + ' || {}) && (scope["' + lastKey + '"] = value)';

            this.getter = new Function('scope', 'return (' + getter + '), scope;');
            this.setter = new Function('scope', 'value', setter);
            return this;
        }
    }

    sphere.service('$parser', Parser.new);
})();

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

'use strict';

sphere.directive('s-bind', () => ({
    priority: 60,
    link($scope, element) {
        const key = element.getAttribute('s-bind') || element.getAttribute('s-model');

        $scope.$watch(key, function (value) {
            writeToInput(element, value);
        });
    }
}));

'use strict';

sphere.directive('s-class', () => ({
    link($scope, element) {
        const sClass = element.getAttribute('s-class');
        if (!sClass) {
            return;
        }

        let oldClasses;
        $scope.$watch(sClass, (newClasses) => {
            // console.info(`change class $scope:${$scope.$id}(${sClass})`, newClasses);
            if (newClasses === oldClasses) {
                return;
            }
            oldClasses = newClasses;
            const [add, remove] = sphere.divide(newClasses, Boolean, true);
            element.classList.add(...add);
            element.classList.remove(...remove);
        });
    }
}));

/**
 * Created by Vladimir <zero@13w.me> on 02.11.17.
 */

sphere.directive('s-controller', () => ({
    priority: 50,
    controller($scope, dom, attributes) {
        const controllerName = attributes['s-controller'].value;
        const controller = sphere.get(controllerName);
        if (!controller) {
            throw new Error(`Controller ${controllerName} not found.`);
        }
        controller($scope);
    }
}));

'use strict';

function addEventDirective(name, callback) {
    sphere.directive('s-' + name, () => ({
        link($scope, element) {
            const action = element.getAttribute('s-' + name);

            element.addEventListener(name, (event) => {
                event.preventDefault();
                if (typeof callback === 'function') {
                    callback($scope, element, event);
                } else {
                    $scope.$eval(action);
                }
                return false;
            });
        }
    }));
}

['submit', 'click', 'keypress', 'keyup', 'change']
    .forEach((name) => addEventDirective(name));

'use strict';

sphere.directive('s-model', () => ({
    priority: 60,
    link($scope, element) {
        const $parser = sphere.get('$parser'),
            key = element.getAttribute('s-model'),
            event = element.getAttribute('s-event'),
            currentValue = $parser(key),
            elementValue = readFromInput(element);

        sphere.get('s-bind').link($scope, element);

        const eventListener = (event) => {
            event.preventDefault();
            const value = readFromInput(element);
            // console.log('input change event', currentValue.getter($scope) + '=>' + value);
            if (value !== currentValue.getter($scope)) {
                currentValue.setter($scope, value);
            }
            return false;
        };

        if (!currentValue.getter($scope) && elementValue) {
            currentValue.setter($scope, elementValue);
        }

        element.addEventListener(event || 'change', eventListener);
    }
}));

'use strict';

sphere.directive('s-repeat', () => ({
    priority: 100,
    replace: true,
    link($scope, element) {
        if (element.className.indexOf('s-repeat-element') !== -1) {
            return;
        }

        const $compile = sphere.get('$compile');
        const repeatStr = element.getAttribute('s-repeat'),
            parsed = /\s*(?:\(\s*(\w+)\s*,\s*(\w+)\s*\)|\s*(\w+)\s*)\s*in\s*(\w+)\s*/g.exec(repeatStr) || {},
            entryKey = parsed[1] || parsed[3],
            entryIndex = parsed[2],
            collectionKey = parsed[4],
            parentElement = element.parentNode,
            original = element.cloneNode(true),
            comment = document.createComment(original.outerHTML);

        let $repeatScope = $scope.$new();

        parentElement.replaceChild(comment, element);

        if (!collectionKey) {
            return;
        }

        const scopeMap = new Map();
        const itemsMap = new Map();

        function repeat(collection) {
            if (!collection) {
                return;
            }

            if ($repeatScope) {
                for (let [scope, element] of scopeMap.entries()) {
                    if (scope.$destroyed) {
                        parentElement.removeChild(element);
                        scopeMap.delete(scope);
                    }
                }
            }

            let length = Object.keys(collection).length,
                lastElement = comment;

            const aliveScopes = {};
            sphere.forEach(collection, (item, key, index) => {
                let itemScope = itemsMap.get(item);
                if (itemScope && itemScope.$destroyed) {
                    itemsMap.delete(item);
                    itemScope = null;
                }

                if (!itemScope) {
                    itemScope = $repeatScope.$new();
                    itemScope[entryKey] = item;
                    itemsMap.set(item, itemScope);
                    itemScope.$once('$destroy', () => itemsMap.delete(item));
                }

                if (entryIndex) {
                    itemScope[entryIndex] = key;
                }
                itemScope.$index = index;
                itemScope.$last = index === (length - 1);

                if (!scopeMap.has(itemScope)) {
                    const dom = original.cloneNode(true);
                    $compile.mapScope(dom, itemScope);
                    scopeMap.set(itemScope, dom);
                    dom.dataset.scope = itemScope.$id;
                    dom.classList.add('s-repeat-element');
                    $compile(dom, itemScope);
                    parentElement.insertBefore(dom, lastElement.nextSibling);
                }

                aliveScopes[itemScope.$id] = true;
                lastElement = scopeMap.get(itemScope);
            });

            scopeMap.forEach((dom, scope) => {
                const $id = scope.$id;
                if (!aliveScopes[$id]) {
                    dom.remove();
                    scope.$destroy();
                    scopeMap.delete(scope);
                }

                delete aliveScopes[$id];
            });
        }

        $scope.$watch(collectionKey, repeat);
    }
}));

'use strict';

sphere.directive('s-style', () => ({
    link($scope, element) {}
}));

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
