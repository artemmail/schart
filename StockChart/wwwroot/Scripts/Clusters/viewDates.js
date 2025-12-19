class viewDates extends canvasPart {

    constructor(parent, ctx, view, mtx, draggable = null) {
        super(parent, ctx, view, mtx, draggable);
    }
    onPanStart(e) {
    }
    onPan(e) {
        var s = Math.pow(1.03, -e.deltaX / 4);
        var y = 0;
        var x = this.parent.conv_mouse_xy(this.parent.panStartInfo.event.center).x;
        this.parent.translateMatrix = new Matrix.fromTriangles([x, y + 1, x + 1, y - 2, x + 2, y], [x, y + 1, x + s, y - 2, x + 2 * s, y]);
        this.parent.drawClusterView();
    }
    onPanEnd = function (e) {
        this.parent.mtx = this.parent.alignMatrix(this.parent.translateMatrix.multiply(this.parent.mtx));
        this.parent.translateMatrix = null;
    }
    onMouseWheel = function (e) {
        var s = Math.pow(1.05, e.wheelDistance);
        var x = e.offsetX;
        var y = e.offsetY;
        var m = new Matrix.fromTriangles([x, y + 1, x + 1, y - 2, x + 2, y], [x, y + 1, x + s, y - 2, x + 2 * s, y]);
        this.parent.mtx = this.parent.alignMatrix(m.multiply(this.parent.mtx));
        this.parent.drawClusterView();
    }

    onTap = function (e) {
        var p = Math.floor(this.mtx.inverse().applyToPoint(e.x, e.y).x);
        var val = this.parent.data.clusterData[p].x;
        var key = getMarksKey();
        if (typeof (markset[key]) == 'undefined')
            markset[key] = { levels: {}, dates: {}, filters: {}, dates: {} };
        var mset = markset[key].dates;
        if (typeof (mset[val]) == 'undefined')
            mset[val] = { color: '#F0E68C', comment: '' };
        else
            delete mset[val];
        putLevelsToStorage(markset);
        this.parent.drawClusterView();
    }
    onMouseMove = function (e) {
        canvas.style.cursor = 'pointer';// 'w-resize';
    }
    draw = function (parent, ctx, view, mtx) {
        var data = parent.data.clusterData;
        var fontSize = Math.max(9 * sscale, Math.min(12 * sscale, parent.getBar(mtx).w / 8));
        var textDrawStride = Math.max(1, Math.floor(12 * fontSize / parent.getBar(mtx).w));
        var textDrawStride2 = Math.max(1, Math.floor(((params.period >= 1) ?  7 : 12) * fontSize / parent.getBar(mtx).w));
        ctx.fillStyle = '#333';
        ctx.font = "" + fontSize + "px Verdana";
        ctx.textAlign = "left";
        for (var i = parent.minIndex; i <= parent.maxIndex; i++) {
            var r = parent.clusterRect(0, i, mtx);
            var v = MoscowTimeShift((data[i].x));
            var drawtime = (params.period < 1440);
            if (i % textDrawStride2 == 0 && drawtime)
                ctx.fillText(
                    (params.period >= 1) ? TimeFormat(v) : TimeFormat2(v), r.x, view.y + fontSize + 2);
            if (i % textDrawStride == 0)
                ctx.fillText(dateTools.toStr(v), r.x, view.y + (fontSize + 2) * (drawtime ? 2 : 1));
        }
    }
}

