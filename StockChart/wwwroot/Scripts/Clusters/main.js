class newFootPrint {
    conv_mouse_xy(point) {
        var r = this.canvas.getBoundingClientRect();
        return {
            x: Math.round((point.x - r.left) * scale),
            y: Math.round((point.y - r.top) * scale)
        }
    }

    onMouseOut(p) {
        this.hideHint();
    }

    hideHint() {
        this.hiddenHint = true;
        this.selectedPrice = null;
        this.hint.style.overflow = "hidden";
        this.hint.style.display = "none";
    }



    onPinchStart(point) {
        this.hideHint();
        point.center = this.conv_mouse_xy(point.center);
        for (var view in this.views)
            if ('onPinchStart' in this.views[view] && this.views[view].checkPoint(point.center))
                this.views[view].onPinchStart(point);
    }
    onPinchMove(point) {
        point.center = this.conv_mouse_xy(point.center);
        for (var view in this.views)
            if ('onPinchMove' in this.views[view])
                this.views[view].onPinchMove(point);
    }
    onPinchEnd(point) {
        point.center = this.conv_mouse_xy(point.center);
        for (var view in this.views)
            if ('onPinchEnd' in this.views[view])
                this.views[view].onPinchEnd(point);
    }
    onPanStart(event) {
        if (this.dragMode != null) return;
        for (var view in this.views)
            if ('onPanStart' in this.views[view])
                if (this.views[view].checkPoint(this.conv_mouse_xy(event.center))) {
                    this.panStartInfo = { event: event, view: this.views[view] }
                }
    }
    onPan(event) {
        if (this.dragMode != null) return;
        if (this.panStartInfo != null)
            this.panStartInfo.view.onPan(event);
    }
    onPanEnd(event) {
        if (this.dragMode != null) return;
        if (this.panStartInfo != null) {
            this.panStartInfo.view.onPanEnd(event);
            this.panStartInfo = null;
        }
    }
    onMouseMove(point) {



        if (this.dragMode !== null)
            return;
        canvas.style.cursor = 'default';
        point.center = this.conv_mouse_xy({ x: point.clientX, y: point.clientY });
        //this.selectedPrice = null;

        if (!this.viewMain.checkPoint(point.center)) {
            this.onMouseOut(point);
        }

        for (var v = 0; v < this.views.length; v++) {
            if (this.views[v].checkDraggable(point.center)) {
                var part = this.views[v].draggable;
                if (part === 'left' || part === 'right')
                    canvas.style.cursor = 'w-resize';
                else
                    canvas.style.cursor = 's-resize';
                return;
            }
        }
        //                this.views[view].onMouseMove(point);
        for (var view in this.views)
            if ('onMouseMove' in this.views[view] && this.views[view].checkPoint(point.center)) {
                this.selectedView = this.views[view];
                this.selectedPoint = point;
                this.onMouseOut(point);
                this.views[view].onMouseMove(point);
            }
    }
    onMouseMovePressed(point) {
        this.hideHint();

        //    canvas.style.cursor = 'default';
        point.center = this.conv_mouse_xy({ x: point.clientX, y: point.clientY });

        if (this.dragMode != null) {
            var part = this.resizeable[this.dragMode].draggable;

            var Delta = (part === 'left' || part === 'right') ?
                point.center.x - this.pressd.x :
                this.pressd.y - point.center.y;

            if (FPsettings.VolumesHeight[this.dragMode] + Delta > 10)
                DeltaVolumes[this.dragMode] = Delta;

            this.translateMatrix = (new Matrix()).translate(0, 0);
            this.drawClusterView();
            return;
        }

        for (var view in this.views)
            if ('onMouseMovePressed' in this.views[view] && this.views[view].checkPoint(point.center))
                this.views[view].onMouseMovePressed(point);
    }
    dragMode = null;

    onMouseDown(point) {
        this.hideHint();

        point.center = this.conv_mouse_xy({ x: point.clientX, y: point.clientY });
        for (var v in this.views)
            if (this.views[v].checkDraggable(point.center)) {


                this.pressd = point.center;

                for (var x = 0; x < this.resizeable.length; x++)
                    if (this.views[v] === this.resizeable[x])
                        this.dragMode = x;



                return;

            }
        for (var view in this.views)
            if ('onMouseDown' in this.views[view] && this.views[view].checkPoint(point.center))
                this.views[view].onMouseDown(point);
    }

    onMouseUp(point) {

        if (this.dragMode != null) {
            FPsettings.VolumesHeight[this.dragMode] += DeltaVolumes[this.dragMode];
            DeltaVolumes[this.dragMode] = 0;
            this.dragMode = null;
            viewModel.save();
            return;
        }




        point.center = this.conv_mouse_xy({ x: point.clientX, y: point.clientY });
        for (var view in this.views)
            if ('onMouseUp' in this.views[view] && this.views[view].checkPoint(point.center))
                this.views[view].onMouseUp(point);

        this.drawClusterView();
    }
    onTap(event) {
        var point = event.pointers[0];
        var point = this.conv_mouse_xy({ x: point.clientX, y: point.clientY });
        for (var view in this.views)
            if ('onTap' in this.views[view] && this.views[view].checkPoint(point))
                this.views[view].onTap(point);
    }
    onDblClick(point) {
        point.center = this.conv_mouse_xy({ x: point.clientX, y: point.clientY });
        for (var view in this.views)
            if ('onDblClick' in this.views[view] && this.views[view].checkPoint(point.center))
                this.views[view].onDblClick(point);
    }
    onRightClick(point) {
        for (var view in this.views)
            if ('onRightClick' in this.views[view] && this.views[view].checkPoint({ x: point.offsetX, y: point.offsetY })) {
                this.views[view].onRightClick(point);
                return true;
            }
        return false;
    }
    onMouseWheel(point) {
        point.center = this.conv_mouse_xy({ x: point.clientX, y: point.clientY });
        for (var view in this.views)
            if ('onMouseWheel' in this.views[view] && this.views[view].checkPoint({ x: point.offsetX, y: point.offsetY }))
                this.views[view].onMouseWheel(point);
    }

    addhint() {
        if (document.getElementById('hint') == null) {
            var element = document.createElement('div');
            element.id = 'hint';
            document.body.appendChild(element);
            //         this.canvas.parentNode.appendChild(element);
        }
        this.hint = document.getElementById("hint");
    }



    constructor(initdata) {
        this.translateMatrix = null;
        this.hiddenHint = true;
        this.markupEnabled = true;
        try {
            this.markupManager = new MarkUpManager(viewModel, this);
        }
        catch (e) {
            console.log('markup error');
            this.markupEnabled = false;
        }
        this.clusterWidthScale = 0.97;
        this.panStartInfo = null;
        this.data = new clusterData(initdata);
        //this.calcPrices();
        this.canvas = document.getElementById("graph");
        this.ctx = this.canvas.getContext('2d');



        this.addhint();

        this.initSize();
    };

    GetCSV() {
        if (!IsPayed)
            alert('Доступно в Для премиум пользователей');

        if (params.period == 0) {
            alert('Невозможно скачать тиковый график. Есть возможность купить базу данных всех сделок');
            return;
        }

        if (confirm("Сохранить свечи в формате CSV (Можно использовать в Excel)?")) {
            var out = "Date;Opn;High;Low;Close;Volume;BidVolume;Quantity;";
            if (this.data.clusterData[0].oi > 0)
                out += "OpenPositions;"
            out += "\n";
            for (var i = 0; i < this.data.clusterData.length; i++) {
                var candle = this.data.clusterData[i];
                out += jDateToStr(candle.x) + ";" + candle.o + ";" + candle.h + ";" + candle.l + ";" + candle.c + ";" + candle.v + ";" + candle.bv + ";" + candle.q + ";";
                if (candle.oi != 0)
                    out += candle.oi + ";";
                out += "\n";
            }

            saveAs(new Blob([out], {
                type: "text/plain;charset=" + document.characterSet
            }), params.ticker + "_" + jDateToStrD(params.startDate) + "-" + jDateToStrD(params.endDate) + "_" + params.period + ".csv");
        }
    }

    createParts() {
        this.genViews();
        var mtx = this.mtxMain;
        this.views = [];



        this.viewBackground1 = new viewBackground1(this, this.ctx, this.clusterTotalViewFill, this.mtxMain);
        if (('totalMode' in FPsettings) && (FPsettings.totalMode == "Left") && this.data.ableCluster())
            this.views.push(this.viewBackground1);


        


        this.views.push(this.viewPrices = new viewPrices(this, this.ctx, this.clusterPricesView, this.mtxprice));

        this.views.push(this.viewBackground = new viewBackground(this, this.ctx, this.clusterView, this.mtxMain));

        this.views.push(this.viewDates = new viewDates(this, this.ctx, this.clusterDatesView, this.mtxMain,
         /*   FPsettings.SeparateVolume ? 'top' :*/ null));

        if (FPsettings.Head) {
            this.views.push(this.viewHead = new viewHead(this, this.ctx, this.clusterHeadView, this.mtxhead));
            this.views.push(this.viewAnim = new viewAnim(this, this.ctx, this.clusterAnimArea, this.mtxanim));
        }


        this.views.push(this.viewMain = new viewMain(this, this.ctx, this.clusterView, this.mtxMain));

        if (FPsettings.SeparateVolume)
            this.views.push(this.viewVolumes = new viewVolumesSeparated(this, this.ctx, this.clusterVolumesView, this.mtxMain));
        else
            this.views.push(this.viewVolumes = new viewVolumes(this, this.ctx, this.clusterVolumesView, this.mtxMain));


        //this.views.push(this.viewVolumes = new viewVolumes(this, this.ctx, this.clusterVolumesView, this.mtxMain));
        this.viewTotal = new viewTotal(this, this.ctx, this.clusterTotalViewFill, this.mtxtotal)
        if (('totalMode' in FPsettings) && (FPsettings.totalMode != "Hidden") && this.data.ableCluster())
            this.views.push(this.viewTotal);
        this.views.push(this.viewScrollBars = new viewScrollBars(this, this.ctx, this.clusterView, this.mtxMain));

        //  this.views.push(this.viewOI = new viewOI(this, this.ctx, this.clusterBottomVolumes, this.mtxMain));



        if (this.data.ableOI() && FPsettings.OI) {
            this.views.push(this.viewOI = new viewOI(this, this.ctx, this.clusterOIView, this.mtxMain));
        }

        if (this.data.ableOI() && FPsettings.OIDelta) {
            this.views.push(this.viewOIDelta = new viewOIDelta(this, this.ctx, this.clusterOIDeltaView, this.mtxMain));
        }

        if (FPsettings.Delta) {
            this.views.push(this.viewDelta = new viewDelta(this, this.ctx, this.clusterDeltaView, this.mtxMain));
        }

        if (FPsettings.DeltaBars) {
            this.views.push(this.viewDeltaBars = new viewDeltaBars(this, this.ctx, this.clusterDeltaBarsView, this.mtxMain));
        }

        /*
        this.resizeable = [];

        for (var v in this.views)
            if (this.views[v].draggable != null)
                this.resizeable.push(this.views[v]);

        if (this.draggable == null)
        */

        this.resizeable = [this.viewVolumes, this.viewOI, this.viewDelta, this.viewOIDelta, this.viewTotal, this.viewDeltaBars];
    }
    IsPriceVisible() { return Math.floor(this.mtxMain.inverse().applyToPoint(this.clusterView.x + this.clusterView.w, 0).x) >= this.data.clusterData.length - 1; }
    IsStartVisible() { return Math.floor(this.mtxMain.inverse().applyToPoint(this.clusterView.x, 0).x) <= 0; }





    animation(init) {
        var c = this.parent.mtx.clone();
      //  var init = this.parent.getInitMatrix(this.parent.clusterView, this.parent.data);
        var me = this.parent;
        var stime = (new Date()).getTime();
        var myTimer = setInterval(function () {
            var t = ((new Date()).getTime() - stime) / 800;
            t = t > 1 ? 1 : t;
            me.mtx = c.interpolateAnim(init, t);
            me.drawClusterView();
            if (t == 1)
                clearInterval(myTimer);
            t += 0.01;
        }, 25);
    }



    mergeMatrix() {
        var v = this.clusterView;
        if (this.data.clusterData.length < 12)
            this.mtx = this.mtx.reassignX({ x1: 0, x2: this.data.clusterData.length }, { x1: v.x, x2: v.x + v.w });
        else {
            var x = this.mtx.applyToPoint(this.data.clusterData.length, 0).x;
            this.mtx = this.mtx.getTranslate(v.x + v.w - x, 0)
        }

        /*

        if (('ShrinkY' in FPsettings) && FPsettings.ShrinkY && !!this.data.local.maxPrice) {
            this.getMinMaxIndex(matrix);
            var dp = (this.data.local.maxPrice - this.data.local.minPrice) / 10;
            matrix = matrix.reassignY({ y1: this.data.local.maxPrice + dp, y2: this.data.local.minPrice - dp }, { y1: v.y, y2: v.y + v.h });
        }*/

    }

    isWrongMerge(data) {

       return this.data.clusterData[this.data.clusterData.length - 1].x < data.clusterData[0].x
    }

    mergeData(data) {
        if (data == "")
            return;
        var IsVis = this.IsPriceVisible();
        var needMerge = this.data.mergeData(data);
        if (IsVis && needMerge)
            this.mergeMatrix();
        
        this.drawClusterView();
    }

    getBar(mtx) {
        var p1 = mtx.applyToPoint(0, 0);
        var p2 = mtx.applyToPoint(1, this.data.priceScale);
        return { w: p2.x - p1.x, h: p2.y - p1.y };
    }
    clusterRect(price, columnNumber, mtx) {
        var p1 = mtx.applyToPoint(columnNumber, price - this.data.priceScale / 2);
        var p2 = mtx.applyToPoint(columnNumber + 1, price + this.data.priceScale / 2);
        return { x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y };
    }
    clusterRect2(price, columnNumber, w, mtx) {
        var p1 = mtx.applyToPoint(columnNumber, price - this.data.priceScale / 2);
        var p2 = mtx.applyToPoint(columnNumber + w, price + this.data.priceScale / 2);
        return { x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y };
    }
    clusterFontSize(mtx, textLen) {
        return this.clusterRectFontSize(this.clusterRect(0, 0, mtx), textLen)
    }
    clusterRectFontSize(rect, textLen) {
        var w = Math.abs(rect.w);
        var h = Math.abs(rect.h);
        return Math.min(h - 1, w / textLen, maxFontSize);
    }
    getMinMaxIndex(mtx) {
        var data = this.data.clusterData;
        this.minIndex = data.length - 1;
        this.maxIndex = 0;
        var finishPrice = mtx.Height2Price(this.clusterTotalView.y - 100);
        var startPrice = mtx.Height2Price(this.clusterTotalView.y + this.clusterTotalView.h + 100);
        this.finishPrice = Math.floor(finishPrice / this.data.priceScale) * this.data.priceScale;
        this.startPrice = Math.floor(startPrice / this.data.priceScale) * this.data.priceScale;
        for (var i = 0; i < data.length; i++) {
            var r = this.clusterRect(/*data[i].cl[0].p*/ 1, i, mtx);
            if (!(r.x + r.w < this.clusterView.x || r.x > this.clusterView.x + this.clusterView.w)) {
                this.minIndex = Math.min(this.minIndex, i);
                this.maxIndex = Math.max(this.maxIndex, i);
            }
        }
        if (FPsettings.ShrinkY)
            this.data.maxFromPeriod(this.minIndex, this.maxIndex);
    }
    getInitMatrix(view, data) {
        var len = Math.floor(view.w / 10);
        var len2 = Math.floor(view.w / 100);
        var firstCol = Math.max(data.clusterData.length - ((FPsettings.CompressToCandles == "Always" || FPsettings.CandlesOnly) ? len : len2), 0);
        var h = view.h / 30;
        var to = [view.x, view.y, view.x, view.y + view.h, view.x + view.w, view.y + view.h / 2];
        var from = [firstCol, data.lastPrice + data.priceScale * h, firstCol, data.lastPrice - data.priceScale * h, data.clusterData.length, data.lastPrice];
        return this.alignMatrix(Matrix.fromTriangles(from, to));
    }

    hiddenTotal() {

        return ('totalMode' in FPsettings) && (FPsettings.totalMode == "Hidden") && this.data.ableCluster();

    }

    genViews() {
        if (!('totalMode' in FPsettings))
            FPsettings.totalMode = 'Left';
        var newTotal = (('totalMode' in FPsettings) && (FPsettings.totalMode == "Under")) || !this.data.ableCluster();
        var hidden = this.hiddenTotal();
        var totalLen = hidden ? 0 : FPsettings.VolumesHeight[4];
        GraphTopSpace = FPsettings.Head ? this.topLinesCount() * 20 * sscale : 0;
        var CanvasWidth = this.canvas.width;
        var CanvasHeight = this.canvas.height;
        var VolumesH = /*FPsettings.VolumesHeight +*/[DeltaVolumes[0], DeltaVolumes[1], DeltaVolumes[2], DeltaVolumes[3], DeltaVolumes[5]];

        if (FPsettings.SeparateVolume) {
            VolumesH[0] += FPsettings.VolumesHeight[0];
        }

        if ((this.data.ableOI() && FPsettings.OI)) {
            VolumesH[1] += FPsettings.VolumesHeight[1];
        }

        if (FPsettings.Delta) {
            VolumesH[2] += FPsettings.VolumesHeight[2];
        }

        if (FPsettings.DeltaBars) {
            VolumesH[4] += FPsettings.VolumesHeight[5];
        }

        if ((this.data.ableOI() && FPsettings.OIDelta)) {
            VolumesH[3] += FPsettings.VolumesHeight[3];
        }



        var totalVH = VolumesH[0] + VolumesH[1] + VolumesH[2] + VolumesH[3] + VolumesH[4];

        this.clusterView = {
            x: totalLen + DeltaVolumes[4],
            y: GraphTopSpace,
            w: CanvasWidth - LegendPriceWidth - totalLen - DeltaVolumes[4],
            h: CanvasHeight - LegendDateHeight - GraphTopSpace - totalVH
        };
        if (newTotal) {
            this.clusterView.x = 0;
            this.clusterView.w = CanvasWidth - LegendPriceWidth;
        }
        GraphValuesHeight = Math.abs(this.clusterView.h / 7);
        this.clusterHeadView = { x: totalLen + DeltaVolumes[4], y: 0, w: this.clusterView.w, h: GraphTopSpace };
        if (newTotal) {
            this.clusterHeadView = { x: 0, y: 0, w: this.clusterView.w, h: GraphTopSpace };
        }
        this.clusterVolumesView = CloneObject(this.clusterView);
        this.clusterVolumesView.y += (this.clusterVolumesView.h - GraphValuesHeight);
        this.clusterVolumesView.h = GraphValuesHeight;
        this.clusterTotalView = { x: 0, y: GraphTopSpace, w: totalLen + DeltaVolumes[4] - ScrollWidth, h: this.clusterView.h };
        this.clusterTotalViewFill = { x: 0, y: GraphTopSpace, w: totalLen + DeltaVolumes[4], h: this.clusterView.h };
        this.clusterPricesView = { x: this.clusterView.w + this.clusterView.x, w: CanvasWidth - (this.clusterView.w + this.clusterView.x), y: this.clusterTotalView.y, h: this.clusterTotalView.h };
        this.clusterDatesView = {
            x: this.clusterView.x,
            w: this.clusterView.w,
            y: this.clusterView.y + this.clusterView.h,
            h: CanvasHeight - (this.clusterView.y + this.clusterView.h) - totalVH
        };
        this.clusterAnimArea = { x: this.clusterHeadView.w + this.clusterHeadView.x, y: this.clusterHeadView.y, h: this.clusterHeadView.h, w: this.clusterPricesView.w };

        if (FPsettings.SeparateVolume)
            this.clusterVolumesView = {
                x: this.clusterView.x,
                y: this.clusterDatesView.y + this.clusterDatesView.h,
                w: this.clusterView.w,
                h: VolumesH[0]
            };

        if (FPsettings.SeparateVolume)
            this.clusterOIView = {
                x: this.clusterView.x,
                y: this.clusterVolumesView.y + this.clusterVolumesView.h,
                w: this.clusterView.w,
                h: VolumesH[1]
            };
        else
            this.clusterOIView = {
                x: this.clusterView.x,
                y: this.clusterDatesView.y + this.clusterDatesView.h,
                w: this.clusterView.w,
                h: VolumesH[1]
            };

        this.clusterDeltaView = {
            x: this.clusterView.x,
            y: this.clusterOIView.y + this.clusterOIView.h,
            w: this.clusterView.w,
            h: VolumesH[2]
        };

        this.clusterDeltaBarsView = {
            x: this.clusterView.x,
            y: this.clusterDeltaView.y + this.clusterDeltaView.h,
            w: this.clusterView.w,
            h: VolumesH[4]
        };

        this.clusterOIDeltaView = {
            x: this.clusterView.x,
            y: this.clusterDeltaBarsView.y + this.clusterDeltaBarsView.h,
            w: this.clusterView.w,
            h: VolumesH[3]
        };

        

    }
    initSize() {
        this.alignCanvas();
        this.genViews();
        this.mtx = this.getInitMatrix(this.clusterView, this.data);
        this.drawClusterView();
    }
    resize() {
        var oldX = this.clusterView.x + this.clusterView.w;
        var oldY = this.clusterView.y + this.clusterView.h / 2;
        this.alignCanvas();
        this.genViews();
        var newX = this.clusterView.x + this.clusterView.w;
        var newY = this.clusterView.y + this.clusterView.h / 2;
        this.mtx = this.alignMatrix(this.mtx.getTranslate(newX - oldX, newY - oldY));
        this.drawClusterView();
    }
    alignCanvas() {
        canvas = this.canvas;// document.getElementById("graph");
        var x = window.innerHeight;
        var h = Math.max(220, x - canvas.getBoundingClientRect().top - 4);
        if (isMobile2()) {
            var parent = canvas.parentElement.getBoundingClientRect();
            var w = Math.floor(parent.width);
            var h = Math.floor(window.innerHeight - parent.top) - 4;
            canvas.style.height = h + 'px';
            canvas.style.width = w + 'px';
            canvas.height = Math.floor(h * scale);
            canvas.width = Math.floor(w * scale);
        }
        else {
            var value = window.innerWidth - 10;
            value = canvas.parentElement.clientWidth - 10;
            canvas.width = value;
            canvas.height = h;
        }
    }
    alignMatrix(matrix, alignprice = false) {
        var v = CloneObject(this.clusterView);

        //var vis = Math.floor(matrix.inverse().applyToPoint(this.clusterView.x + this.clusterView.w, 0).x) >= this.data.clusterData.length - 1;
        if (('MaxTrades' in FPsettings) && FPsettings.MaxTrades) {
            let del = (matrix.applyToPoint(1, 0).x - matrix.applyToPoint(0, 0).x) / 5;
            v.x += del;
            v.w -= del;
        }
        var x1 = matrix.applyToPoint(0, 0).x;
        var x2 = matrix.applyToPoint(this.data.clusterData.length, 0).x;
        var dp = (this.data.maxPrice - this.data.minPrice) / 10;
        var y1 = matrix.applyToPoint(0, this.data.maxPrice + dp).y;
        var y2 = matrix.applyToPoint(0, this.data.minPrice - dp).y;
        var deltaX = 0;
        var deltaY = 0;
        if (x2 - x1 < v.w)
            matrix = matrix.reassignX({ x1: 0, x2: this.data.clusterData.length }, { x1: v.x, x2: v.x + v.w });
        else {
            if (x1 > v.x)
                deltaX = v.x - x1;
            if (x2 < v.x + v.w)
                deltaX = v.x + v.w - x2;
        }
        if (y2 - y1 < v.h)
            matrix = matrix.reassignY({ y1: this.data.maxPrice + dp, y2: this.data.minPrice - dp }, { y1: v.y, y2: v.y + v.h });
        else {
            if (y1 > v.y)
                deltaY = v.y - y1;
            if (y2 < v.y + v.h)
                deltaY = v.y + v.h - y2;
        }
        if (deltaX != 0 || deltaY != 0)
            matrix = matrix.getTranslate(deltaX, deltaY);

        this.getMinMaxIndex(matrix);

        if (('ShrinkY' in FPsettings) && FPsettings.ShrinkY && !!this.data.local.maxPrice) {
            var dp = (this.data.local.maxPrice - this.data.local.minPrice) / 10;
            matrix = matrix.reassignY({ y1: this.data.local.maxPrice + dp, y2: this.data.local.minPrice - dp }, { y1: v.y, y2: v.y + v.h });
        }

        try {
            if (alignprice && this.IsPriceVisible()) {
                var xx = matrix.applyToPoint(this.data.clusterData.length, 0).x;
                matrix = matrix.getTranslate(v.x + v.w - xx, 0);
            }
        } catch (e) { }
        // return;


        return matrix;
    }
    topLinesCount() {
        var x = (this.topVolumes() ? 1 : 0) + (this.oiEnable() ? 1 : 0) + 2;
        return x;
    }
    topVolumes() {
        return (('TopVolumes' in FPsettings) && FPsettings.TopVolumes);
    }
    oiEnable() {
        return (('oiEnable' in FPsettings) && FPsettings.oiEnable && this.data.maxAbsOIDelta > 0);
    }
    drawClusterView() {

        var ctx = this.ctx;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.data.clusterLength() < 1) {
            ctx.font = "bold 16px Verdana";
            ctx.fillStyle = Black;
            ctx.fillText("НЕТ ДАННЫХ", this.canvas.width * 0.5, 30);
            return;
        }
        this.mtxMain = this.mtx.clone();
        if ('translateMatrix' in this && this.translateMatrix != null) {
            var t = this.translateMatrix.clone();
            t.multiply(this.mtxMain);
            this.mtxMain = this.alignMatrix(t);
        }
        var mtx = this.mtxMain;
        this.mtxtotal = mtx.reassignX({ x1: 0, x2: 1 }, { x1: this.clusterTotalView.x, x2: this.clusterTotalView.x + this.clusterTotalView.w });
        this.mtxprice = mtx.reassignX({ x1: 0, x2: this.clusterPricesView.w }, { x1: this.clusterPricesView.x, x2: this.clusterPricesView.x + this.clusterPricesView.w });
        if (FPsettings.Head) {
            this.mtxhead = mtx.reassignY({ y1: 0, y2: this.topLinesCount() }, { y1: this.clusterHeadView.y, y2: this.clusterHeadView.y + this.clusterHeadView.h });
            this.mtxanim = this.mtxprice.reassignY({ y1: this.clusterAnimArea.y, y2: this.clusterAnimArea.y + this.clusterAnimArea.h }, { y1: this.clusterAnimArea.y, y2: this.clusterAnimArea.y + this.clusterAnimArea.h });
        }
        this.createParts();
        this.getMinMaxIndex(this.mtxMain);
        for (var view in this.views)
            this.views[view].drawCanvas();
    }
}
