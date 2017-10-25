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
