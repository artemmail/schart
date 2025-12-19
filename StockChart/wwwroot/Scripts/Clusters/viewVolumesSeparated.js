var rounder = function (num) {
    let x = Math.pow(10, Math.round(Math.log10(num)));
    return (2 * x - num < num - x) ? 2 * x : (num - 0.5 * x < x - num) ? x * 0.5 : x;
}
var rrounder = function (x, r) {
    return Math.floor(x / r) * r;
};

class viewVolumesSeparated extends canvasPart {
    constructor(parent, ctx, view, mtx) {
        super(parent, ctx, view, mtx, 'top');
        this.data = parent.data;
    }
    onPanStart(e) {
        if (!this.parent.markupEnabled || this.parent.markupManager.allowPan()) {
            this.parent.translateMatrix = (new Matrix()).translate(e.deltaX * scale, 0);
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

    onMouseWheel = function (e) {
        var s = Math.pow(1.05, e.wheelDistance);
        var x = e.offsetX;
        var y = e.offsetY;
        var m = new Matrix.fromTriangles([x, y + 1, x + 1, y - 2, x + 2, y], [x, y + 1, x + s, y - 2, x + 2 * s, y]);
        this.parent.mtx = this.parent.alignMatrix(m.multiply(this.parent.mtx));
        this.parent.drawClusterView();
    }

   

    draw(parent, ctx, view, mtx) {


        if (FPsettings.Contracts) {
            this.maxQuantity = this.data.maxQuantity;
            this.maxQuantityAsk = this.data.maxQuantityAsk;
            this.maxQuantityBid = this.data.maxQuantityBid;
        }
        else {
            this.maxQuantity = this.data.maxVolume;
            this.maxQuantityAsk = this.data.maxVolumeAsk;
            this.maxQuantityBid = this.data.maxVolumeBid;
        }


        if (FPsettings.ShrinkY) {
            if (FPsettings.Contracts) {
                this.maxQuantity = this.data.local.q;
                this.maxQuantityAsk = this.data.local.bq;
                this.maxQuantityBid = this.data.local.sq;
            } else {
                this.maxQuantity = this.data.local.v;
                this.maxQuantityAsk = this.data.local.bv;
                this.maxQuantityBid = this.data.local.sv;
            }
        }

      

        ctx.restore();

        this.DrawZebra(ctx, view.x, view.y, view.w, view.h, 0, this.maxQuantity);

        ctx.save();
        this.ctx.beginPath();
        this.ctx.myRect(this.view);
        this.ctx.clip();

        this.drawVolumeColumn = this.drawVolumeColumnTotal;
      

        if (FPsettings.style != 'Volume')
            switch (FPsettings.classic) {
                case 'ASK':
                    this.drawVolumeColumn = this.drawVolumeColumnAsk;
                    this.maxQuantity = this.maxQuantityAsk;
                    break;
                case 'BID':
                    this.drawVolumeColumn = this.drawVolumeColumnBid;
                    this.maxQuantity = this.maxQuantityBid;
                    break;
                case 'ASK/BID':
                    this.drawVolumeColumn = this.drawVolumeColumnAskBid;
                    this.maxQuantity = Math.max(this.maxQuantityAsk, this.maxQuantityBid);
                    break;
                default:
                    this.drawVolumeColumn = this.drawVolumeColumnTotal;
                  //  this.maxQuantity = this.maxQuantity;
                    break;
            }

        this.maxQuantity *= 1.1;

  
        mtx = mtx.reassignY({ y1: 0, y2: this.maxQuantity }, { y2: view.y, y1: view.y + view.h });
        ctx.setMatrix(mtx);
        var data = parent.data.clusterData;

        this.drawVertical();


        for (var i = parent.minIndex; i <= parent.maxIndex; i++)
      //  if (data[i] == parent.selectedCoumn)
        {
            //if (parent.drawVolumeColumn)
            this.drawVolumeColumn(data[i], i, mtx);
        }
    }

    volumeRect(volume, columnNumber, mtx) {
        var p1 = mtx.applyToPoint(columnNumber, 0);
        var p2 = mtx.applyToPoint(columnNumber + 1, volume);
        return { x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y };
    }

    setQ(column) {
        this.q = (FPsettings.Contracts) ? column.q : column.v;
        this.bq = (FPsettings.Contracts) ? column.bq : column.bv;
    }


    drawVolumeColumnTotal(column, number, mtx) {
        this.setQ(column);   
        var ctx = this.ctx;
        ctx.fillStyle = (column == this.parent.selectedCoumn) ? greencandlesat : greencandle;
        ctx.mFillRectangle(number+0.1, 0, 0.8, this.bq);
        ctx.fillStyle = (column == this.parent.selectedCoumn) ? redcandlesat : redcandle;
        ctx.mFillRectangle(number + 0.1, this.bq, 0.8, this.q - this.bq);
    }

    drawVolumeColumnAsk(column, number, mtx) {
        this.setQ(column);
        var r = this.parent.clusterRect(0, number, mtx);
        this.ctx.fillStyle = (column == this.parent.selectedCoumn) ? greencandlesat : greencandle;;
        this.ctx.mFillRectangle(number+0.1, 0, 0.8, this.bq);
        var p1 = mtx.applyToPoint(0, this.bq);
    }
    drawVolumeColumnBid(column, number, mtx) {
        this.setQ(column);
        var r = this.parent.clusterRect(0, number, mtx);
        this.ctx.fillStyle = (column == this.parent.selectedCoumn) ? redcandlesat : redcandle;
        this.ctx.mFillRectangle(number+0.1, 0, 0.8, this.q - this.bq);
    }

    drawVolumeColumnAskBid(column, number, mtx) {
        this.setQ(column);
        var r = this.parent.clusterRect(0, number, mtx);
        this.ctx.fillStyle = (column == this.parent.selectedCoumn) ? greencandlesat : greencandle;;
        this.ctx.mFillRectangle(number, 0, 0.5, this.bq);
        this.ctx.fillStyle = (column == this.parent.selectedCoumn) ? redcandlesat : redcandle;
        this.ctx.mFillRectangle(number + 0.5, 0, 0.5, this.q - this.bq);

        var d = mtx.applyToPoint(0, this.bq).x - mtx.applyToPoint(0.5, this.bq).x;
    }
}

