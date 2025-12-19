define([
  'views/view',
  'text!views/Login/Login.html'
], function (View, html) {
  
    var model = kendo.observable({
        login: "",
        password: "",
        wrongPassword: false,
        active: false,
        result: {
            "validated": false,
            "userInfo": { "UserName": null, "PayDate": null, "ExpireDate": null, "PayAmount": null, "EMail": null }
        },
        okCall: function (e) {

            authdata = { login: this.login, password: this.password };

            $.ajax({
                url: sitePrefix + 'api/common/Login',
                data: authdata,
              //  async: false,
                success: function (data) {

                    if (data.validated)                    
                        window.localStorage.setItem("auth", JSON.stringify(authdata));
                    else
                        window.localStorage.removeItem("auth");

                    IsPayed = data.validated;// && data.userInfo.PayAmount != null;
                    model.set("wrongPassword", !data.validated);
                    model.set("active", IsPayed);
                    model.set("result", data);

                     try
                   {
                    onDeviceReady();
                    }
                    catch(e)
                    {
                      }
/*                    if (IsPayed)
                        try {
                            $("#drawer").data("kendoMobileDrawer").show();
                        }
                        catch (e) { }*/
                },
                error: function(e)
                {
              //      alert(JSON.toString(e));
                }
            });

            
        },
        cancelCall: function (e) {
            $("#drawer").data("kendoMobileDrawer").show();
            //APP.instance.navigate("#drawer");
        },
        exitCall: function (e) {
            IsPayed = false;
            model.set("wrongPassword", false);
            model.set("result.validated", false);
            model.set("active", false);
        }
    });
  
                                                 


    try
    {
        var auth = window.localStorage.getItem("auth");   
        if (auth !== null)
        {
            auth = JSON.parse(auth);            
            model.set("login", auth.login);
            model.set("password", auth.password);        
            model.okCall();
        }
    }
    catch(e)
    {

    }



  var events = {
      init: function (e) {

          
         // modalViewCandles = e.sender;
      },
      open: function (e) {
        
      }
  };

  var view = new View('Login', html, model, events);
});