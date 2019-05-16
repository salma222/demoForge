var id_token;

    function onSignIn(googleUser) {
            // Useful data for your client-side scripts:
    var profile = googleUser.getBasicProfile();

    // The ID token you need to pass to your backend:
      id_token = googleUser.getAuthResponse().id_token;
        console.log("ID Token: " + id_token);
        $('#bucketdisplay').css("visibility", "visible");
        $('#bucketdisplay').show();
        $('#signout').css("visibility", "visible");
        $('#loginGoogle').modal('hide');
        $('#forgeViewer').css("visibility", "visible");
        $('#userinfo').css("visibility", "visible");
        $("#profileimage").attr("src", profile.getImageUrl());
        $("#username").text('Welcome to Forge Viewer '+ profile.getName());
        
        
        
}
function signOut() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function ()

    {
        id_token = null;
        console.log('User signed out.');
        console.log('User signed out.');
        $('#bucketdisplay').css("visibility", "hidden");
        $('#forgeViewer').css("visibility", "hidden");
        $('#signout').css("visibility", "hidden");
        $('#userinfo').css("visibility", "hidden");
        $('#loginGoogle').modal('show');
        

        }); 

    auth2.disconnect();
}