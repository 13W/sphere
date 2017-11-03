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
