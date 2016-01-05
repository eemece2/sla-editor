
angular.module('three', [])

.directive('threeContainer', function($window) {
    var directive = {
        link: threeContainerLink,
        replace: true,
        template: '<div></div>',
        scope: {
            width: '=',
            height: '=',
            fillcontainer: '=',
        }
    };

    return directive;

    ///////////////////////////////////////////////////////////////////////////

    function threeContainerLink(scope, element, attrs) {

        var containerWith = (scope.fillcontainer) ? element[0].clientWidth : scope.width;
        var containerHeight = (scope.fillcontainer) ? element[0].clientHeight : scope.height;

        // Scene
        var scene = new THREE.Scene();
        var sceneHelpers = new THREE.Scene();

        // helpers
        var grid = new THREE.GridHelper(200, 10);
        grid.setColors(0x444444, 0xaaaaaa);
        sceneHelpers.add(grid);

        // Camera
        var camera = new THREE.PerspectiveCamera( 50, containerWith / containerHeight, 1, 100000 );
        camera.position.fromArray([500, 250, 500]);// editor.config.getKey( 'camera/position' ) );
        camera.lookAt( new THREE.Vector3().fromArray([0, 0, 0]));// editor.config.getKey( 'camera/target' ) ) );

        // Lights
        var ambient = new THREE.AmbientLight( 0x999999 );
        scene.add( ambient );
        var light = new THREE.DirectionalLight( 0xefefef, 1.5 );
        light.position.set( 1.5, 1, 1 ).normalize();
        scene.add( light );

        // Renderer
        var renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setSize(containerWith, containerHeight);
        renderer.autoClear = false;
        //renderer.setClearColor(0xebebeb);

        // DOM
        element.append(renderer.domElement);

        // Objects
        makeObjects(scene);

        // EditorControls
        var controls = new THREE.EditorControls( camera, element.domElement );
        controls.center.fromArray([0, 0, 0]);// editor.config.getKey( 'camera/target' ) );
        controls.addEventListener( 'change', function () {
        });

        function render() {
            requestAnimationFrame(render);

            sceneHelpers.updateMatrixWorld();
            scene.updateMatrixWorld();

            renderer.clear();
            renderer.render(scene, camera);
            renderer.render(sceneHelpers, camera);
        }
        render();

        function makeObjects(scene) {
            // Cube
            var geometry = new THREE.BoxGeometry(100, 100, 100);
            var material = new THREE.MeshLambertMaterial( { color: 0x2288C1, overdraw: 0.5 } );
            var cube = new THREE.Mesh(geometry, material);
            //scene.add(cube);

            // Cilinder
            var geometryC = new THREE.CylinderGeometry(40, 40, 200, 32, 32);
            var materialC = new THREE.MeshLambertMaterial( { color: 0x2288C1, overdraw: 0.5 } );
            var cylinder = new THREE.Mesh(geometryC, materialC);
            //scene.add(cilinder);

            var group = new THREE.Object3D();
            group.add(cube);
            group.add(cylinder);

            scene.add(group);
        }


        scope.onWindowResize = function() {
            scope.resizeCanvas();
        };

        scope.resizeCanvas = function() {

            containerWith = (scope.fillcontainer) ? element[0].clientWidth : scope.width;
            containerHeight = (scope.fillcontainer) ? element[0].clientHeight : scope.height;

            camera.aspect = containerWith / containerHeight;
            camera.updateProjectionMatrix();

            renderer.setSize(containerWith, containerHeight);

        };

        $window.addEventListener('resize', scope.onWindowResize, false);
    }
});
