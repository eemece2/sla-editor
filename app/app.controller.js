angular.module('myApp')
.controller('AppController', function() {
    var vm = this;

    vm.editor = new Editor();

    vm.width = 800;
    vm.height = 800;

    this.newWidth = function() {
        vm.width = 2000;
    };

    var material = new THREE.MeshLambertMaterial( { color: 0x2288C1, overdraw: 0.5 } );

    vm.editor.signals.objectAdded.add(function(object) {
        object.material = material;
    });

    var shapes = [];

    this.doSlice = function() {
        shapes.forEach(function(shape) {
            vm.editor.sceneHelpers.remove(shape);
        });
        shapes = [];

        var objects = vm.editor.scene.children;
        objects.forEach(function(object) {
            if(object.type == 'Mesh') {
                var geom;
                if(object.geometry.type == 'BufferGeometry') {
                    geom = object.geometry.toGeometry();
                } else {
                    geom = object.geometry;
                }

                // Change Y - Z
                var m = new THREE.Matrix4();
                m.makeRotationX(Math.PI/2);
                var m2 = new THREE.Matrix4();
                m2.makeTranslation(0, -100, -100);
                var m3 = m.multiply(m2);

                var convertedGeom = geom.clone();
                convertedGeom.applyMatrix(object.matrix);
                convertedGeom.applyMatrix(m3);

                var z = 100;
                sliceGeometry(convertedGeom, z);
            }
        });
    };

    function sliceGeometry(geometry, z) {
        var vertices = geometry.vertices;
        // Create triangles
        var triangles = [];
        geometry.faces.forEach(function(face) {
            var vertA = vertices[face.a];
            var vertB = vertices[face.b];
            var vertC = vertices[face.c];
            triangles.push([
                [vertA.x, vertA.y, vertA.z],
                [vertB.x, vertB.y, vertB.z],
                [vertC.x, vertC.y, vertC.z]
            ]);
        });

        var slicer = createSlicer();

        triangles.forEach(function(triangle) {
            //console.log('triangle', triangle);
            slicer.addTriangle(triangle);
        });

        var limitWidth = 100; // TODO
        var sliceDistance = z - limitWidth; // TODO
        var polygons = slicer.slice(sliceDistance);

        console.log('polygons', polygons);

        drawSlice(polygons, z);
    }

    function drawSlice(polygons, z) {

        polygons.forEach(function(polygon) {
            var shape = addShape(polygon.points, z, vm.editor.sceneHelpers);
            shapes.push(shape);
        });

        vm.editor.signals.sceneGraphChanged.dispatch();
    }

    function addShape(points, z, scene) {
        var shape = new THREE.Shape();

        shape.moveTo(points[0].x, points[0].y);
        for(var i = 1; i < points.length; i++) {
            shape.lineTo(points[i].x, points[i].y);
        }
        shape.lineTo(points[0].x, points[0].y);

        var extrudeSettings = { amount: 1, bevelEnabled: false, bevelSegments: 2, steps: 2, bevelSize: 0, bevelThickness: 0 };

        var geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
        // Change Y - Z
        var m = new THREE.Matrix4();
        m.makeRotationX(-Math.PI/2);
        var m2 = new THREE.Matrix4();
        m2.makeTranslation(0, -100, z); // TODO
        var m3 = m.multiply(m2);

        geometry.applyMatrix(m3);

        var mat = new THREE.MeshLambertMaterial( { color: 0x2288C1, transparent: true, opacity: 0.4 } );
        var mesh = new THREE.Mesh( geometry, mat );
        scene.add(mesh);

        return mesh;
    }

    ///////////////////////////////////////////////////////////////////////////

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

    // Import STL
    var fileInput = document.createElement( 'input' );
    fileInput.type = 'file';
    fileInput.addEventListener( 'change', function ( event ) {
    console.log('change');
    vm.editor.loader.loadFile( fileInput.files[ 0 ] );
    this.value = null;
    });
    this.addStl = function() {
        console.log('click');
        fileInput.click();
    };

    this.scale = function() {
        vm.editor.signals.transformModeChanged.dispatch('scale');
    };
    this.translate = function() {
        vm.editor.signals.transformModeChanged.dispatch('translate');
    };
    this.rotate = function() {
        vm.editor.signals.transformModeChanged.dispatch('rotate');
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

    this.move = function() {
        var object = vm.editor.selected;
        object.translateX(50);
        //vm.editor.signals.sceneGraphChanged.dispatch();
        vm.editor.signals.objectChanged.dispatch( object );
    };
});
