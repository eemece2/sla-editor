
angular.module('three', [])

.directive('threeContainer', function($window) {
    var directive = {
        link: threeContainerLink_1,
        replace: true,
        template: '<div class="three-container"></div>',
        scope: {
            width: '=',
            height: '=',
            fillcontainer: '=',
            editor: '='
        }
    };

    return directive;

    ///////////////////////////////////////////////////////////////////////////

    function threeContainerLink_1(scope, element, attrs) {

        //scope.editor = new Editor();
        var editor = scope.editor;

        var viewport = new Viewport( editor, element[0] );

        editor.setTheme( editor.config.getKey( 'theme' ) );

        var storage = new Storage();

        var editorStorage = new EditorStorage(editor, storage);

        editor.signals.loadingFinished.add( function (state) {
            if(!state) {
                addLights();
            }
        });

        var onWindowResize = function ( event ) {

            editor.signals.windowResize.dispatch();

        };

        $window.addEventListener( 'resize', onWindowResize, false );

        onWindowResize();

        ///////////////////////////////////////////////////////////////////////
        // scene
        // Lights
        function addLights() {
            var ambient = new THREE.AmbientLight(0x999999);
            editor.scene.add(ambient);
            var light = new THREE.DirectionalLight(0xefefef, 1.5);
            light.position.set(1.5, 1, 1).normalize();
            editor.scene.add(light);
        }
        //// Object selection
        //editor.signals.objectSelected.add(function(object) {
            //console.log(object);
        //});
    }

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    function threeContainerLink_2(scope, element, attrs) {

        var containerWith = (scope.fillcontainer) ? element[0].clientWidth : scope.width;
        var containerHeight = (scope.fillcontainer) ? element[0].clientHeight : scope.height;

        var editor = new Editor();

        // Scene
        var scene = new THREE.Scene();
        var sceneHelpers = new THREE.Scene();

        var objects = [];

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

        // EditorControls
        var controls = new THREE.EditorControls( camera, renderer.domElement );
        controls.center.fromArray([0, 0, 0]);// editor.config.getKey( 'camera/target' ) );
        controls.addEventListener( 'change', function () {
        });

        var selectionBox = new THREE.BoxHelper();
        selectionBox.material.depthTest = false;
        selectionBox.material.transparent = true;
        selectionBox.visible = false;
        sceneHelpers.add( selectionBox );

        // TransformControls
        var transformControls = new THREE.TransformControls( camera, renderer.domElement );
        transformControls.addEventListener( 'change', function () {
            console.log('change');
            var object = transformControls.object;
            if ( object !== undefined ) {
                if ( editor.helpers[ object.id ] !== undefined ) {
                    editor.helpers[ object.id ].update();
                }
            }
            render();
        });

        transformControls.addEventListener( 'mouseDown', function () {
            controls.enabled = false;
        } );
        transformControls.addEventListener( 'mouseUp', function () {
            signals.objectChanged.dispatch( transformControls.object );
            controls.enabled = true;
        } );

        // object picking

        var raycaster = new THREE.Raycaster();
        var mouse = new THREE.Vector2();

        // events

        var getIntersects = function ( point, object ) {

            mouse.set( ( point.x * 2 ) - 1, - ( point.y * 2 ) + 1 );

            raycaster.setFromCamera( mouse, camera );

            if ( object instanceof Array ) {

                return raycaster.intersectObjects( object );

            }

            return raycaster.intersectObject( object );

        };

        var onDownPosition = new THREE.Vector2();
        var onUpPosition = new THREE.Vector2();
        var onDoubleClickPosition = new THREE.Vector2();

        var getMousePosition = function ( dom, x, y ) {

            var rect = dom.getBoundingClientRect();
            return [ ( x - rect.left ) / rect.width, ( y - rect.top ) / rect.height ];

        };

        var handleClick = function () {

            if ( onDownPosition.distanceTo( onUpPosition ) === 0 ) {

                var intersects = getIntersects( onUpPosition, objects );

                if ( intersects.length > 0 ) {

                    var object = intersects[ 0 ].object;

                    if ( object.userData.object !== undefined ) {

                        // helper

                        editor.select( object.userData.object );

                    } else {

                        editor.select( object );

                    }

                } else {

                    editor.select( null );

                }

                render();

            }

        };

        var onMouseDown = function ( event ) {

            event.preventDefault();

            var array = getMousePosition( renderer.domElement, event.clientX, event.clientY );
            onDownPosition.fromArray( array );

            document.addEventListener( 'mouseup', onMouseUp, false );

        };

        var onMouseUp = function ( event ) {

            var array = getMousePosition( renderer.domElement, event.clientX, event.clientY );
            onUpPosition.fromArray( array );

            handleClick();

            document.removeEventListener( 'mouseup', onMouseUp, false );

        };

        var onTouchStart = function ( event ) {

            var touch = event.changedTouches[ 0 ];

            var array = getMousePosition( renderer.domElement, touch.clientX, touch.clientY );
            onDownPosition.fromArray( array );

            document.addEventListener( 'touchend', onTouchEnd, false );

        };

        var onTouchEnd = function ( event ) {

            var touch = event.changedTouches[ 0 ];

            var array = getMousePosition( renderer.domElement, touch.clientX, touch.clientY );
            onUpPosition.fromArray( array );

            handleClick();

            document.removeEventListener( 'touchend', onTouchEnd, false );

        };

        var onDoubleClick = function ( event ) {

            var array = getMousePosition( renderer.domElement, event.clientX, event.clientY );
            onDoubleClickPosition.fromArray( array );

            var intersects = getIntersects( onDoubleClickPosition, objects );

            if ( intersects.length > 0 ) {

                var intersect = intersects[ 0 ];

                signals.objectFocused.dispatch( intersect.object );

            }

        };

        renderer.domElement.addEventListener( 'mousedown', onMouseDown, false );
        renderer.domElement.addEventListener( 'touchstart', onTouchStart, false );
        renderer.domElement.addEventListener( 'dblclick', onDoubleClick, false );

        ///////////////////////////////////////////////////////////////////////

        // Objects
        makeObjects(scene);

        sceneHelpers.add( transformControls );

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

            transformControls.attach( cube );
            transformControls.update();
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
