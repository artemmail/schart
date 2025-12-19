"use strict";

var NP;
var globalvar;
var footPrintBusy = true;
var scale = isMobile2() ? window.devicePixelRatio : 1;
var sscale = Math.sqrt(scale);
var maxFontSize = 14 * scale;
var ladder;
var maxColWidth = 15;
var GraphTopSpace = 40 * scale;// 85;
var GraphBottomSpace = 50;
var GraphValuesHeight = 200;
//var SumValueByPriceWidth = 120 * sscale;

var DeltaVolumes = [0,0,0,0,0,0,0,0]

var LegendPriceWidth = 110 * sscale;
var LegendDateHeight = 40 * sscale;
var ScrollWidth = 8;
var GradientWidth = 30;
var needLogo = false;
var canvas;
var WhiteText = "#000000";
var WhiteGradient = "rgba(255,255,255,0.65)";
var RedText = "#a02000";
var Gray1 = "WhiteSmoke";
var Gray2 = "white";
var Gray3 = "#a0a";
var Gray4 = "#404040";
var Color1 = "LightSteelBlue";
var Color2 = "LightYellow";
var Black = "#000000";
var lineColor = '#888';
var mode = 'Edit';


var newTotal = true;

var    ApplyTicker = function () {
        queryClusterProfileGraph(false, ControlsToParamsFootPrint(viewModel));
    }