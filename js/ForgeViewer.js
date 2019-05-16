var viewerApp;

function launchViewer(urn) {
    if (viewerApp != null) {
        var thisviewer = viewerApp.getCurrentViewer();
        if (thisviewer) {
            thisviewer.tearDown()
            thisviewer.finish()
            thisviewer = null
            $("#forgeViewer").empty();
        }
    }

    var options = {
        env: 'AutodeskProduction',
        getAccessToken: getForgeToken
    };
    var config3d = {
        extensions: ['HandleSelectionExtension']
    };
 

    var documentId = 'urn:' + urn;
    Autodesk.Viewing.Initializer(options, function onInitialized() {
        viewerApp = new Autodesk.Viewing.ViewingApplication('forgeViewer');
        viewerApp.registerViewer(viewerApp.k3D, Autodesk.Viewing.Private.GuiViewer3D, config3d);
        viewerApp.loadDocument(documentId, onDocumentLoadSuccess, onDocumentLoadFailure);
    });
}

function onDocumentLoadSuccess(doc) {
    // We could still make use of Document.getSubItemsWithProperties()
    // However, when using a ViewingApplication, we have access to the **bubble** attribute,
    // which references the root node of a graph that wraps each object from the Manifest JSON.
    var viewables = viewerApp.bubble.search({ 'type': 'geometry' });
    if (viewables.length === 0) {
        console.error('Document contains no viewables.');
        return;
    }

    // Choose any of the available viewables
    viewerApp.selectItem(viewables[0].data, onItemLoadSuccess, onItemLoadFail);
}

function onDocumentLoadFailure(viewerErrorCode) {
    console.error('onDocumentLoadFailure() - errorCode:' + viewerErrorCode);
}

function onItemLoadSuccess(viewer, item) {
    // item loaded, any custom action?

}

function onItemLoadFail(errorCode) {
    console.error('onItemLoadFail() - errorCode:' + errorCode);
}

function getForgeToken(callback) {
    jQuery.ajax({
        url: '/api/forge/oauth/token',
        success: function (res) {
            callback(res.access_token, res.expires_in)
        }
    });
}
/// get current selection
var selection = _this.viewer.getSelection();
_this.viewer.clearSelection();
// anything selected?
if (selection.length > 0) {
    // create an array to store dbIds to isolate
    var dbIdsToChange = [];

    // iterate through the list of selected dbIds
    selection.forEach(function (dbId) {
        // get properties of each dbId
        _this.viewer.getProperties(dbId, function (props) {
            // output on console, for fun...
            console.log(props);

            // ask if want to isolate
            if (confirm('Confirm ' + props.name + ' (' + props.externalId + ')?')) {
                dbIdsToChange.push(dbId);

                // at this point we know which elements to isolate
                if (dbIdsToChange.length > 0) {
                    // isolate selected (and confirmed) dbIds
                    _this.viewer.isolate(dbIdsToChange);
                }
            }
        })
    })

}
else {
    // if nothing selected, restore
    _this.viewer.isolate(0);
}
