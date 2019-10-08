/**
 * Created by Vladimir <zero@13w.me> on 02.11.17.
 */

sphere.directive('s-controller', () => ({
  priority: 50,
  controller($scope, dom, attributes) {
    const controllerName = attributes['s-controller'].value;
    const controller = sphere.get(controllerName);
    if (!controller) {
      throw new Error(`Controller ${controllerName} not found.`);
    }
    controller($scope);
  }
}));
