var editor = new Editor();

var viewport = new Viewport( editor );
//document.body.appendChild( viewport.dom );

editor.setTheme( editor.config.getKey( 'theme' ) );

var storage = new Storage();

var editorStorage = new EditorStorage(editor, storage);


var onWindowResize = function ( event ) {

    editor.signals.windowResize.dispatch();

};

window.addEventListener( 'resize', onWindowResize, false );

onWindowResize();

