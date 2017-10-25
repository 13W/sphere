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
}

/*eslint no-unused-vars: 0*/
window.sphere = new Sphere();
