class viewDeltaBars extends viewVolumesSeparated {
    constructor(parent, ctx, view, mtx) {
        super(parent, ctx, view, mtx, 'top');        
    }


    draw(parent, ctx, view, mtx) {
        if (FPsettings.ShrinkY) {
            this.data.maxDeltaBar = this.data.local.maxDeltaBar;
            this.data.minDeltaBar = this.data.local.minDeltaBar;            
        }

        this.maxDeltaBar = this.data.maxDeltaBar;
        this.minDeltaBar = this.data.minDeltaBar;
        var d = (this.maxDeltaBar - this.minDeltaBar) / 10;
        this.maxDeltaBar += d;
        this.minDeltaBar -= d;

        ctx.restore();
        this.DrawZebra(ctx, view.x, view.y, view.w, view.h, this.minDeltaBar, this.maxDeltaBar);
        ctx.save();
        this.ctx.beginPath();
        this.ctx.myRect(this.view);
        this.ctx.clip();


      
        mtx = mtx.reassignY({ y1: this.minDeltaBar, y2: this.maxDeltaBar }, { y2: view.y, y1: view.y + view.h });
        ctx.setMatrix(mtx);
        var data = parent.data.clusterData;
        this.drawVertical();
        for (var i = parent.minIndex; i <= parent.maxIndex; i++) {            
            this.drawVolumeColumnOI(data[i], i, mtx);
        }
    }

    getLegendLine() {
        return { "Text": "Buy-Sell", "Value": 2 * this.parent.selectedCoumn.bq - this.parent.selectedCoumn.q };
    }
  
    drawVolumeColumnOI(column, number, mtx) {
        var ctx = this.ctx;
        
        if (2 * column.bq - column.q>0)
            ctx.fillStyle = (column == this.parent.selectedCoumn) ? greencandlesat : greencandle;
        else
            ctx.fillStyle = (column == this.parent.selectedCoumn) ? redcandlesat : redcandle;

        ctx.mFillRectangle(number + 0.1, 0, 0.8, 2 * column.bq - column.q);        
    }
}

