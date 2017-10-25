'use strict';

(() => {
    const parsers = {};
    const search = (path, object, options) => {
        var key = '',
            i = 0,
            pathLength = path.length;

        options = options || {};
        if (object && object.hasOwnProperty(path)) {
            return {
                key: path,
                value: object[path],
                object: object,
                complete: true,
                incompletePath: ''
            }
        }

        do {
            const chr = path[i];
            if (chr === '.' || !chr) {
                if (options.create && !object[key]) {
                    if (i === pathLength && options.hasOwnProperty('default')) {
                        object[key] = options.default;
                    } else {
                        object[key] = {};
                    }
                }

                if (i === pathLength) {
                    break;
                }

                if (object === undefined) {
                    break;
                }

                if (key === '$') {
                    break;
                }

                object = object[key];
                key = '';
            } else {
                key += chr;
            }

            i += 1;
        } while (i <= pathLength);

        return {
            complete: i === pathLength,
            incompletePath: key === '$' ? path.substr(i + 1) : '',
            object: object,
            key: key,
            value: key === '$' ? object : object && object[key]
        };
    };

    class Parser {
        constructor(key) {
            if (parsers[key] instanceof Parser) {
                return parsers[key];
            }

            this.key = key;
            parsers[key] = this;
            this.getter = function noop () {};
            this.setter = function noop () {};
            this.compile();
        }

        static new(...args) {
            return new Parser(...args);
        }
        compile() {
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
        }
    }

    sphere.service('$parser', Parser.new);
})();
