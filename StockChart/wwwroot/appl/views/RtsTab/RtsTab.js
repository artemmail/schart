define([
  'views/view',
  'text!views/RtsTab/RtsTab.html'
], function (View, html) {  
  var events = {
    init: function (e) {            
       
	InitIndexPageAbstract("#tabstrip2", RtsLeaders);
        if (IsPayed)
            setInterval(function () {
                if ((APP.instance.view().id == '#RtsTab') && (MarketWorks() > 0))
                    RefreshIndexTablesRts();
            }, 5000);

    }
  };  
  var view = new View('RtsTab', html, null, events);
});