(function() {
    angular
        .module('myApp')
        .controller('AppController', appController);

    function appController(editorService) {
        var vm = this;

        vm.editor = editorService.getEditor();

        vm.width = 800;
        vm.height = 800;

        var material = new THREE.MeshLambertMaterial( { color: 0x2288C1, overdraw: 0.5 } );
        vm.editor.defaultMaterial = material; // TODO: think

        // TODO: Move
        vm.editor.signals.objectAdded.add(function(object) {
            object.material = material;
        });

        // Slicer
        var zSlice = editorService.getLimits().height;
        editorService.renderSlicePlane();
        editorService.moveSlicePlane(zSlice);
    }
})();
