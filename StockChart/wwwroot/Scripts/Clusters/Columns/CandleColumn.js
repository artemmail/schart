class CandleColumn extends ClusterCoumnBase {
    constructor(parent, ctx, view, mtx) {
        super(parent, ctx, view, mtx, null);
    }
    draw(column, number, mtx) {
        var ctx = this.ctx;
        //  var Max = Math.max.apply(0, column.p);
        // var Min = Math.min.apply(0, column.p);
        ctx.fillStyle = (column.o > column.c) ?
            ((column == this.parent.selectedCoumn) ? redcandlesat : redcandle) :
            ((column == this.parent.selectedCoumn) ? greencandlesat : greencandle);
        ctx.beginPath();
        var r1 = mtx.price2Height(column.h, number, mtx);
        var r2 = mtx.price2Height(column.l, number, mtx);
        r1.w = this.getBar(mtx).w;
        ctx.myLine(r1.x + r1.w / 2, r1.y, r1.x + r1.w / 2, r2.y);
        ctx.stroke();
        var r1 = mtx.price2Height(column.o, number, mtx);
        r1.w = this.getBar(mtx).w;
        var r2 = mtx.price2Height(column.c, number, mtx);
        ctx.strokeStyle = (column.o > column.c) ? redCandleBorder : greenCandleBorder;
        var nr = { x: r1.x  + r1.w*0.15 , w: r1.w*0.7 , y: r2.y, h: r1.y - r2.y };
        ctx.myFillRect(nr);
        ctx.myStrokeRect(nr);
        if (!!column.cl)
        for (var i = 0; i < column.cl.length; i++) {
            var r = this.clusterRect(column.cl[i].p, number, mtx);
            r.x += r.w / 2;
            this.drawMaxVolumeRect(r, column, i);
        }
    }
}

