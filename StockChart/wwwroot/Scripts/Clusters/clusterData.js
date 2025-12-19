class clusterData {

    constructor(data) {
        this.lastPrice = data.clusterData[data.clusterData.length - 1].c;
        this.priceScale = data.priceScale;
        this.VolumePerQuantity = data.VolumePerQuantity;
        this.clusterData = data.clusterData;

        this.calcPrices();
    }

    mergeData(data) {
        if (data == "")
            return;

        this.lastPrice = data.clusterData[data.clusterData.length - 1].c;

        var needMerge = false;
        var rawdata = this;

        if ('Number' in (rawdata.clusterData[rawdata.clusterData.length - 1])) {
            while (rawdata.clusterData[rawdata.clusterData.length - 1].Number >= data.clusterData[0].Number) {
                rawdata.clusterData.pop();
            }
            rawdata.clusterData = rawdata.clusterData.concat(data.clusterData);
            this.calcPrices();
            return true;
        }


        while (rawdata.clusterData.length>0 && rawdata.clusterData[rawdata.clusterData.length - 1].x.getTime() >= data.clusterData[0].x.getTime()) {
            rawdata.clusterData.pop();
        }



        if (data.clusterData.length > 0) {
            if (data.clusterData.length == 0) {
                rawdata.clusterData = data.clusterData;
            }
            /*else
            if (data.clusterData.length == 1) {
                if (rawdata.clusterData[rawdata.clusterData.length - 1].x.getTime() === data.clusterData[0].x.getTime())
                    rawdata.clusterData[rawdata.clusterData.length - 1] = data.clusterData[0];
                else
                    rawdata.clusterData = rawdata.clusterData.concat(data.clusterData);
            }*/
            else {
                //if (rawdata.clusterData[rawdata.clusterData.length - 1].x.getTime() === data.clusterData[0].x.getTime())
                  //  rawdata.clusterData.pop();// = rawdata.clusterData.slice(0, rawdata.clusterData.length - 1)
                rawdata.clusterData = rawdata.clusterData.concat(data.clusterData);
                needMerge = true;
            }
            this.clusterData = rawdata.clusterData;
            //            this.= data;
        }
        this.calcPrices();
        return needMerge;
    }
    getTotalColumn(data) {
        if (!this.ableCluster())
            return;

        var result = {};
        for (var i = 0; i < data.length; i++) {
            var col = data[i];
            for (var j = 0; j < col.cl.length; j++) {
                var p = col.cl[j].p;
                var q = col.cl[j].q;
                var bq = col.cl[j].bq;
                var ct = col.cl[j].ct;
                var mx = col.cl[j].mx;
                if (!result.hasOwnProperty(col.cl[j].p))
                    result[p] = { p: p, q: q, bq: bq, ct: ct, mx: mx };
                else {
                    result[p].q += q;
                    result[p].bq += bq;
                    result[p].ct += ct;
                    if (Math.abs(mx) > Math.abs(result[p].mx))
                        result[p].mx = mx;
                }
            }
        }
        var values = Object.keys(result);
        var len = values.length;
        for (var i = 0; i < len; i++)
            values[i] = parseFloat(values[i]);
        values.sort(function (a, b) { return a - b; });
        var res = { cl: new Array(len) };
        for (var k = 0; k < len; k++) {
            var r = result[values[k]];
            res.cl[k] = {
                p: r.p,
                q: r.q,
                bq: r.bq,
                ct: r.ct,
                mx: r.mx
            }
        }
        this.addColumnInfo(res);
        return res;
    }
    addColumnInfo(column) {
        column.sq = column.q - column.bq;
        column.sv = column.v - column.bv;
        column.deltaTotal = 2 * column.bq - column.q;

        if (!column.cl)
            return;

        column.qntMax = 0;
        column.qntAskMax = 0;
        column.qntBidMax = 0;
        column.volMax = 0;
        column.volAskMax = 0;
        column.volBidMax = 0;
        column.maxDelta = 0;
        column.maxDeltaV = 0;

        for (var j = 0; j < column.cl.length; j++) {
            var mul = this.VolumePerQuantity * column.cl[j].p;
            column.qntMax = Math.max(column.cl[j].q, column.qntMax);
            column.qntAskMax = Math.max(column.cl[j].bq, column.qntAskMax);
            column.qntBidMax = Math.max(column.cl[j].q - column.cl[j].bq, column.qntBidMax);
            column.volMax = Math.max(column.cl[j].q * mul, column.volMax);
            column.volAskMax = Math.max(column.cl[j].bq * mul, column.volAskMax);
            column.volBidMax = Math.max((column.cl[j].q - column.cl[j].bq) * mul, column.volBidMax);
            column.maxDelta = Math.max(Math.abs(2 * column.cl[j].bq - column.cl[j].q), column.maxDelta);
            column.maxDeltaV = Math.max(mul * Math.abs(2 * column.cl[j].bq - column.cl[j].q), column.maxDeltaV);
        }

    }

    maxFromPeriod(start, end) {

        var column = this.clusterData;

        var cs = column[start];
        this.local = {
            qntMax: cs.qntMax,
            qntAskMax: cs.qntAskMax,
            qntBidMax: cs.qntBidMax,
            volMax: cs.volMax,
            volAskMax: cs.volAskMax,
            volBidMax: cs.volBidMax,
            maxDelta: cs.maxDelta,
            maxDeltaV: cs.maxDeltaV,
            q: cs.q,
            bq: cs.bq,
            sq: cs.sq,
            v: cs.v,
            bv: cs.bv,
            sv: cs.v - cs.bv,
            maxPrice: cs.h,
            minPrice: column[end].l,
            maxOI: cs.oi,
            minOI: column[end].oi,
            minCumDelta: cs.cumDelta,
            maxCumDelta: column[end].cumDelta,
            minOIDelta: cs.oiDelta,
            maxOIDelta: column[end].oiDelta,

            minDeltaBar: 2 * cs.bq - cs.q,
            maxDeltaBar: 2 * cs.bq - cs.q,
            maxDens: 0
        }      

        for (var i = start; i <= end; i++) {

            var col = column[i];

            this.local.qntMax = Math.max(col.qntMax, this.local.qntMax);
            this.local.qntAskMax = Math.max(col.qntAskMax, this.local.qntAskMax);
            this.local.qntBidMax = Math.max(col.qntBidMax, this.local.qntBidMax);
            this.local.volMax = Math.max(col.volMax, this.local.volMax);
            this.local.volAskMax = Math.max(col.volAskMax, this.local.volAskMax);
            this.local.volBidMax = Math.max(col.volBidMax, this.local.volBidMax);
            this.local.maxDelta = Math.max(col.maxDelta, this.local.maxDelta);
            this.local.maxDeltaV = Math.max(col.maxDeltaV, this.local.maxDeltaV);
            this.local.q = Math.max(col.q, this.local.q);
            this.local.bq = Math.max(col.bq, this.local.bq);
            this.local.sq = Math.max(col.sq, this.local.sq);
            this.local.v = Math.max(col.v, this.local.v);
            this.local.bv = Math.max(col.bv, this.local.bv);
            this.local.sv = Math.max(col.sv, this.local.sv);
            this.local.minPrice = Math.min(this.local.minPrice, col.l);
            this.local.maxPrice = Math.max(this.local.maxPrice, col.h);
            this.local.minCumDelta = Math.min(this.local.minCumDelta, col.cumDelta);
            this.local.maxCumDelta = Math.max(this.local.maxCumDelta, col.cumDelta);
            this.local.minOIDelta = Math.min(this.local.minOIDelta, col.oiDelta);
            this.local.maxOIDelta = Math.max(this.local.maxOIDelta, col.oiDelta);

            this.local.minDeltaBar = Math.min(this.local.minDeltaBar, 2 * col.bq - col.q);
            this.local.maxDeltaBar = Math.max(this.local.maxDeltaBar, 2 * col.bq - col.q);


            this.local.minOI = Math.min(this.local.minOI, col.oi);
            this.local.maxOI = Math.max(this.local.maxOI, col.oi);
           
            if (!!col.cl)
                for (var j = 0; j < col.cl.length; j++)
                    this.local.maxDens = Math.max(this.local.maxDens, Math.abs(col.cl[j].q / col.cl[j].ct));
        }
    }

    clusterLength() {
        return this.clusterData.length;
    }
    clusterHeight() {
        var h = (this.maxPrice - this.minPrice) / this.priceScale + 1;
        return (this.maxPrice - this.minPrice) / this.priceScale + 1;
    }

    ableOI() {
        return this.clusterData[0].oi != 0;
    }

    ableCluster() {
        return !!this.clusterData[0].cl;
    }

    calcPrices() {
        var data = this.clusterData;
        var first = data[0];




        this.ColumnNumberByDate = {};
        for (var i = 0; i < data.length; i++) {
            this.addColumnInfo(data[i]);
            if (i == 0) {
                data[i].cumDelta = data[i].deltaTotal;
                data[i].oiDelta = 0;
            }
            else {
                data[i].cumDelta = data[i].deltaTotal + data[i - 1].cumDelta;
                data[i].oiDelta = (data[i].oi - data[i - 1].oi) / 2;
            }
        }
        this.maxClusterQnt = first.qntMax;
        this.maxClusterQntAsk = first.qntAskMax;
        this.maxClusterQntBid = first.qntBidMax;


        this.maxClusterVol = first.volMax;
        this.maxClusterVolAsk = first.volAskMax;
        this.maxClusterVolBid = first.volBidMax;

        this.maxOI = first.oi;
        this.minOI = first.oi;

        this.maxOIDelta = first.oiDelta;
        this.minOIDelta = first.oiDelta;




        this.maxDelta = first.maxDelta;
        this.maxDeltaV = first.maxDeltaV;
        this.minColumnDelta = this.maxColumnDelta = first.deltaTotal;
        this.minCumDelta = this.maxCumDelta = first.cumDelta;
        this.maxAbsOIDelta = Math.abs(first.oiDelta);


        this.maxQuantity = first.q;
        this.maxQuantityAsk = first.bq;
        this.maxQuantityBid = first.sq;


        this.maxVolume = first.v;
        this.maxVolumeAsk = first.bv;
        this.maxVolumeBid = first.sv;

        this.minPrice = first.l;
        this.maxPrice = first.h;

        for (var i = 0; i < data.length; i++) {

            var col = data[i];

            this.maxDelta = Math.max(this.maxDelta, col.maxDelta);

            this.maxDeltaV = Math.max(this.maxDeltaV, col.maxDeltaV);

            this.maxColumnDelta = Math.max(this.maxColumnDelta, col.deltaTotal);
            this.maxCumDelta = Math.max(this.maxCumDelta, col.cumDelta);
            this.minColumnDelta = Math.min(this.minColumnDelta, col.deltaTotal);
            this.minCumDelta = Math.min(this.minCumDelta, col.cumDelta);
            this.maxAbsOIDelta = Math.max(this.maxAbsOIDelta, Math.abs(col.oiDelta));

            this.maxOIDelta = Math.max(col.oiDelta, this.maxOIDelta);
            this.minOIDelta = Math.min(col.oiDelta, this.minOIDelta);

            this.minDeltaBar = Math.min(this.minDeltaBar, 2 * col.bq - col.q);
            this.maxDeltaBar = Math.max(this.maxDeltaBar, 2 * col.bq - col.q);

            this.maxOI = Math.max(col.oi, this.maxOI);
            this.minOI = Math.min(col.oi, this.minOI);

            this.maxPrice = Math.max(col.h, this.maxPrice);
            this.minPrice = Math.min(col.l, this.minPrice);

            this.maxQuantity = Math.max(col.q, this.maxQuantity);
            this.maxQuantityAsk = Math.max(col.bq, this.maxQuantityAsk);
            this.maxQuantityBid = Math.max(col.sq, this.maxQuantityBid);

            this.maxVolume = Math.max(col.v, this.maxVolume);
            this.maxVolumeAsk = Math.max(col.bv, this.maxVolumeAsk);
            this.maxVolumeBid = Math.max(col.sv, this.maxVolumeBid);



            this.maxClusterQnt = Math.max(this.maxClusterQnt, col.qntMax);
            this.maxClusterQntAsk = Math.max(this.maxClusterQntAsk, col.qntAskMax);
            this.maxClusterQntBid = Math.max(this.maxClusterQntBid, col.qntBidMax);


            this.maxClusterVol = Math.max(this.maxClusterVol, col.volMax);
            this.maxClusterVolAsk = Math.max(this.maxClusterVolAsk, col.volAskMax);
            this.maxClusterVolBid = Math.max(this.maxClusterVolBid, col.volBidMax);

            this.ColumnNumberByDate[col.x] = i;
        }

        if (!this.ableCluster())
            return;

        this.totalColumn = this.getTotalColumn(data);
       


        var sortedmax = new Array();
        var sortedavg = new Array();
        for (var i = 0; i < data.length; i++) {
            for (var j = 0; j < data[i].cl.length; j++) {
                sortedmax.push(Math.abs(data[i].cl[j].mx));
                sortedavg.push(Math.abs(data[i].cl[j].q / data[i].cl[j].ct));
            }
        }
        this.DateByColumnNumberFloat = function (x) {
            var p = Math.trunc(x);
            return this.clusterData[p].x + params.period * (x - p);
        }
        this.ColumnNumberByDateFloat = function (x) {
            var frac = (this.clusterData[0].x / params.period) - Math.trunc(this.clusterData[0].x / params.period);
            var t = (Math.trunc(x / params.period) + frac) * params.period;
            var diff = (x - t) / params.period;
            return this.ColumnNumberByDate[t] + diff;
        }
        sortedmax.sort(function (a, b) { return b - a; });
        sortedavg.sort(function (a, b) { return b - a; });
        this.maxt1 = sortedmax[0];
        this.maxt2 = sortedmax[sortedmax.length > 10 ? 10 : sortedmax.length - 1];
        var r = Math.min(sortedavg.length, 8);
        var rr = 0;
        var rr2 = 0;
        for (var i = 0; i < r; i++) {
            rr += sortedavg[i];
            rr2 += sortedavg[i + sortedmax.length - r - 1];
        }
        rr2 /= r;
        rr /= r;
        this.maxDens = rr;
        this.minDens = rr2;
    }

}

