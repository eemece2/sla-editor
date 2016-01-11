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

    function editorToolbarController() {
        var vm = this;

    }
})();
