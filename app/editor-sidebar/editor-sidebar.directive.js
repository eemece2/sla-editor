(function() {
    'use strict';

    angular
        .module('editorSidebar')
        .directive('editorSidebar', editorSidebarDirective);

    function editorSidebarDirective() {
        return {
            restrict: 'E',
            scope: {
                editor: '='
            },
            replace: true,
            templateUrl: 'app/editor-sidebar/editor-sidebar.directive.html',
            controllerAs: 'sidebar',
            bindToController: true,
            controller: editorSidebarController
        };
    }

    function editorSidebarController(editorService, slicerService) {
        var vm = this;

        vm.mode = 'translate';
        vm.zSlice = 100;

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

        // remove action
        this.remove = function() {
            editorService.remove(vm.editor);
        };

        // modeChanged
        this.modeChanged = function(mode) {
            vm.editor.signals.transformModeChanged.dispatch(mode);
        };


        ///////////////////////////////////////////////////////////////////////////
        // Import STL
        // TODO: DOM!! use ng-file-upload
        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.addEventListener( 'change', function (event) {
            vm.editor.loader.loadFile(fileInput.files[ 0 ]);
            this.value = null;
        });

        this.addStl = function() {
            console.log('click');
            fileInput.click();
        };
        ///////////////////////////////////////////////////////////////////////////


        this.doSlice = function() {
            slicerService.doSlice(vm.editor, vm.zSlice);
        };

    }
})();
