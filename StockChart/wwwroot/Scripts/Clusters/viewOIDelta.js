class viewOIDelta extends viewVolumesSeparated {
    constructor(parent, ctx, view, mtx) {
        super(parent, ctx, view, mtx, 'top');        
    }


    draw(parent, ctx, view, mtx) {
        if (FPsettings.ShrinkY) {
            this.data.maxOIDelta = this.data.local.maxOIDelta;
            this.data.minOIDelta = this.data.local.minOIDelta;            
        }

        this.maxOIDelta = this.data.maxOIDelta;
        this.minOIDelta = this.data.minOIDelta;
        var d = (this.maxOIDelta - this.minOIDelta) / 10;
        this.maxOI += d;
        this.minOI -= d;

        ctx.restore();
        this.DrawZebra(ctx, view.x, view.y, view.w, view.h, this.minOIDelta, this.maxOIDelta);
        ctx.save();
        this.ctx.beginPath();
        this.ctx.myRect(this.view);
        this.ctx.clip();


      
        mtx = mtx.reassignY({ y1: this.minOIDelta, y2: this.maxOIDelta }, { y2: view.y, y1: view.y + view.h });
        ctx.setMatrix(mtx);
        var data = parent.data.clusterData;
        this.drawVertical();
        for (var i = parent.minIndex; i <= parent.maxIndex; i++) {            
            this.drawVolumeColumnOI(data[i], i, mtx);
        }
    }

    getLegendLine() {
        return { "Text": "OIDelta", "Value": this.parent.selectedCoumn.oiDelta };
    }

    drawVolumeColumnOI(column, number, mtx) {
        var ctx = this.ctx;
        ctx.fillStyle = (column == this.parent.selectedCoumn) ? "#0A2D6D" : '#2050A8';
        ctx.mFillRectangle(number+0.1, 0, 0.8, column.oiDelta);        
    }
}

