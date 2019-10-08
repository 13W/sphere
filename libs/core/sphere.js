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
