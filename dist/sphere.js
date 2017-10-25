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
        if (typeof object !== 'object' || !object) {
            return;
        }

        let index = 0;
        for (const o in object) {
            const res = callback(object[o], o, index++);
            if (res === false) {
                return;
            }
        }
    }

    get$scope(id) {
        return this.get('$rootScope').$get(id);
    }
}

/*eslint no-unused-vars: 0*/
window.sphere = new Sphere();

'use strict';

(() => {
    const startPool = [];
    const scopes = {};
    let count = 0;
    let $$digest = 0;
    let $$digestPool = {};

    const once = (func) => {
        let called = false;
        return (...args) => {
            if (called) {
                return;
            }

            called = true;
            return func(...args);
        }
    };
    class Scope {
        constructor(id) {
            if (scopes[id]) {
                return scopes[id];
            }

            this.$destroyed = false;
            this.$$target = null;
            this.$$digest = false;
            this.$id = hex(count++);
            scopes[this.$id] = this;

            this.$$events = Object.defineProperty([], 'EventEmitter', {
                enumerable: false,
                configurable: false,
                writable: false,
                value: document.createElement('a')
            });

            this.$$watchers = [];
            this.$$children = [];
            this.$$observers = [];
            this.$parent = null;
            this.$root = this.this = this.$observe(this);
        }

        $get($id) {
            return scopes[$id];
        }

        $new(isolate) {
            const $scope = new Scope();
            if (!isolate) {
                $scope.$parent = this.this;
                Object.setPrototypeOf($scope, this);
            }
            $scope.$root = this.$root;
            this.$$children.push($scope.this);

            return $scope.this;
        }

        $destroy() {
            console.warn('$destroy', this.$id);
            this.$destroyed = true;
            delete scopes[this.$id];
            this.$emit('$destroy');
            const $parent = this.$parent;
            if (!parent) {
                return false;
            }

            const index = $parent.$$children.indexOf(this.this);
            $parent.$$children.splice(index, 1);
            this.$$children.forEach(($child) => $child.$destroy());
            this.$$events.forEach((_, index) => this.$off(0));

            this.$$watchers.forEach((revoke) => revoke());
        }

        $emit(task, ...args) {
            if (this.$$digest) {
                if (!$$digestPool[this.$$digest]) {
                    $$digestPool[this.$$digest] = {};
                }
                $$digestPool[this.$$digest][task] = new CustomEvent(task, {detail: args});
                return;
            }

            if (this.$destroyed && task !== '$destroy') {
                return false;
            }

            console.groupCollapsed(`$scope.${this.$id} -> $emit('${task}')`);
            args.forEach((arg) => console.log(arg));
            console.groupEnd();
            this.$$events.EventEmitter.dispatchEvent(new CustomEvent(task, {detail: args}));
        }

        $on(eventName, callback) {
            // console.log('subscribe!', eventName);
            let listener = ({detail: args}) => callback(...args);
            listener.eventName = eventName;
            this.$$events.EventEmitter.addEventListener(eventName, listener);
            const index = this.$$events.push(listener);
            return once(() => this.$off(index));
        }

        $once(message, callback) {
            // console.log('subscribe once!', message);
            const $off = this.$on(message, (...args) => {
                $off();
                callback(...args);
            });
        }

        $off(index = -1) {
            // console.log('unsubscribe!', index);
            if (index !== -1) {
                const listener = this.$$events[index];
                this.$$events.EventEmitter.removeEventListener(listener.eventName, listener);
                this.$$events.splice(index, 1);
            }
        }

        $watch(path, callback) {
            return this.$on(path, callback);
        }

        $eval(exp) {
            if (typeof exp === 'function') {
                return exp.call(this);
            }

            return new Function('scope', `try {with(scope) {return ${exp};}} catch(e) {console.error(e);}`)(this);
        }

        $observe(object, path = '', digest = false) {
            if (typeof object !== 'object' || !object || object.$$target) {
                return object;
            }

            if (!digest) {
                this.$$digest = $$digest++;
            }

            const getPath = (currentPath = '') => []
                .concat(path, currentPath)
                .filter((v) => typeof v === 'string' && v.length > 0)
                .join('.');

            const fireEvent = (path, newValue, oldValue, target, oldLength) => {
                if (Array.isArray(target)) {
                    self.$emit(getPath(), newValue, oldValue, target);
                    self.$emit(getPath('length'), target.length, oldLength, target);
                } else {
                    self.$emit(path, newValue, oldValue, target);
                }

                let fullPath = getPath(path);
                if (fullPath !== path) {
                    self.$emit(fullPath, newValue, oldValue, target);
                }
            };

            const self = this;
            const proxify = (object) => {
                if (typeof object !== 'object' ||
                    !object ||
                    (object instanceof Date) ||
                    (object instanceof RegExp) ||
                    (object instanceof Window)) {

                    return object;
                }

                const revocable = Proxy.revocable(object, {
                    get(target, key) {
                        if (key === '$$target') {
                            return target;
                        }

                        return target[key];
                    },
                    set(target, key, value) {
                        let oldLength;
                        const oldValue = target[key];

                        if (Array.isArray(target)) {
                            oldLength = target.length;
                        }

                        if (Array.isArray(target) && key === 'length') {
                            return true;
                        }

                        Object.defineProperty(target, key, {
                            enumerable: true,
                            writable: true,
                            configurable: true,
                            value
                        });
                        if (typeof key === 'symbol') {
                            return true;
                        }

                        if (!target[Symbol.unscopables]) {
                            target[Symbol.unscopables] = {};
                        }
                        target[Symbol.unscopables][key] = false;
                        if (!self.$destroyed && value !== oldValue) {
                            Object.defineProperty(target, key, {
                                enumerable: true,
                                writable: true,
                                configurable: true,
                                value: self.$observe(value, getPath(key), self.$$digest)
                            });
                            fireEvent(key, value, oldValue, target, oldLength);
                        }

                        return true;
                    },
                    deleteProperty(target, key) {
                        let oldLength;
                        if (Array.isArray(target)) {
                            oldLength = target.length;
                            target.splice(key, 1);
                        } else {
                            delete target[key];
                        }

                        if (!self.$destroyed) {
                            fireEvent(key, undefined, target[key], target, oldLength);
                        }

                        return true;
                    }
                });

                self.$$watchers.push(revocable.revoke);
                return revocable.proxy;
            };

            if (Array.isArray(object)) {
                object.forEach((value, index) => {
                    this.$observe(value, getPath(index), this.$$digest);
                    object[index] = proxify(value);
                });
            } else {
                Object.getOwnPropertyNames(object).forEach((key) => {
                    if (key[0] === '$' || key === 'this') {
                        return;
                    }

                    this.$observe(object[key], getPath(key), this.$$digest);
                    object[key] = proxify(object[key]);
                });
            }

            return (() => {
                object = proxify(object);
                let events = [];
                do {
                    if (!$$digestPool[this.$$digest]) {
                        break;
                    }
                    events = Object.values($$digestPool[this.$$digest]);
                    const event = events.shift();
                    this.$$events.EventEmitter.dispatchEvent(event);
                    delete $$digestPool[this.$$digest][event.type];
                } while (events.length);
                this.$$digest = false;
                return object;
            })();
        }
    }

    sphere.service('$rootScope', new Scope().this);
})();

