var storageKey = "visualSettwingkks551";

function GetDecimals(num) {
    if (num < 0.0001)
        return 8;
    if (num < 0.001)
        return 4;
    if (num < 0.01)
        return 3;
    if (num < 0.1)
        return 2;
    if (num < 1)
        return 1;
    return 0;
}

function removeUTC(date) {
    var a = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(),
        date.getHours(), date.getMinutes(), date.getSeconds()));
    return a.toISOString();
}

function CheckConvertDate(obj, format = "dd.MM.yyyy") {
    if (Object.prototype.toString.call(obj) === '[object Date]')
        return (obj);
    else
        try {

           
            var z = kendo.parseDate(obj);
            return z;

        }
        catch
        {
            return (kendo.parseDate(obj, format));
        }
}
function CheckConvertDateString(obj, format) {
    return kendo.toString(CheckConvertDate(obj, format), format);
}
function ControlsToParamsBase(ControlsModel) {
    var result = {};
    result.ticker = ControlsModel.ticker;

    if (ControlsModel.timeEnable) {
        result.startDate = getDateTime1(CheckConvertDate(ControlsModel.startDate), CheckConvertDate(ControlsModel.startTime, "HH:mm"));
        result.endDate = getDateTime1(CheckConvertDate(ControlsModel.endDate), CheckConvertDate(ControlsModel.endTime, "HH:mm"));
    }
    else {

        result.startDate = removeUTC(CheckConvertDate(ControlsModel.startDate));
        result.endDate = removeUTC(CheckConvertDate(ControlsModel.endDate));
    }
    return result;
}
function ControlsToParams(ControlsModel) {
    var result = ControlsToParamsBase(ControlsModel);
    result.period = ControlsModel.period;
    if (ControlsModel.oiEnable)
        result.oiEnable = ControlsModel.oiEnable;
    return result;
}
function ControlsToParamsTicker(ControlsModel) {
    var result = ControlsToParamsBase(ControlsModel);
    result.period = ControlsModel.period;
    if (ControlsModel.oiEnable)
        result.oiEnable = ControlsModel.oiEnable;
    if (ControlsModel.visualVolume)
        result.visualVolume = ControlsModel.visualVolume;
    result.type = ControlsModel.CandlesOnly ? "Candles" : "Cluster";
    /*
    if (result.type == "Cluster")
        result.ticker =  CheckPayedTickerString(result.ticker);*/
    return result;
}
function ControlsToParamsHorizontal(ControlsModel) {
    if ( /*ControlsModel.timeEnable ||*/ !ControlsModel.visualVolume)
        return null;
    var result = ControlsToParamsBase(ControlsModel);
    result.period = 0;
    result.priceStep = ControlsModel.priceStep;
    return result;
}




function getDateTime1(d, t) {
     
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), t.getHours(), t.getMinutes())).toISOString();
}


