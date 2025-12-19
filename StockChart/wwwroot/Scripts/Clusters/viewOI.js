class viewOI extends viewVolumesSeparated {
    constructor(parent, ctx, view, mtx) {
        super(parent, ctx, view, mtx, 'top');        
    }


    draw(parent, ctx, view, mtx) {
        if (FPsettings.ShrinkY) {
            this.data.maxOI = this.data.local.maxOI;
            this.data.minOI = this.data.local.minOI;            
        }

        this.maxOI = this.data.maxOI;
        this.minOI = this.data.minOI;
        var d = (this.maxOI - this.minOI) / 10;
        this.maxOI += d;
    //    this.minOI -= d;

        ctx.restore();
     //   this.DrawZebra(ctx, view.x, view.y, view.w, view.h, this.minOI, this.maxOI);

        this.DrawZebra(ctx, view.x, view.y, view.w, view.h, 0, this.maxOI - this.minOI);
        ctx.save();
        this.ctx.beginPath();
        this.ctx.myRect(this.view);
        this.ctx.clip();


      
        mtx = mtx.reassignY({ y1: this.minOI, y2: this.maxOI }, { y2: view.y, y1: view.y + view.h });
        ctx.setMatrix(mtx);
        var data = parent.data.clusterData;
        this.drawVertical();
        for (var i = parent.minIndex; i <= parent.maxIndex; i++) {            
            this.drawVolumeColumnOI(data[i], i, mtx);
        }
    }

    getLegendLine() {
        return { "Text": "OI", "Value": this.parent.selectedCoumn.oi };
    }
  
    drawVolumeColumnOI(column, number, mtx) {
        var ctx = this.ctx;
        ctx.fillStyle = (column == this.parent.selectedCoumn) ? "#0A2D6D" : '#2050A8';
        ctx.mFillRectangle(number+0.1, 0, 0.8, column.oi);        
    }
}

