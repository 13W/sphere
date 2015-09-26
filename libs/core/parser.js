'use strict';

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
