'use strict';

sphere.directive('s-model', () => ({
  priority: 60,
  link($scope, element) {
    const $parser = sphere.get('$parser'),
      key = element.getAttribute('s-model'),
      event = element.getAttribute('s-event'),
      currentValue = $parser(key),
      elementValue = readFromInput(element);

    sphere.get('s-bind').link($scope, element);

    const eventListener = (event) => {
      event.preventDefault();
      const value = readFromInput(element);
      // console.log('input change event', currentValue.getter($scope) + '=>' + value);
      if (value !== currentValue.getter($scope)) {
        currentValue.setter($scope, value);
      }
      return false;
    };

    if (!currentValue.getter($scope) && elementValue) {
      currentValue.setter($scope, elementValue);
    }

    element.addEventListener(event || 'change', eventListener);
  }
}));
