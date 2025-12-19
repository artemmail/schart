class viewVolumes extends canvasPart {
    constructor(parent, ctx, view, mtx) {
        super(parent, ctx, view, mtx);
        this.data = parent.data;


    }

    setQ(column) {
        this.q = (FPsettings.Contracts) ? column.q : column.v;
        this.bq = (FPsettings.Contracts) ? column.bq : column.bv;
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




        this.drawVolumeColumn = this.drawVolumeColumnTotal;
        this.maxQuantity = this.maxQuantity;

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
                    this.maxQuantity = this.maxQuantity;
                    break;
            }

        this.maxQuantity *= 1.15;

        mtx = mtx.reassignY({ y1: 0, y2: this.maxQuantity }, { y2: view.y, y1: view.y + view.h });

        ctx.setMatrix(mtx);



        var data = parent.data.clusterData;
        for (var i = parent.minIndex; i <= parent.maxIndex; i++) {

            this.drawVolumeColumn(data[i], i, mtx);
        }
    }

    drawVolumeColumnText(column, number, mtx, p, text, nums) {
        if (this.parent.topVolumes())
            return;
        var bar = this.parent.getBar(mtx);
        var fontSize = Math.min(Math.abs(bar.w / nums), 12 * scale);
        fontSize = Math.min(fontSize, maxFontSize);
        if (fontSize > 7) {

            this.ctx.font = "" + fontSize + "px Verdana";
            this.ctx.textBaseline = "alphabetic";
            this.ctx.fillStyle = WhiteText;
            this.ctx.fillText(drob(text), p.x, p.y - 1);
        }
    }


    drawVolumeColumnTotal(column, number, mtx) {
        this.setQ(column);
        var ctx = this.ctx;
        ctx.fillStyle = greencandleA;
        ctx.mFillRectangle(number, 0, 1, this.bq);
        ctx.fillStyle = redcandleA;
        ctx.mFillRectangle(number, this.bq, 1, this.q - this.bq);
        this.drawVolumeColumnText(column, number, mtx, mtx.applyToPoint(number, this.q), this.q, 6);
    }

    drawVolumeColumnAsk(column, number, mtx) {
        this.setQ(column);
        var r = this.parent.clusterRect(0, number, mtx);
        this.ctx.fillStyle = greencandleA;
        this.ctx.mFillRectangle(number, 0, 1, this.bq);
        var p1 = mtx.applyToPoint(0, this.bq);
        this.drawVolumeColumnText(column, number, mtx, mtx.applyToPoint(number, this.bq), this.bq, 6);
    }
    drawVolumeColumnBid(column, number, mtx) {
        this.setQ(column);
        var r = this.parent.clusterRect(0, number, mtx);
        this.ctx.fillStyle = redcandleA;
        this.ctx.mFillRectangle(number, 0, 1, this.q - this.bq);
        this.drawVolumeColumnText(column, number, mtx, mtx.applyToPoint(number, this.q - this.bq), this.q - this.bq, 6);
    }

    drawVolumeColumnAskBid(column, number, mtx) {
        this.setQ(column);
        var r = this.parent.clusterRect(0, number, mtx);
        this.ctx.fillStyle = greencandleA;
        this.ctx.mFillRectangle(number, 0, 0.5, this.bq);
        this.ctx.fillStyle = redcandleA;
        this.ctx.mFillRectangle(number + 0.5, 0, 0.5, this.q - this.bq);



        this.drawVolumeColumnText(column, number, mtx, mtx.applyToPoint(number, this.bq), this.bq, 6);
        this.drawVolumeColumnText(column, number, mtx, mtx.applyToPoint(number + 0.5, this.q - this.bq), this.q - this.bq, 6);

        /*
        this.drawVolumeColumnText(column, number, mtx, mtx.applyToPoint(0, this.q -  column.bq).y, 0, this.q -  column.bq, 8);
        this.drawVolumeColumnText(column, number, mtx, mtx.applyToPoint(0, column.bq).y, d, column.bq, 8);*/
    }
}

