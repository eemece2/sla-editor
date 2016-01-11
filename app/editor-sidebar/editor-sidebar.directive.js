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

    function editorSidebarController(slicerService) {
        var vm = this;

        vm.mode = 'translate';
        vm.zSlice = 100;

        // add cube action
        this.addCube = function() {
            // TODO: params to config service
            var width = 200;
            var height = 20;
            var depth = 200;

            var widthSegments = 1;
            var heightSegments = 1;
            var depthSegments = 1;

            var geometry = new THREE.BoxGeometry(width, height, depth, widthSegments, heightSegments, depthSegments);
            var mesh = new THREE.Mesh(geometry, vm.editor.defaultMaterial);
            mesh.name = 'Box ' + Math.floor(Math.random()*1000);

            vm.editor.addObject(mesh);
            vm.editor.select(mesh);
        };

        // add spehere action
        this.addSphere = function() {
            // TODO: params to config service
            var radius = 75;
            var widthSegments = 32;
            var heightSegments = 16;
            var phiStart = 0;
            var phiLength = Math.PI * 2;
            var thetaStart = 0;
            var thetaLength = Math.PI;

            var geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength);
            var mesh = new THREE.Mesh(geometry, vm.editor.defaultMaterial);
            mesh.name = 'Sphere ' + Math.floor(Math.random()*1000);

            vm.editor.addObject(mesh);
            vm.editor.select(mesh);
        };

        // add cylinder action
        this.addCylinder = function() {
            // TODO: params to config service
            var radiusTop = 20;
            var radiusBottom = 20;
            var height = 100;
            var radiusSegments = 32;
            var heightSegments = 1;
            var openEnded = false;

            var geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radiusSegments, heightSegments, openEnded);
            var mesh = new THREE.Mesh(geometry, vm.editor.defaultMaterial);
            mesh.name = 'Cylinder ' + Math.floor(Math.random()*1000);

            vm.editor.addObject(mesh);
            vm.editor.select(mesh);
        };

        // delete action
        this.delete = function() {
            var object = vm.editor.selected;

            //if ( confirm( 'Delete ' + object.name + '?' ) === false ) return;

            var parent = object.parent;
            vm.editor.removeObject(object);
            vm.editor.select(parent);
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
