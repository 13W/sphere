'use strict';

sphere.directive('s-class', () => ({
    link($scope, element) {
        const sClass = element.getAttribute('s-class');
        if (!sClass) {
            return;
        }

        let oldClasses;
        $scope.$watch(sClass, (newClasses) => {
            // console.info(`change class $scope:${$scope.$id}(${sClass})`, newClasses);
            if (newClasses === oldClasses) {
                return;
            }
            oldClasses = newClasses;
            const [add, remove] = sphere.divide(newClasses, Boolean, true);
            element.classList.add(...add);
            element.classList.remove(...remove);
        });
    }
}));
