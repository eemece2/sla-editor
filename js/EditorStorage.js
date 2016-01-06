
var EditorStorage = function (editor, storage) {

storage.init( function () {
    storage.get( function ( state ) {
        if ( state !== undefined ) {
            editor.fromJSON( state );
        }

        var selected = editor.config.getKey( 'selected' );
        if ( selected !== undefined ) {
            editor.selectByUuid( selected );
        }

        editor.signals.loadingFinished.dispatch(state);
    } );

    var timeout;

    var saveState = function ( scene ) {
        if ( editor.config.getKey( 'autosave' ) === false ) {
            return;
        }

        clearTimeout( timeout );
        timeout = setTimeout( function () {
            editor.signals.savingStarted.dispatch();
            timeout = setTimeout( function () {
                storage.set( editor.toJSON() );
                editor.signals.savingFinished.dispatch();
            }, 100 );
        }, 1000 );
    };

    var signals = editor.signals;

    signals.editorCleared.add( saveState );
    signals.geometryChanged.add( saveState );
    signals.objectAdded.add( saveState );
    signals.objectChanged.add( saveState );
    signals.objectRemoved.add( saveState );
    signals.materialChanged.add( saveState );
    signals.sceneGraphChanged.add( saveState );
    signals.scriptChanged.add( saveState );

} );
};