function ControlsToParamsFootPrint(Controls) {

    var ControlsModel = Controls.controls;

    var result = ControlsToParamsBase(ControlsModel);
    result.period = ControlsModel.period;
    result.priceStep = ControlsModel.priceStep;

    result.Postmarket = true;
    result.CandlesOnly = Controls.settings.CandlesOnly;

    if (document.getElementById('Postmarket'))
        result.Postmarket = document.getElementById('Postmarket').checked;

    return result;
}
function FootPrintSettingsModel() {
    var viewModel = kendo.observable({
        FPsettings: { Postmarket: true, OpenClose: true, style: "Volume" },
        settingsVisible: false,
        settingsVolumeVisible: true,
        settingsDeltaVisible: true,
        settingsRutickerVisible: true,
        onChange: function () {
            this.set("settingsVolumeVisible", FPsettings.style === "Volume");
            this.set("settingsRutickerVisible", FPsettings.style === "Ruticker");
            this.set("settingsDeltaVisible", FPsettings.style === "VolumeDelta");
            drawGraph();
        },



    });
    kendo.bind($("#settings"), viewModel);
    return viewModel;
}
function AddDicToData(data) {
    data.Dic = {};
    for (var i = 0; i < data.presetList.length; i++)
        data.Dic[data.presetList[i].rperiod] = data.presetList[i];
}
function ApplyModelToControls(viewModel) {
    viewModel.set("timeVisible", viewModel.controls.startDate === viewModel.controls.endDate);
    var step = viewModel.controls.minStep;
    var decimals = GetDecimals(step);
    $("#ps").data("kendoNumericTextBox").step(step);
    $("#ps").data("kendoNumericTextBox").setOptions({ min: step, format: "n" + decimals, decimals: decimals });
    $("#ps").data("kendoNumericTextBox").value(viewModel.controls.priceStep);
}
function CreateViewModelBase(data, callBack) {
    AddDicToData(data);

    var viewModel = kendo.observable({
        controls: data,
        profileId: 0,
        profileList: new kendo.data.DataSource({
            serverFiltering: true,
            transport: {
                read: "/api/settings/Presets"
            }
        }),

        onProfileSave: function (e) {

            this.onProfileSelect(e);

            $.post(
                '/api/settings/post', {
                id: this.profileId
            }, function (data) { });

        },

        onProfileSelect: function (e) {


            var refresh = false;

            var oldCan = null;
            if (e !== undefined && Number.isInteger(e)) {

                refresh = true;
                viewModel.set("profileId", e);
            }
            else
                oldCan = FPsettings.CandlesOnly;


            $.get(
                '/api/settings/get', {
                id: this.profileId
            },
                function (data) {
                    var r = data;
                    try {

                        viewModel.set("settings", r);
                        FPsettings = viewModel.settings;
                        viewModel.set("settingsVolumeVisible", r.style === "Volume");
                        viewModel.set("settingsDeltaVisible", r.style === "VolumeDelta");
                        viewModel.set("settingsRutickerVisible", r.style === "Ruticker");


                        if (refresh || FPsettings.CandlesOnly != oldCan)
                            queryClusterProfileGraph(false, ControlsToParamsFootPrint(viewModel));
                        else {
                            NP.resize();
                            //  drawGraph();                            
                        }
                    }
                    catch (e) {

                    }

                });
        },
        // market: markets[0].Value,
        settingsVisible: false,
        settingsVolumeVisible: true,
        settingsDeltaVisible: true,
        settingsRutickerVisible: true,
        timeVisible: false,
        IsPayed: IsPayed,
        periodlist: new kendo.data.DataSource({ data: data.periods }),
        rperiodlist: new kendo.data.DataSource({ data: data.rperiods }),
        markup: {
            profilePeriod: -1, color: '#F08080', width: 3, font: 12, elementid: '', text: 'Some comment', arrow: false, total: true, dockable: true,
            visible: { color: false, width: false, font: false, id: false, text: false, arrow: false, profile: false }
        },
        widths: new kendo.data.DataSource({ data: [{ Text: "1 px", Value: 1 }, { Text: "2 px", Value: 2 }, { Text: "3 px", Value: 3 }, { Text: "4 px", Value: 4 }, { Text: "5px", Value: 5 }] }),
        fonts: new kendo.data.DataSource({ data: [{ Text: "12 px", Value: 12 }, { Text: "14 px", Value: 14 }, { Text: "18 px", Value: 18 }, { Text: "24 px", Value: 24 }, { Text: "48 px", Value: 48 }] }),
        profilePeriods: new kendo.data.DataSource({
            data: [
                { Text: "Turn off", Value: -1 },
                { Text: "1 minute", Value: 1 },
                { Text: "5 minutes", Value: 5 },
                { Text: "15 minutes", Value: 15 },
                { Text: "1 hour", Value: 60 },
                { Text: "2 hours", Value: 120 },
                { Text: "4 hours", Value: 240 },
                { Text: "1 day", Value: 1440 },
                { Text: "1 week", Value: 10080 },
                { Text: "1 month", Value: 30000 }
            ]
        }),
        candleModes: new kendo.data.DataSource({
            data: [
                { Text: "Never", Value: "Never" },
                { Text: "Auto scale", Value: "Auto" },
                { Text: "Always", Value: "Always" }
            ]
        }),
        totalModes: new kendo.data.DataSource({
            data: [
                { Text: "Скрыть", Value: "Hidden" },
                { Text: "Поверх", Value: "Under" },
                { Text: "Слева", Value: "Left" }
            ]
        }),
        markupchangecolor: function () {
            NP.markupManager.updateShapeFromModel();
        },
        settings: {
            VolumesHeight: [50, 50, 50, 50, 120, 50,50],
            Default: false,
            CandlesOnly: false,
            Head: true,
            OI: true,
            OIDelta: true,
            Delta: true,
            DeltaBars: true,
            CompressToCandles: "Auto",
            totalMode: "Left",
            TopVolumes: false,
            SeparateVolume: false,
            ShrinkY: false,
            ToolTip: true,
            ExtendedToolTip: true,
            Postmarket: true,
            OpenClose: true, style:
                "Volume", deltaStyle: "Delta", classic: "ASK+BID", Contracts: true, Delta: false, oiEnable: true, horizStyle: false, Bars: false,
            volume1: 0, volume2: 0
        },

        onChange: function () {
            this.set("settingsVolumeVisible", FPsettings.style === "Volume");
            this.set("settingsRutickerVisible", FPsettings.style === "Ruticker");
            this.set("settingsDeltaVisible", FPsettings.style === "VolumeDelta");
            this.save();
            drawGraph();
        },
        onChangeReload: function () {
            this.save();
            queryClusterProfileGraph(false, ControlsToParamsFootPrint(viewModel));
        },
        onChangeVolume: function () {
            // if (this.settings.volume1 != 0 && this.settings.volume2 != 0)
            {
                if (this.settings.volume1 == this.settings.volume2)
                    this.set("settings.volume2", 0);
                var key = getMarksKey();
                if (typeof (markset[key]) == 'undefined')
                    markset[key] = { levels: {}, filters: {} };
                if ((this.settings.volume1 > this.settings.volume2 && this.settings.volume2 > 0) || (this.settings.volume1 == 0 && this.settings.volume2 != 0))
                    markset[key].filters = {
                        volume1: this.settings.volume2,
                        volume2: this.settings.volume1
                    }
                else
                    markset[key].filters = {
                        volume1: this.settings.volume1,
                        volume2: this.settings.volume2
                    }
                this.set("settings.volume1", markset[key].filters.volume1);
                this.set("settings.volume2", markset[key].filters.volume2);
                putLevelsToStorage(markset);
            }
            drawGraph();
        },
        onChangeMobile: function (e) {
            this.set("settings.style", ['Ruticker', 'ASKxBID', 'Volume'][e.sender.current().index()]);
            this.set("settingsVolumeVisible", FPsettings.style == "Volume");
            this.set("settingsDeltaVisible", FPsettings.style == "VolumeDelta");
            this.set("settingsRutickerVisible", FPsettings.style === "Ruticker");
            this.save();
            drawGraph();
        },
        refreshCandles: function () {
            this.save();
            settings = this.settings;
            c.drawcanvas();
        },
        save: function () {          
            const data = {
                Settings: JSON.stringify(this.settings),
            };


            fetch('/api/Settings/Create', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
                .then(response => response.json())
                .then(resopnse => {

                    var profileList = new kendo.data.DataSource({
                        serverFiltering: true,
                        transport: {
                            read: "/api/settings/Presets"
                        }
                    });

                    this.set("profileList", profileList);

                    this.set("profileId", resopnse);
                }
                );        
        },
        delete: function () {

            const data = {
                Settings: JSON.stringify(this.settings),
            };


            fetch('/api/Settings/Delete', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
                .then(response => response.json())
                .then(resopnse => {
                    var profileList = new kendo.data.DataSource({
                        serverFiltering: true,
                        transport: {
                            read: "/api/settings/Presets"
                        }
                    });

                    this.set("profileList", profileList);
                    this.set("profileId", resopnse);
                    this.onProfileSelect(resopnse);
                }
                );
        },

        close: function () {
            $("#window").data("kendoWindow").close();
        },
        changerperiod: function () {
            if (this.value != 'custom') {
                var s = this.controls.Dic[this.controls.rperiod];
                this.set("controls.priceStep", s.priceStep);
                this.set("controls.startDate", s.startDate);
                this.set("controls.endDate", s.endDate);
                this.set("controls.period", s.period);
                this.set("timeVisible", (this.controls.startDate == this.controls.endDate));
            }
        },
        changedate: function () {
            viewModel.set("controls.rperiod", "custom");
            var s = CheckConvertDate(this.controls.startDate, "dd.MM.yyyy");
            var e = CheckConvertDate(this.controls.endDate, "dd.MM.yyyy");
            this.set("controls.startDate", (s > e) ? e : s);
            this.set("controls.endDate", (s > e) ? s : e);

            var te = false;


            try {
                te = s.getTime() === e.getTime();
            }
            catch { }

            this.set("timeVisible", te);

            if (!te)
                this.set("timeEnable", te);

            this.set("controls.Dic['custom'].startDate", this.controls.startDate);
            this.set("controls.Dic['custom'].endDate", this.controls.endDate);
        },
        changetime: function () {
            var s = CheckConvertDate(this.controls.startTime, "HH:mm");
            var e = CheckConvertDate(this.controls.endTime, "HH:mm");
            this.set("controls.startTime", (s > e) ? e : s);
            this.set("controls.endTime", (s > e) ? s : e);
        },
        switchHR: function () {

            if (this.controls.visualVolume && c.paramshorizontal == null) {
                c.paramshorizontal = ControlsToParamsHorizontal(viewModel.controls);
                if (c.params.rperiod != c.paramshorizontal.repriod ||
                    c.params.startDate != c.paramshorizontal.startDate ||
                    c.params.endDate != c.paramshorizontal.endDate) {
                    callBack();
                    return;
                }
            } else
                c.paramshorizontal = null;
            c.SwitchHR(this.controls.visualVolume);
        },
        showSettings: function () {
            $("#window").data("kendoWindow").center().open();
            var key = getMarksKey();
            if (typeof (markset[key]) != 'undefined') {
                var filters = markset[key].filters;
                if (typeof (filters.volume1) != 'undefined') {
                    this.set("settings.volume1", filters.volume1);
                    this.set("settings.volume2", filters.volume2);
                    return;
                }
            }
            this.set("settings.volume1", 0);
            this.set("settings.volume2", 0);
        },
        close1: function () {
            var tb = $("#toolbar").data("kendoToolBar");
            tb.toggle("#Edit", true);
            mode = 'Edit';
        },
        firstOpen: true,
        showMarkUp: function () {
            if (this.firstOpen) {
                $("#window1").data("kendoWindow").wrapper.css({ top: 2, left: window.innerWidth - 610 });
                this.firstOpen = false;
            }
            $("#window1").data("kendoWindow").open();
        },
        changeticker: function () {
            //   InitControls(ControlsToParamsTicker(viewModel.controls), callBack);
            //        alert(this.controls.ticker);
            UpdateControls(this, ControlsToParamsTicker(this.controls), null);
        },
        closeCandles: function () {
            modalViewCandles.close();
        },
        closeFootPrint: function () {
            modalViewFootPrint.close();
        },
        apply: callBack
    });

    try {

        viewModel.onProfileSelect(profileId !== undefined ? profileId : 510);
    }
    catch (e) {

    }

    return viewModel;
}
function CreateViewModel(data, callBack) {
    var viewModel = CreateViewModelBase(data, callBack)
    kendo.bind($("#example"), viewModel);
    ApplyModelToControls(viewModel);
    return viewModel;
}
function CreateViewModelMobile(data, callBack) {
    var viewModel = CreateViewModelBase(data, callBack)
    ApplyModelToControls(viewModel);
    return viewModel;
}
function UpdateControls(viewModel, params, callBack) {
    $.get(sitePrefix + 'api/common/jsonChartControls', params, function (data) {
        AddDicToData(data);
        viewModel.set("controls", data);
        ApplyModelToControls(viewModel);
        //        console.log(        typeof(callBack));
        if (typeof (callBack) == 'function')
            callBack();
    });
}
function InitControls(params, callBack) {
    $.get(sitePrefix + 'jsonChartControls', params, function (data) {
        viewModel = CreateViewModel(data, callBack);
        callBack();
    });
}