'use strict';

(() => {
    const parsers = {};
    const search = (path, object, options) => {
        var key = '',
            i = 0,
            pathLength = path.length;

        options = options || {};
        if (object && object.hasOwnProperty(path)) {
            return {
                key: path,
                value: object[path],
                object: object,
                complete: true,
                incompletePath: ''
            }
        }

        do {
            const chr = path[i];
            if (chr === '.' || !chr) {
                if (options.create && !object[key]) {
                    if (i === pathLength && options.hasOwnProperty('default')) {
                        object[key] = options.default;
                    } else {
                        object[key] = {};
                    }
                }

                if (i === pathLength) {
                    break;
                }

                if (object === undefined) {
                    break;
                }

                if (key === '$') {
                    break;
                }

                object = object[key];
                key = '';
            } else {
                key += chr;
            }

            i += 1;
        } while (i <= pathLength);

        return {
            complete: i === pathLength,
            incompletePath: key === '$' ? path.substr(i + 1) : '',
            object: object,
            key: key,
            value: key === '$' ? object : object && object[key]
        };
    };

    class Parser {
        constructor(key) {
            if (parsers[key] instanceof Parser) {
                return parsers[key];
            }

            this.key = key;
            parsers[key] = this;
            this.getter = function noop () {};
            this.setter = function noop () {};
            this.compile();
        }

        static new(...args) {
            return new Parser(...args);
        }
        compile() {
            var getter = this.key.split('.').reduce(function (result, key) {
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
                return element.dataset ? sphere.get('$rootScope').$get(element.dataset.scope).this : null;
            }
        };
    }
};

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

'use strict';

sphere.directive('s-bind', function () {
    return {
        link: function ($scope, element) {
            var key = element.getAttribute('s-bind') || element.getAttribute('s-model');

            $scope.$watch(key, function (value) {
                writeToInput(element, value);
            });
        }
    };
});

'use strict';

sphere.directive('s-class', function () {
    return {
        link: function ($scope, element) {
            var sClass = element.getAttribute('s-class'),
                baseClasses = element.className;
            function updateClasses() {
                var classes = $scope.$eval(sClass),
                    result = baseClasses.split(' ');

                Object.getOwnPropertyNames(classes || {}).forEach(function (name) {
                    if (classes[name]) {
                        result.push(name);
                    }
                });

                element.className = result.join(' ');
            }

            $scope.$watch('$update', updateClasses);
        }
    };
});

'use strict';

function addEventDirective(name, callback) {
    sphere.directive('s-' + name, function () {
        return {
            link: function ($scope, element) {
                var action = element.getAttribute('s-' + name);
                element.addEventListener(name, function (event) {
                    event.preventDefault();
                    if (typeof callback === 'function') {
                        callback($scope, element, event);
                    } else {
                        $scope.$eval(action);
                    }
                    return false;
                });
            }
        };
    });
}

['submit', 'click', 'keypress', 'keyup', 'change'].forEach(function (action) {
    addEventDirective(action);
});

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
                // console.log('input change event', currentValue.getter($scope) + '=>' + value);
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

'use strict';

sphere.directive('s-repeat', () => ({
    link($scope, element) {
        if (element.className.indexOf('s-repeat-element') !== -1) {
            return;
        }

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

        function repeat() {
            if ($repeatScope) {
                for (let [scope, element] of scopeMap.entries()) {
                    if (scope.$destroyed) {
                        parentElement.removeChild(element);
                        scopeMap.delete(scope);
                    }
                }
            }

            let collection = $scope.$eval(collectionKey) || [],
                length = Object.keys(collection).length,
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
                    scopeMap.set(itemScope, dom);
                    dom.dataset.scope = itemScope.$id;
                    dom.classList.add('s-repeat-element');
                    DOMCompiler(dom, itemScope);
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

sphere.directive('#text', () => ({
    link($scope, element) {
        const originalValue = element.nodeValue,
            paths = {};
        let result;

        element.nodeValue = originalValue.replace(/\{\{([^\}]+)\}\}/g, function (o, path) {
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
}));
