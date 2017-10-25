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
            // console.warn('$destroy', this.$id);
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
