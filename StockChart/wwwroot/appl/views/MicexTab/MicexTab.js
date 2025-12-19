define([
  'views/view',
  'text!views/MicexTab/MicexTab.html'
], function (View, html) {  
  var events = {
    init: function (e) {            
       
        InitIndexPageAbstract("#tabstrip", MicexLeaders);
        if (IsPayed)
            setInterval(function () {
                if ((APP.instance.view().id == '#MicexTab') && (MarketWorks() == 2))
                    RefreshIndexTablesMicex();
            }, 5000);    
    }
  };  
  var view = new View('MicexTab', html, null, events);
});