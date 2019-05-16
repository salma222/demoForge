$(document).ready(function () {
        
    var treeNode;
    prepareAppBucketTree();
    $('#refreshBuckets').click(function () {
        $('#appBuckets').jstree(true).refresh();
    });

    $('#createNewBucket').click(function () {
        createNewBucket();

    });
    $('#permenantlydeleteBucket').click(function () {
        deleteBucket(treeNode);
    });

    $('#permenantlydeleteObject').click(function () {
        deleteObject(treeNode);
    });
    $('#createBucketModal').on('shown.bs.modal', function () {
        $("#newBucketKey").focus();
    })
    
    $('#deleteBucketModal').on('shown.bs.modal', function () {
        $("#deleteBucketKey").focus();
    })
    $('#deleteObjectModal').on('shown.bs.modal', function () {
        $("#deleteBucketKey").focus();
    })

    $('#hiddenUploadField').change(function () {
        var node = $('#appBuckets').jstree(true).get_selected(true)[0];
        var _this = this;
        if (_this.files.length == 0) return;
        var file = _this.files[0];
        switch (node.type) {
            case 'bucket':
                var formData = new FormData();
                formData.append('fileToUpload', file);
                formData.append('bucketKey', node.id);

                $.ajax({
                    url: '/api/forge/oss/objects',
                    data: formData,
                    processData: false,
                    contentType: false,
                    type: 'POST',
                    success: function (data) {
                        $('#appBuckets').jstree(true).refresh_node(node);
                        _this.value = '';
                    }
                });
                break;
        }
    });
});

function createNewBucket() {
    var bucketKey = $('#newBucketKey').val();
    var policyKey = $('#newBucketPolicyKey').val();
    $('#newBucketKey').val('');
    jQuery.post({
        url: '/api/forge/oss/buckets',
        contentType: 'application/json',
        data: JSON.stringify({ 'bucketKey': bucketKey, 'policyKey': policyKey }),
        success: function (res) {
            $('#appBuckets').jstree(true).refresh();
            $('#createBucketModal').modal('toggle');
            $('#newBucketKey').val('');
           
        },
        error: function (err) {
            if (err.status == 409)
            {
                alert('Bucket already exists - 409: Duplicated')
                console.log(err);
            }
            else(err.status == 500)
            {
                alert('Bucket name is too short')
            }
        }

    });
}

function prepareAppBucketTree() {
    $('#appBuckets').jstree({
        'core': {
            'themes': { "icons": true },
            'data': {
                "url": '/api/forge/oss/buckets',
                "dataType": "json",
                'multiple': false,
                "data": function (node) {
                    return { "id": node.id };
                }
            }
        },
        'types': {
            'default': {
                'icon': 'glyphicon glyphicon-question-sign'
            },
            '#': {
                'icon': 'glyphicon glyphicon-cloud'
            },
            'bucket': {
                'icon': 'glyphicon glyphicon-folder-open'
            },
            'object': {
                'icon': 'glyphicon glyphicon-file'
            }
        },
        "plugins": ["types", "state", "sort", "contextmenu"],
        contextmenu: { items: autodeskCustomMenu }
    }).on('loaded.jstree', function () {
        $('#appBuckets').jstree('open_all');
    }).bind("activate_node.jstree", function (evt, data) {
        if (data != null && data.node != null && data.node.type == 'object') {
            $("#forgeViewer").empty();
            var urn = data.node.id;
            getForgeToken(function (access_token) {
                jQuery.ajax({
                    url: 'https://developer.api.autodesk.com/modelderivative/v2/designdata/' + urn + '/manifest',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    success: function (res) {
                        if (res.status === 'success') launchViewer(urn);
                        else $("#forgeViewer").html('The translation job still running: ' + res.progress + '. Please try again in a moment.');
                    },
                    error: function (err) {
                        var msgButton = 'This file is not translated yet! ' +
                            '<button class="btn btn-xs btn-info" onclick="translateObject()"><span class="glyphicon glyphicon-eye-open"></span> ' +
                            'Start translation</button>'
                        $("#forgeViewer").html(msgButton);

                    }
                });
            })
        }
    });
}

function autodeskCustomMenu(autodeskNode) {
    var items;

    switch (autodeskNode.type) {
        case "bucket":
            items = {
                uploadFile: {
                    label: "Upload file",
                    action: function () {
                        uploadFile();
                    },
                    icon: 'glyphicon glyphicon-cloud-upload'
                },
                deleteBucket: {
                    label: "Delete Bucket",
                    action: function () {
                         treeNode = $('#appBuckets').jstree(true).get_selected(true)[0];
                        deleteBucket1();
                    },
                    icon: 'glyphicon glyphicon-trash'
                }
            };
            break;
        case "object":
            items = {
                translateFile: {
                    label: "Translate",
                    action: function () {
                        var treeNode = $('#appBuckets').jstree(true).get_selected(true)[0];
                        translateObject(treeNode);
                    },
                    icon: 'glyphicon glyphicon-eye-open'
                },
                deleteObject: {
                    label: "Delete file",
                    action: function () {
                        var treeNode = $('#appBuckets').jstree(true).get_selected(true)[0];
                        deleteObject1();
                    },
                    icon: 'glyphicon glyphicon-trash'
                }
            };
            
            break;
    }

    return (items);
}

function uploadFile() {
    $('#hiddenUploadField').click();
}
function deleteBucket1() {
    $('#deleteBucketModal').modal();  
}
function deleteObject1() {
    $('#deleteObjectModal').modal();
}
function translateObject(node) {
    $("#forgeViewer").empty();
    if (node == null) node = $('#appBuckets').jstree(true).get_selected(true)[0];
    var bucketKey = node.parents[0];
    var objectKey = node.id;
    jQuery.post({
        url: '/api/forge/modelderivative/jobs',
        contentType: 'application/json',
        data: JSON.stringify({ 'bucketKey': bucketKey, 'objectName': objectKey }),
        success: function (res) {
            $("#forgeViewer").html('Translation started! Please try again in a moment.');
        },
    });
}

function deleteObject(node) {
    $("#forgeViewer").empty();
    if (node == null) node = $('#appBuckets').jstree(true).get_selected(true)[0];
    var bucketKey = node.parents[0];
    var objectKey = node.text;

    jQuery.post({
        url: 'api/forge/oss/objects/delete',
        contentType: 'application/json',
        data: JSON.stringify({
            'bucketKey': bucketKey,
            'objectKey': objectKey
        }),
        success: function (res) {
            $('#appBuckets').jstree(true).refresh();
            $('#deleteObjectModal').modal('toggle');
        },
        error: function (err) {
            alert('Object not deleted')
            console.log(err);
        }
    });
}
function deleteBucket(node) {
    $("#forgeViewer").empty();
    if (node == null) node = $('#appBuckets').jstree(true).get_selected(true)[0];
    var bucketKey = node.text;


    jQuery.post({
        url: 'api/forge/oss/buckets/delete',
        contentType: 'application/json',
        data: JSON.stringify({
            'bucketKey': bucketKey
        }),
        success: function (res) {
            $('#appBuckets').jstree(true).refresh();
            $('#deleteBucketModal').modal('toggle');
        },
        error: function (err) {
            alert('Bucket not deleted')
            console.log(err);
        }
    });
}