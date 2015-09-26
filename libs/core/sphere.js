'use strict';

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
