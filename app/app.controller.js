angular.module('myApp')
.controller('AppController', function() {
    var vm = this;

    vm.width = 800;
    vm.height = 800;

    this.newWidth = function() {
        vm.width = 2000;
    };

    var material = new THREE.MeshLambertMaterial( { color: 0x2288C1, overdraw: 0.5 } );

    this.addCube = function() {
        var width = 200;
        var height = 20;
        var depth = 200;

        var widthSegments = 1;
        var heightSegments = 1;
        var depthSegments = 1;

        var geometry = new THREE.BoxGeometry( width, height, depth, widthSegments, heightSegments, depthSegments );
        var mesh = new THREE.Mesh( geometry, material );
        mesh.name = 'Box ' + Math.floor(Math.random()*1000);

        vm.editor.addObject( mesh );
        vm.editor.select( mesh );
    };

    this.addSphere = function() {
		var radius = 75;
		var widthSegments = 32;
		var heightSegments = 16;
		var phiStart = 0;
		var phiLength = Math.PI * 2;
		var thetaStart = 0;
		var thetaLength = Math.PI;

		var geometry = new THREE.SphereGeometry( radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength );
		var mesh = new THREE.Mesh( geometry, material );
		mesh.name = 'Sphere ' + Math.floor(Math.random()*1000);

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

    this.objectInfo = function() {
        console.log(vm.editor.selected);
    };
});
