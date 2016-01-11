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

    function editorSidebarController() {
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

        ///////////////////////////////////////////////////////////////////////////
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

                    //var z = 100;
                    sliceGeometry(convertedGeom, vm.zSlice);
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
    }
})();
