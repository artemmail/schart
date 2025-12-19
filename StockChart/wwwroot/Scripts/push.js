var pushNotification;

function onDeviceReady() {


    FCMPlugin.getToken(
  function (token) {

      $.ajax({
          url: sitePrefix + 'Alerts/jsonRegisterDevice',
          username: authdata.login,
          password: authdata.password,
          data: { deviceId: token },
          //  async: false,
          success: function (data) {

          }
      });

  },
  function (err) {
      console.log('error retrieving token: ' + err);     
  }
)

    FCMPlugin.onNotification(
    function (data) {

        var s = "{0} достиг цены {1}. <br> Перейти на график <a onclick='OpenCandles({ticker:{2}})'>График</a>".format(
          data.ticker, data.price, '"' + data.ticker + '"');

        $.when(kendo.ui.ExtAlertDialog.show({
            title: "Алерт",
            message: s,
            icon: "k-ext-information"
        }));

        $('#alertsGrid').data('kendoGrid').dataSource.read();

        
        /*
          alert("DATATATAT");

        if (data.wasTapped) {
            //Notification was received on device tray and tapped by the user.
            alert(JSON.stringify(data));
        } else {
            //Notification was received in foreground. Maybe the user needs to be notified.
            alert(JSON.stringify(data));
        }*/
    },
    function (msg) {
        console.log('onNotification callback successfully registered: ' + msg);
    },
    function (err) {
        console.log('Error registering onNotification callback: ' + err);
    }
  );



    /*


    var push = PushNotification.init({
        android: {
            senderID: "201016837756"
        },
        browser: {
            pushServiceURL: 'http://push.api.phonegap.com/v1/push'
        },
        ios: {
            alert: "true",
            badge: "true",
            sound: "true"
        },
        windows: {}
    });

    push.on('registration', function (data) {
    
        if (authdata != null) {
            $.ajax({
                url: sitePrefix + 'Alerts/jsonRegisterDevice',
                username: authdata.login,
                password: authdata.password,
                data: { deviceId: data.registrationId },
                //  async: false,
                success: function (data) {
                   
                }
            });
        }

    });

    push.on('notification', function (data) {

        var s = "{0} достиг цены {1}. <br> Перейти на график <a onclick='OpenCandles({ticker:{2}})'>График</a>".format(
            data.additionalData.ticker, data.additionalData.price, '"' + data.additionalData.ticker + '"');

        $.when(kendo.ui.ExtAlertDialog.show({
            title: "Алерт",
            message: s,
            icon: "k-ext-information"
        }));

        $('#alertsGrid').data('kendoGrid').dataSource.read();
        
    });

    push.on('error', function (e) {

        $("#app-status-ul").append('<li>' + e.message + '</li>');
        // e.message
    });
    */
}