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
