(function() {
    angular
        .module('slicer')
        .factory('slicerService', slicerService);

    function slicerService() {
        var editor = null;
        var shapes = [];

        return {
            doSlice: doSlice
        };

        function doSlice(_editor, zSlice) {
            editor = _editor;
            shapes.forEach(function(shape) {
                editor.sceneHelpers.remove(shape);
            });
            shapes = [];

            var objects = editor.scene.children;
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

                    //var z = 100;
                    sliceGeometry(convertedGeom, zSlice);
                }
            });
        }

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
                var shape = addShape(polygon.points, z, editor.sceneHelpers);
                shapes.push(shape);
            });

            editor.signals.sceneGraphChanged.dispatch();
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
    }
})();
