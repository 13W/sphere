'use strict';
function hex(int) {
    int = int.toString(16);
    return int.length % 2 ? int : '0' + int;
}

function isServiceName(name) {
    var startsWith = String(name).substr(0, 1);
    return startsWith === '$' || startsWith === '_';
}

function fire($events, name) {
    console.warn('Fire: ', name);
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

'use strict'

function Sphere() {
    if (!(this instanceof Sphere)) {
        return new Sphere();
    }
}

Sphere.prototype.collections = {};

Sphere.prototype.init = function () {};

Sphere.prototype.directive = function (name, directive) {
    this.collections[name] = directive();
    return this;
};

Sphere.prototype.controller = function (name, controller) {
    this.collections[name] = controller;
    return this;
};

Sphere.prototype.service = function (name, service) {
    this.collections[name] = service;
    return this;
};

Sphere.prototype.get = function (name) {
    return this.collections[name];
};

var sphere = Sphere();

'use strict';

function Scope() {
    if (!(this instanceof Scope)) {
        return new Scope();
    }
    this.$id = hex(this.count++);
    this.$$events = {};
    this.$$watchers = [];
    this.$$children = [];
    this.$$observers = [];
    this.$parent = null;
    this.$root = this;
    this.$observe(this);
}

Scope.prototype.count = 0;
Scope.prototype.$new = function (isolate) {
    var $scope = Scope();
    $scope.$parent = this;
    $scope.$root = this.$root;
    if (!isolate) {
        Object.setPrototypeOf($scope, this);
    }
    this.$$children.push($scope);
    return $scope;
};

Scope.prototype.$destroy = function () {
    fire(this.$$events, '$destroy');
    var self = this;
    this.$parent.$$children.splice(this.$parent.$$children.indexOf(this), 1);

    this.$$observers.forEach(function (entry) {
        entry.observer.unobserve(self, entry.func);
    });

    this.$$children.forEach(function ($childScope) {
        $childScope.$destroy();
    });
};

Scope.prototype.$observe = function (object, path) {
    if (!object || typeof object !== 'object') {
        return;
    }
    //noinspection JSCheckFunctionSignatures
    var self = this;

    function getPath(changePath) {
        return (path ? path + '.' : '') + changePath;
    }

    function observeEvent(changes) {
        changes.forEach(function (change) {
            var name = change.name || change.index,
                type = change.type,
                value = change.addedCount ? change.object.slice(change.index, change.addedCount) : change.object[name],
                oldValue = change.oldValue,
                fireEventPath = getPath(name);

            if (!isServiceName(name)) {
                if (type === 'splice' && change.addedCount) {
                    fireEventPath = path;
                    self.$observe(value, path);
                } else if (type === 'splice' && !change.addedCount) {
                    fireEventPath = path;
                } else if (type === 'add' || value !== oldValue) {
                    self.$observe(value, getPath(name));
                }
            }

            if (self.$root.$$loaded) {
                fire(self.$$events, fireEventPath, value, oldValue, object);
            }
        });
    }

    var observer = Array.isArray(object) ? Array : Object,
        observeFunction = observeEvent;

    this.$$observers.push({observer: observer, func: observeFunction});
    observer.observe(object, observeFunction);

    Object.getOwnPropertyNames(object).forEach(function (key) {
        if (isServiceName(key)) {
            return;
        }
        var keyPath = getPath(key);
        self.$observe(object[key], keyPath);
        if (self.$root.$$loaded) {
            fire(self.$$events, keyPath, object[key], undefined, object);
        }
    });
};

Scope.prototype.$watch = function (path, callback) {
    var $events = this.$$events[path] = this.$$events[path] || [];
    $events.push(callback);
};

Scope.prototype.$unwatch = function (path, callback) {
    var $events = this.$$events[path] || [];
    $events.splice($events.indexOf(callback), 1);
};

Scope.prototype.$eval = function (exp) {
    if (typeof exp === 'function') {
        return exp.call(this);
    }
    return new Function('scope', 'try {with(scope) {return ' + exp + ';}} catch (e) {}')(this);
};

'use strict'

function Parser(key) {
    if (!(this instanceof Parser)) {
        return new Parser(key);
    }
    if (this.parsers[key]) {
        return this.parsers[key];
    }
    this.key = key;
    this.parsers[key] = this;
    this.getter = function noop () {};
    this.setter = function noop () {};
    this.compile();
}

Parser.prototype.parsers = {};

Parser.prototype.compile = function () {
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
};

sphere.service('$parser', Parser);

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

'use strict'

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

'use strict'

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
                console.log('input change event', currentValue.getter($scope) + '=>' + value);
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
