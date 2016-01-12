(function() {
    angular
        .module('editor')
        .factory('editorService', editorService);

    function editorService() {
        var editor = null;
        var limits = {
            width: 200,
            height: 200
        };
        var material; // Default material
        var gridStep = 10;
        var slicePlane; // Mesh

        return {
            getEditor: getEditor,
            getLimits: getLimits,
            changeSceneAlpha: changeSceneAlpha,
            setSceneVisible: setSceneVisible,
            addCube: addCube,
            addSphere: addSphere,
            addCylinder: addCylinder,
            remove: remove,
            renderSlicePlane: renderSlicePlane,
            moveSlicePlane: moveSlicePlane
        };

        ///////////////////////////////////////////////////////////////////////

        function getEditor() {
            if(!editor) {
                initEditor();
            }

            return editor;
        }

        function initEditor() {
            editor = new Editor();
            // limits box
            renderLimitBox(limits, editor.sceneHelpers);
            // Axis
            renderAxis(limits.width / 2, editor.sceneHelpers);
            // Grid
            renderGrid(limits.width / 2, gridStep, editor.sceneHelpers);

            material = new THREE.MeshLambertMaterial( { color: 0x2288C1, transparent: true } );

            // TODO: Move
            editor.signals.objectAdded.add(function(object) {
                object.material = material;
            });
        }

        function getLimits() {
            return limits;
        }

        function changeSceneAlpha(alpha) {
            material.opacity = alpha / 100;
            editor.signals.sceneGraphChanged.dispatch();
        }

        function setSceneVisible(sceneVisible) {
            material.visible = sceneVisible;
            editor.signals.sceneGraphChanged.dispatch();
        }

        function addCube(editor) {
            // TODO: params to config service
            var width = 50;
            var height = 50;
            var depth = 50;

            var widthSegments = 1;
            var heightSegments = 1;
            var depthSegments = 1;

            var geometry = new THREE.BoxGeometry(width, height, depth, widthSegments, heightSegments, depthSegments);
            var mesh = new THREE.Mesh(geometry, material);
            mesh.name = 'Box ' + Math.floor(Math.random()*1000);

            editor.addObject(mesh);
            editor.select(mesh);
        }

        function addSphere(editor) {
            // TODO: params to config service
            var radius = 75;
            var widthSegments = 32;
            var heightSegments = 16;
            var phiStart = 0;
            var phiLength = Math.PI * 2;
            var thetaStart = 0;
            var thetaLength = Math.PI;

            var geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength);
            var mesh = new THREE.Mesh(geometry, material);
            mesh.name = 'Sphere ' + Math.floor(Math.random()*1000);

            editor.addObject(mesh);
            editor.select(mesh);
        }

        function addCylinder(editor) {
            // TODO: params to config service
            var radiusTop = 20;
            var radiusBottom = 20;
            var height = 100;
            var radiusSegments = 32;
            var heightSegments = 1;
            var openEnded = false;

            var geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radiusSegments, heightSegments, openEnded);
            var mesh = new THREE.Mesh(geometry, material);
            mesh.name = 'Cylinder ' + Math.floor(Math.random()*1000);

            editor.addObject(mesh);
            editor.select(mesh);
        }

        function remove(editor) {
            console.log('remove');
            var object = editor.selected;

            var parent = object.parent;
            editor.removeObject(object);
            editor.select(parent);
        }

        // Slicer plane
        function renderSlicePlane() {
            var geometry = new THREE.BoxGeometry(limits.width, 1, limits.width);
            var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            slicePlane = new THREE.Mesh(geometry, material);

            editor.sceneHelpers.add(slicePlane);
        }

        function moveSlicePlane(zSlicer) {
            slicePlane.position.y = zSlicer;
            editor.signals.sceneGraphChanged.dispatch();
        }

        ///////////////////////////////////////////////////////////////////////

        function renderLimitBox(limits, scene) {
            var limitGeometry = new THREE.Geometry();
            var limitMaterial = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors } );
            var ww = limits.width / 2;
            var hh = limits.height;
            limitGeometry.vertices.push(
                    new THREE.Vector3(ww, 0, ww),
                    new THREE.Vector3(ww, hh, ww),
                    new THREE.Vector3(-ww, hh, ww),
                    new THREE.Vector3(-ww, 0, ww)
            );
            limitGeometry.vertices.push(
                    new THREE.Vector3(-ww, 0, ww),
                    new THREE.Vector3(-ww, hh, ww),
                    new THREE.Vector3(-ww, hh, -ww),
                    new THREE.Vector3(-ww, 0, -ww)
            );
            limitGeometry.vertices.push(
                    new THREE.Vector3(-ww, 0, -ww),
                    new THREE.Vector3(-ww, hh, -ww),
                    new THREE.Vector3(ww, hh, -ww),
                    new THREE.Vector3(ww, 0, -ww)
            );
            limitGeometry.vertices.push(
                    new THREE.Vector3(ww, 0, -ww),
                    new THREE.Vector3(ww, hh, -ww),
                    new THREE.Vector3(ww, hh, ww),
                    new THREE.Vector3(ww, 0, ww)
            );
            var line = new THREE.Line(limitGeometry, limitMaterial);
            scene.add(line);
        }

        function renderAxis(ww, scene) {
            var axisHelper = new THREE.AxisHelper( ww + 20 );
            scene.add( axisHelper );
            // Axis texts
            var textMaterial = new THREE.MeshLambertMaterial( { color: 0x2288C1, overdraw: 0.5 } );
            var textSize = 10;
            var textHeight = 1;
            // X
            var textAxisX = new THREE.TextGeometry( 'x', {
                size: textSize,
                height: textHeight,
                font: "helvetiker"
            });
            var textX = new THREE.Mesh( textAxisX, textMaterial );
            var gap = 10;
            textX.translateX(ww + gap);
            textX.rotateX(Math.PI/2);
            scene.add(textX);
            // Y
            var textAxisY = new THREE.TextGeometry( 'y', {
                size: textSize,
                height: textHeight,
                font: "helvetiker"
            });
            var textY = new THREE.Mesh( textAxisY, textMaterial );
            textY.translateY(ww + gap);
            scene.add(textY);
            // Z
            var textAxisZ = new THREE.TextGeometry( 'z', {
                size: textSize,
                height: textHeight,
                font: "helvetiker"
            });
            var textZ = new THREE.Mesh( textAxisZ, textMaterial );
            textZ.translateZ(ww + gap);
            textZ.rotateY(-Math.PI/2);
            textZ.rotateX(-Math.PI/2);
            scene.add(textZ);
        }

        function renderGrid(ww, step, scene) {
            var grid = new THREE.GridHelper(ww, step);
            scene.add(grid);
        }

    }
})();
