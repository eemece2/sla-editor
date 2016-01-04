
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
        // Lights
        var ambient = new THREE.AmbientLight( 0x101010 );
        scene.add( ambient );
        var light = new THREE.DirectionalLight( 0xefefff, 1.5 );
        light.position.set( -10, -1, -1 ).normalize();
        scene.add( light );

        // Renderer
        var renderer = new THREE.WebGLRenderer();
        renderer.setSize(containerWith, containerHeight);
        // DOM
        element.append(renderer.domElement);

        // Cube
        var geometry = new THREE.BoxGeometry(1, 1, 1);
        var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        var cube = new THREE.Mesh(geometry, material);
        scene.add(cube);

        camera.position.z = 5;

        function render() {
            requestAnimationFrame(render);

            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;

            renderer.render(scene, camera);
        }
        render();


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
