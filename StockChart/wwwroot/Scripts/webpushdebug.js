function alert2(s) {
   // var theElement = document.createElement("<h1>"+s+"</h1>");
    document.body.innerHTML += (s) + "<br></br>";
}
var config = {
    apiKey: "AIzaSyC5-1nKeIkxJGwqv5XgSU8XL0C_1dbPGfw",
    authDomain: "ruticker-c13a0.firebaseapp.com",
    databaseURL: "https://ruticker-c13a0.firebaseio.com",
    storageBucket: "ruticker-c13a0.appspot.com",
    messagingSenderId: "111280440155"
};
alert2("1");
firebase.initializeApp(config);
alert2("2");
  const messaging = firebase.messaging();
  //messaging.onTokenRefresh(function() {
    messaging.getToken()
    .then(function(data) {
        alert2("3");
      console.log('token recieved');
      $.ajax({
                url: '/Alerts/jsonRegisterDevice',
                data: { deviceId: data },
                success: function (data) {
                   console.log(JSON.stringify(data) );
                }
            });
    })
    .catch(function(err) {
      console.log('Unable to retrieve refreshed token ', err);
   //   showToken('Unable to retrieve refreshed token ', err);
    });
  //});
                                 /*
'use strict';
if ('serviceWorker' in navigator) {
  console.log('Service Worker is supported');
  navigator.serviceWorker.register('notification.js').then(function() {
    return navigator.serviceWorker.ready;
  }).then(function(reg) {
    console.log('Service Worker is ready :^)', reg);
    reg.pushManager.subscribe({userVisibleOnly: true}).then(function(sub) {
    console.log('endpoint:', sub.endpoint);
     var token =  sub.endpoint.replace('https://android.googleapis.com/gcm/send/','');
            $.ajax({
                url: sitePrefix + 'Alerts/jsonRegisterDevice',
                data: { deviceId: token },
                success: function (data) {
                   console.log(JSON.stringify(data) );
                }
            });
    console.log(token);
    });
  }).catch(function(error) {
    console.log('Service Worker error :^(', error);
  });
}                
*/