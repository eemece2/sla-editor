
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
        // Camera
        var camera = new THREE.PerspectiveCamera(75, containerWith / containerHeight, 0.1, 1000);
        camera.position.z = 5;
        // Lights
        var ambient = new THREE.AmbientLight( 0x505050 );
        scene.add( ambient );
        var light = new THREE.DirectionalLight( 0xefefff, 1.5 );
        light.position.set( 1, 1, 1 ).normalize();
        scene.add( light );

        // Renderer
        var renderer = new THREE.WebGLRenderer();
        renderer.setSize(containerWith, containerHeight);
        // DOM
        element.append(renderer.domElement);

        // Objects
        makeObjects(scene);

        function render() {
            requestAnimationFrame(render);

            //group.rotation.x += 0.01;
            //group.rotation.y += 0.01;
            camera.position.y += 0.01;
            camera.lookAt(0, 0, 0);

            renderer.render(scene, camera);
        }
        render();

        function makeObjects(scene) {
            // Cube
            var geometry = new THREE.BoxGeometry(1, 1, 1);
            var material = new THREE.MeshLambertMaterial( { color: 0xff8866, overdraw: 0.5 } );
            var cube = new THREE.Mesh(geometry, material);
            //scene.add(cube);

            // Cilinder
            var geometryC = new THREE.CylinderGeometry(0.4, 0.4, 2, 32, 32);
            var materialC = new THREE.MeshLambertMaterial( { color: 0x88ff66, overdraw: 0.5 } );
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
