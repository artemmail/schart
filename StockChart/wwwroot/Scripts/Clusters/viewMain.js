class viewMain extends canvasPart {
    constructor(parent, ctx, view, mtx) {
        super(parent, ctx, view, mtx, null);
    }
    onTap(e) {
    }
    pointFromDevice(e) {
        e.x = e.offsetX;
        e.y = e.offsetY;
        e = this.mtx.inverse().applyToPoint(e.x, e.y);
        var p2 = this.parent.data.DateByColumnNumberFloat(e.x);
        return { x: p2, y: e.y };
    }
    onPanStart(e) {
        if (!this.parent.markupEnabled || this.parent.markupManager.allowPan()) {
            this.parent.translateMatrix = (new Matrix()).translate(e.deltaX * scale, e.deltaY * scale);
            this.parent.drawClusterView();
        }
    }
    onPan(e) {
        this.onPanStart(e);
    }
    onPanEnd(e) {
        if (!this.parent.markupEnabled || this.parent.markupManager.allowPan()) {
            this.parent.mtx = this.parent.alignMatrix(this.parent.translateMatrix.multiply(this.parent.mtx));
            this.parent.translateMatrix = null;
        }
    }
    onMouseDown(e) {
        if (this.parent.markupEnabled)
            this.parent.markupManager.onMouseDown({ x: e.offsetX, y: e.offsetY });
    }
    onMouseMovePressed(e) {
        if (this.parent.markupEnabled)
            this.parent.markupManager.onMouseDownMove({ x: e.offsetX, y: e.offsetY });
        //            this.parent.drawClusterView();
    }
    onMouseUp(e) {
        if (this.parent.markupEnabled)
            this.parent.markupManager.onMouseUp({ x: e.offsetX, y: e.offsetY });
        this.parent.drawClusterView();
    }
    onPinchEnd(e) {
        this.parent.mtx = this.parent.alignMatrix(this.parent.translateMatrix.multiply(this.parent.mtx));
        this.parent.translateMatrix = null;
    }
    onPinchStart(e) {
        var s = e.scale;
        var sx = Math.abs(Math.cos(e.angle * 3.14159 / 180));
        var sy = Math.abs(Math.sin(e.angle * 3.14159 / 180));
        sx = sy = s;
        var x = e.center.x;
        var y = e.center.y;
        var m = new Matrix.fromTriangles([x, y, x + 1, y + 1, x + 1, y - 1], [x, y, x + sx, y + sy, x + sx, y - sy]);
        this.parent.translateMatrix = m;
        this.parent.drawClusterView();
    }
    onPinchMove(e) {
        this.onPinchStart(e);
    }
    onMouseWheel(e) {
             this.drawHint(e);
        var s = Math.pow(1.05, e.wheelDistance);
        var x = e.offsetX;
        var y = e.offsetY;
        var m = new Matrix.fromTriangles([x, y, x + 1, y + 1, x + 1, y - 1], [x, y, x + s, y + s, x + s, y - s]);
        this.parent.mtx = this.parent.alignMatrix(m.multiply(this.parent.mtx), true);
        this.parent.drawClusterView();
   
    }
    onMouseMove(e) {

       

        //   canvas.style.cursor = 'move';// selectedPoint == null ? (mode == 'Edit' ? 'move' : 'default') : 'pointer';
        if (this.parent.markupEnabled)
            this.parent.markupManager.onMouseMove({ x: e.offsetX, y: e.offsetY });
        var p = this.mtx.inverse().applyToPoint(e.center.x, e.center.y).y;
        p = Math.round(p / this.parent.data.priceScale) * this.parent.data.priceScale;
        p = drob(p, 4);


        var point = this.mtx.inverse().applyToPoint(e.offsetX, e.offsetY);
        var n = Math.floor(point.x);
        var col = this.parent.data.clusterData[n];



        this.parent.selectedPrice = p;
        this.parent.selectedCoumn = col;


       

        this.drawHint(e);
       


        if (e.buttons == 0)
            this.parent.drawClusterView();
    }


    drawHint(offset) {
        /*

        if ( this.parent.dragMode !== null) {
            this.parent.hideHint();
            return;
        }*/

        if (!FPsettings.ToolTip)
            return;

        function item(i, val) {
            return `<li style='font-size: 12px;'><b>${i}: </b>${val}</li>`;
        }

        var point = this.mtx.inverse().applyToPoint(offset.center.x, offset.center.y);
        var n = Math.floor(point.x);
        var col = this.parent.data.clusterData[n];
        var v = MoscowTimeShift((col.x));

        var data = "";

        if ('Number' in col) {

            data += item("Number", col.Number);            
            data += item("Price", col.c);            
            data += item("Contracts", col.q);
            data += item("Direction", col.bq? "Buy":"Sell");
            data += item("Volume", MoneyToStr(col.v));        
        }
        else
        {
            data += item("Opn", col.o);
            data += item("Cls", col.c);
            data += item("Hi", col.h);
            data += item("Lo", col.l);

            if (!FPsettings.ExtendedToolTip) {
                data += item("Contracts", col.q);
                data += item("Buy", `${col.bq} (${(col.bq * 100 / col.q).toFixed(1)}%)`);
            }
            else
            {                
                if(col.bq>0)
                    data += item("Buy", `${col.bq} (${(col.bq * 100 / col.q).toFixed(1)}%)`);
                if (col.q-col.bq > 0)
                    data += item("Sell", `${col.q - col.bq} (${ ( (col.q-col.bq) * 100 / col.q).toFixed(1)}%)`);
            }


            data += item("Volume", MoneyToStr(col.v));
        }

        for (var view in this.parent.views)
        {
            var v = this.parent.views[view];
            if ('getLegendLine' in v) {
                var c = v.getLegendLine();
                data += item(c.Text, c.Value);
            }
        }
        

        //var r = this.mtx.inverse().applyToPoint(e.center.x, e.center.y).y;
        var r = (Math.round(point.y / this.parent.data.priceScale) * this.parent.data.priceScale).toFixed(6);

        

        if ('cl' in col) {            
            for (var i = 0; i < col.cl.length; i++)
            if (col.cl[i].p - r == 0)
            {
                data += "Cluster Data";
                data += item("Price", col.cl[i].p);
                data += item("Trades", col.cl[i].ct);
                data += item("Max trade", col.cl[i].mx);

                if (!FPsettings.ExtendedToolTip) {
                    data += item("Contracts", col.cl[i].q);
                    data += item("Buy", `${col.cl[i].bq} (${(col.cl[i].bq * 100 / col.cl[i].q).toFixed(1)}%)`); 
                }
                else {
                    if (col.cl[i].bq > 0)
                        data += item("Buy", `${col.cl[i].bq} (${(col.cl[i].bq * 100 / col.cl[i].q).toFixed(1)}%)`);
                    if (col.cl[i].q - col.cl[i].bq > 0)
                        data += item("Sell", `${col.cl[i].q - col.cl[i].bq} (${((col.cl[i].q - col.cl[i].bq) * 100 / col.cl[i].q).toFixed(1)}%)`);
                }

                      
            }
        }

        data += item("Date", dateTools.toStr(col.x));
        data += item("Time", TimeFormat2(col.x));
        

        

        var hint = document.getElementById("hint");

        var legenddiv = "<ul style='font-size: 10px;margin: 0; padding: 0px;list-style-type:none'>{0} </ul>";

        hint.innerHTML = legenddiv.format(data);
        hint.style.overflow = "visible";
        hint.style.display = "block";

        hint.style.left = offset.clientX + 5 + "px";
        hint.style.top = offset.clientY + 5 + "px";

        this.parent.hiddenHint = false;
    }


    onDblClick(e) {

        var ParmasFromCandle1 = function (dt, period) {
            var dt2 = new Date(dt.getTime() + (60000 * period - 1));
            var newperiod = 0;
            if (period >= 1440)
                newperiod = 5;
            else if (period >= 120)
                newperiod = 1;
            else
                newperiod = 0;
            var tickerparams =
            {
                startDate: removeUTC(dt),
                endDate: removeUTC(dt2),
                period: newperiod
            }
            return tickerparams;
        }

        var p = Math.floor(this.mtx.inverse().applyToPoint(e.center.x, e.center.y).x);
        var v = MoscowTimeShift((this.parent.data.clusterData[p].x));
        var cp = ParmasFromCandle1(v, params.period);
        cp.ticker = params.ticker,
            cp.priceStep = params.priceStep;
        cp.visualVolume = true;
      //  queryClusterProfileGraph(false, cp);

        window.open('/FootPrint?' + jQuery.param(cp))
        //OpenClusters(cp);
    }

   

    draw(parent, ctx, view, mtx) {

        if (FPsettings.ShrinkY) {
            parent.data.maxClusterQnt = parent.data.local.qntMax;
            parent.data.maxDelta = parent.data.local.maxDelta;
            parent.data.maxClusterQntAsk = parent.data.local.qntAskMax;
            parent.data.maxClusterQntBid = parent.data.local.qntBidMax;


            parent.data.maxClusterVol = parent.data.local.volMax;
            parent.data.maxDeltaV = parent.data.local.maxDeltaV;
            parent.data.maxClusterVolAsk = parent.data.local.volAskMax;
            parent.data.maxClusterVolBid = parent.data.local.volBidMax;


            parent.data.maxDens = parent.data.local.maxDens;
            parent.data.maxQuantityAsk = parent.data.local.maxQuantityAsk;
            parent.data.maxQuantityBid = parent.data.local.maxQuantityBid;
            parent.data.maxQuantity = parent.data.local.maxQuantity;
        }

        let Bars = ('Bars' in FPsettings) && FPsettings.Bars;

        var ColumnBuilder;

        if (!parent.data.ableCluster() || ('CompressToCandles' in FPsettings)
            && (FPsettings.CompressToCandles == "Always" ||
                (FPsettings.CompressToCandles == "Auto" && parent.getBar(mtx).w < maxColWidth))) {
            ColumnBuilder = Bars ?
                new BarColumn(parent, ctx, view, mtx) : new CandleColumn(parent, ctx, view, mtx);
        }
        else              
        switch (FPsettings.style) {
            case 'Ruticker':
                ColumnBuilder = new ClassicColumn(parent, ctx, view, mtx);
                break;
            case 'Volume':
                ColumnBuilder = new VolfixColumn(parent, ctx, view, mtx);
                break;
            case 'ASKxBID':
                ColumnBuilder = new MarketDeltaColumn(parent, ctx, view, mtx);
                break;
            case 'Density':
                ColumnBuilder = new DensityDeltaColumn(parent, ctx, view, mtx);
                break;
            case 'VolumeDelta':
                ColumnBuilder = FPsettings.deltaStyle == 'Delta'
                    ? new VolumeDeltaColumn(parent, ctx, view, mtx) : new DeltaVolumeColumn(parent, ctx, view, mtx);
                break;          
        }
             
        var data = parent.data.clusterData;


        if (params.period == 0) {
            var s = Math.max(0, parent.minIndex - 1);
            ctx.beginPath();


            for (var i = s; i <= Math.min(parent.data.clusterData.length - 1, 1 + parent.maxIndex); i++) {
                var p = mtx.applyToPoint(i + 0.5, data[i].c);
                if (i == s)
                    ctx.moveTo(p.x, p.y)
                else
                    ctx.lineTo(p.x, p.y);

                if (data[i].q === data[i].bq)
                    this.ctx.fillStyle = 'green';
                else
                    this.ctx.fillStyle = 'red';

                ctx.myFillRectSmooth({ x: p.x - 3, y: p.y - 3, w: 6, h: 6 });
            }
            ctx.stroke();
            return;
        }

        

        for (var i = parent.minIndex; i <= parent.maxIndex; i++) 
            ColumnBuilder.draw(data[i], i, mtx);                        
    }
}

