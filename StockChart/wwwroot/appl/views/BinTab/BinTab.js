define([
  'views/view',
  'text!views/BinTab/BinTab.html'
], function (View, html) {  
  var events = {
    init: function (e) {            
       
	InitIndexPageAbstract("#tabstrip3", CMELeaders);
        if (IsPayed)
            setInterval(function () {
                if ((APP.instance.view().id == '#BinTab'))
                    RefreshIndexTablesCME();
            }, 5000);

    }
  };  
    var view = new View('BinTab', html, null, events);
});