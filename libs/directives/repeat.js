'use strict';

sphere.directive('s-repeat', () => ({
  priority: 100,
  replace: true,
  link($scope, element) {
    if (element.className.indexOf('s-repeat-element') !== -1) {
      return;
    }

    const $compile = sphere.get('$compile');
    const repeatStr = element.getAttribute('s-repeat'),
      parsed = /\s*(?:\(\s*(\w+)\s*,\s*(\w+)\s*\)|\s*(\w+)\s*)\s*in\s*(\w+)\s*/g.exec(repeatStr) || {},
      entryKey = parsed[1] || parsed[3],
      entryIndex = parsed[2],
      collectionKey = parsed[4],
      parentElement = element.parentNode,
      original = element.cloneNode(true),
      comment = document.createComment(original.outerHTML);

    let $repeatScope = $scope.$new();

    parentElement.replaceChild(comment, element);

    if (!collectionKey) {
      return;
    }

    const scopeMap = new Map();
    const itemsMap = new Map();

    function repeat(collection) {
      if (!collection) {
        return;
      }

      if ($repeatScope) {
        for (let [scope, element] of scopeMap.entries()) {
          if (scope.$destroyed) {
            parentElement.removeChild(element);
            scopeMap.delete(scope);
          }
        }
      }

      let length = Object.keys(collection).length,
        lastElement = comment;

      const aliveScopes = {};
      sphere.forEach(collection, (item, key, index) => {
        let itemScope = itemsMap.get(item);
        if (itemScope && itemScope.$destroyed) {
          itemsMap.delete(item);
          itemScope = null;
        }

        if (!itemScope) {
          itemScope = $repeatScope.$new();
          itemScope[entryKey] = item;
          itemsMap.set(item, itemScope);
          itemScope.$once('$destroy', () => itemsMap.delete(item));
        }

        if (entryIndex) {
          itemScope[entryIndex] = key;
        }
        itemScope.$index = index;
        itemScope.$last = index === (length - 1);

        if (!scopeMap.has(itemScope)) {
          const dom = original.cloneNode(true);
          $compile.mapScope(dom, itemScope);
          scopeMap.set(itemScope, dom);
          dom.dataset.scope = itemScope.$id;
          dom.classList.add('s-repeat-element');
          $compile(dom, itemScope);
          parentElement.insertBefore(dom, lastElement.nextSibling);
        }

        aliveScopes[itemScope.$id] = true;
        lastElement = scopeMap.get(itemScope);
      });

      scopeMap.forEach((dom, scope) => {
        const $id = scope.$id;
        if (!aliveScopes[$id]) {
          dom.remove();
          scope.$destroy();
          scopeMap.delete(scope);
        }

        delete aliveScopes[$id];
      });
    }

    $scope.$watch(collectionKey, repeat);
  }
}));
