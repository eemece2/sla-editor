(function() {
    'use strict';

    angular
        .module('editorToolbar')
        .directive('editorToolbar', editorToolbarDirective);

    function editorToolbarDirective() {
        return {
            restrict: 'E',
            scope: {
                editor: '='
            },
            replace: true,
            templateUrl: 'app/editor-toolbar/editor-toolbar.directive.html',
            controllerAs: 'toolbar',
            bindToController: true,
            controller: editorToolbarController
        };
    }

    function editorToolbarController(editorService) {
        var vm = this;

        // add cube action
        this.addCube = function() {
            editorService.addCube(vm.editor);
        };

        // add spehere action
        this.addSphere = function() {
            editorService.addSphere(vm.editor);
        };

        // add cylinder action
        this.addCylinder = function() {
            editorService.addCylinder(vm.editor);
        };
    }
})();
