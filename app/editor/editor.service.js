(function() {
    angular
        .module('editor')
        .factory('editorService', editorService);

    function editorService() {
        var editor = null;

        return {
            addCube: addCube,
            addSphere: addSphere,
            addCylinder: addCylinder,
            remove: remove
        };

        ///////////////////////////////////////////////////////////////////////

        function addCube(editor) {
            // TODO: params to config service
            var width = 200;
            var height = 20;
            var depth = 200;

            var widthSegments = 1;
            var heightSegments = 1;
            var depthSegments = 1;

            var geometry = new THREE.BoxGeometry(width, height, depth, widthSegments, heightSegments, depthSegments);
            var mesh = new THREE.Mesh(geometry, editor.defaultMaterial);
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
            var mesh = new THREE.Mesh(geometry, editor.defaultMaterial);
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
            var mesh = new THREE.Mesh(geometry, editor.defaultMaterial);
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
    }
})();
