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
