(function() {
    angular
        .module('myApp')
        .controller('AppController', appController);

    function appController(editorService) {
        var vm = this;

        vm.editor = editorService.getEditor();

        vm.width = 800;
        vm.height = 800;


        // Slicer
        var zSlice = editorService.getLimits().height;
        editorService.renderSlicePlane();
        editorService.moveSlicePlane(zSlice);
    }
})();
