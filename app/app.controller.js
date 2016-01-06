angular.module('myApp')
.controller('AppController', function() {
    var vm = this;

    vm.width = 800;
    vm.height = 800;

    this.newWidth = function() {
        vm.width = 2000;
    };


    this.addCube = function() {
        var width = 200;
        var height = 20;
        var depth = 200;

        var widthSegments = 1;
        var heightSegments = 1;
        var depthSegments = 1;

        var material = new THREE.MeshLambertMaterial( { color: 0x2288C1, overdraw: 0.5 } );
        var geometry = new THREE.BoxGeometry( width, height, depth, widthSegments, heightSegments, depthSegments );
        var mesh = new THREE.Mesh( geometry, material );
        mesh.name = 'Box ';

        vm.editor.addObject( mesh );
        vm.editor.select( mesh );
    };

    this.scale = function() {
		vm.editor.signals.transformModeChanged.dispatch('scale');
    };
    this.translate = function() {
		vm.editor.signals.transformModeChanged.dispatch('translate');
    };

    this.delete = function() {
		var object = vm.editor.selected;

		//if ( confirm( 'Delete ' + object.name + '?' ) === false ) return;

		var parent = object.parent;
		vm.editor.removeObject( object );
		vm.editor.select( parent );
    };

    this.theme = function(theme) {
        vm.editor.setTheme( 'css/' + theme + '.css' );
        vm.editor.config.setKey( 'theme', 'css/' + theme + '.css' );
    };
});
