
angular.module('three', [])

.directive('threeContainer', function($window) {
    var directive = {
        link: threeContainerLink,
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

    function threeContainerLink(scope, element, attrs) {

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

            var ambientHelpers = new THREE.AmbientLight(0x999999);
            editor.sceneHelpers.add(ambientHelpers);
            var lightHelpers = new THREE.DirectionalLight(0xefefef, 1.5);
            lightHelpers.position.set(1.5, 1, 1).normalize();
            editor.sceneHelpers.add(lightHelpers);
        }
    }
});
