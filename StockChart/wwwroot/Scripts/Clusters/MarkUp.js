"use strict";
function wrapText(context, text, x, y, maxWidth, lineHeight) {
    var words = text.split(' ');
    var line = '';
    for (var n = 0; n < words.length; n++) {
        var testLine = line + words[n] + ' ';
        var metrics = context.measureText(testLine);
        var testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            context.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        }
        else {
            line = testLine;
        }
    }
    context.fillText(line, x, y);
}
class Shape {
    constructor(manager) {
        this.manager = manager;
        this.type = "Base";
        this.model = manager.model;
        this.footprint = manager.footprint;
        this.pointArray = new Array();
        this.screenPointArray = new Array();
        this.controlMap = { color: false, width: false, font: false, id: false, text: false, arrow: false, toolbar: false, profile: false };
        this.getFromModel();
    }
    sortPoints() {
        return (this.pointArray.length > 1);
    }
    selectControls() {
        mode = 'Edit';
        this.model.set("markup.visible", this.controlMap);
        this.model.set("markup.visible.toolbar", true);
        $("#toolbar").data("kendoToolBar").toggle("#Edit", true);
        this.setToModel();
    }
    setupControls() {
        this.model.set("markup.visible", this.controlMap);
    }
    baseToScreen(point) {
        return this.footprint.viewMain.mtx.applyToPoint(point.x, point.y);
    }
    screenToBase(point) {
        return this.footprint.viewMain.mtx.inverse().applyToPoint(point.x, point.y);
    }
    screenToBaseDelta(p1, p2) {
        let pt1 = this.screenToBase(p1);
        let pt2 = this.screenToBase(p2);
        return { x: pt2.x - pt1.x, y: pt2.y - pt1.y };
    }
    movePoint(point, mouseDown, mouseMove) {
        let p = this.screenToBaseDelta(mouseDown, mouseMove);
        point.x += p.x;
        point.y += p.y;
    }
    movePoints(mouseDown, mouseMove) {
        let p = this.screenToBaseDelta(mouseDown, mouseMove);
        for (let point of this.pointArray) {
            point.x += p.x;
            point.y += p.y;
        }
    }
    commonSectionCircle(p1, p2, pC, R) {
        let x1 = p1.x - pC.x;
        let y1 = p1.y - pC.y;
        let x2 = p2.x - pC.x;
        let y2 = p2.y - pC.y;
        let dx = x2 - x1;
        let dy = y2 - y1;
        //составляем коэффициенты квадратного уравнения на пересечение прямой и окружности.
        //если на отрезке [0..1] есть отрицательные значения, значит отрезок пересекает окружность
        let a = dx * dx + dy * dy;
        let b = 2. * (x1 * dx + y1 * dy);
        let c = x1 * x1 + y1 * y1 - R * R;
        //а теперь проверяем, есть ли на отрезке [0..1] решения
        if (-b < 0)
            return (c < 0);
        if (-b < (2. * a))
            return ((4. * a * c - b * b) < 0);
        return (a + b + c < 0);
    }
    isSelectedShape(point, pointArray) {
        if (this.pointArray.length > 1) {
            for (let i = 0; i < pointArray.length - 1; i++) {
                let p = this.baseToScreen(pointArray[i]);
                let p2 = this.baseToScreen(pointArray[i + 1]);
                if (this.commonSectionCircle(p, p2, point, 2))
                    return true;
            }
        }
        return false;
    }
    selectedPoint_(point, pointArray) {
        for (let px of pointArray) {
            let p = this.baseToScreen(px);
            if (Math.abs(p.x - point.x) < 4 && Math.abs(p.y - point.y) < 3)
                return { shape: this, point: px };
        }
        if (this.isSelectedShape(point, pointArray))
            return { shape: this, point: null };
        return null;
    }
    selectedPoint(point) {
        return this.selectedPoint_(point, this.pointArray);
    }
    onStartDraw(point) {
        this.pointArray = new Array();
        this.pointArray.push(this.screenToBase(point));
    }
    onMouseDownMove(point) {
    }
    onMouseUp(point) {
    }
    showWindowFields() {
    }
    setToModel() {
    }
    getFromModel() {
    }
    onStartMovePoint(point) {
        let sp = this.selectedPoint(point);
        this.selPoint = (sp != null) ? sp.point : null;
        this.mouseDown = point;
    }
    onMovePoint(point) {
        if (this.selPoint != null)
            this.movePoint(this.selPoint, this.mouseDown, point);
        else
            this.movePoints(this.mouseDown, point);
        this.mouseDown = point;
    }
    onFinishMovePoint(point) {
    }
    drawSelection() {
        this.footprint.ctx.fillStyle = this.color;
        for (let px of this.pointArray) {
            let p = this.baseToScreen(px);
            this.footprint.ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
        }
    }
    drawShape() {
    }
}
class Brush extends Shape {
    constructor(manager) {
        super(manager);
        this.type = "Brush";
        this.controlMap = { color: true, width: true, font: false, id: false, text: false, arrow: false, toolbar: false, profile: false };
    }
    getFromModel() {
        this.color = this.model.markup.color;
        this.width = this.model.markup.width;
    }
    setToModel() {
        this.model.set("markup.color", this.color);
        this.model.set("markup.width", this.width);
    }
    onMouseDownMove(point) {
        this.pointArray.push(this.screenToBase(point));
    }
    drawShape() {
        this.footprint.ctx.lineWidth = this.width;
        this.footprint.ctx.strokeStyle = this.color;
        this.footprint.ctx.beginPath();
        for (let i = 0; i < this.pointArray.length; i++) {
            let p = this.baseToScreen(this.pointArray[i]);
            if (i == 0)
                this.footprint.ctx.moveTo(p.x, p.y);
            else
                this.footprint.ctx.lineTo(p.x, p.y);
        }
        this.footprint.ctx.stroke();
    }
}
class Line extends Brush {
    constructor(manager) {
        super(manager);
        this.type = "Line";
        this.controlMap = { color: true, width: true, font: false, id: false, text: false, arrow: true, toolbar: false, profile: false };
    }
    getFromModel() {
        super.getFromModel();
        this.arrow = this.model.markup.arrow;
    }
    setToModel() {
        super.setToModel();
        this.model.set("markup.arrow", this.arrow);
    }
    onMouseDownMove(point) {
        let p = this.screenToBase(point);
        if (this.pointArray.length < 2)
            this.pointArray.push(p);
        else
            this.pointArray[1] = p;
    }
    drawShape() {
        super.drawShape();
        if (this.arrow && this.pointArray.length == 2) {
            let w1 = (this.width + 3);
            let p = this.baseToScreen(this.pointArray[0]);
            let p2 = this.baseToScreen(this.pointArray[1]);
            this.footprint.ctx.beginPath();
            this.footprint.ctx.ArrowHead(p.x, p.y, p2.x, p2.y, w1 * 2, w1);
            this.footprint.ctx.closePath();
            this.footprint.ctx.fillStyle = this.color;
            this.footprint.ctx.fill();
            this.footprint.ctx.stroke();
        }
    }
}
class Rect extends Line {
    constructor(manager) {
        super(manager);
        this.type = "Rect";
        this.controlMap = { color: true, width: true, font: false, id: false, text: false, arrow: false, toolbar: false, profile: false };
        this.getFromModel();
    }
    getFromModel() {
        this.color = this.model.markup.color;
        this.width = this.model.markup.width;
    }
    setToModel() {
        this.model.set("markup.color", this.color);
        this.model.set("markup.width", this.width);
    }
    sortPoints() {
        let ps = this.pointArray;
        if (ps.length == 2) {
            let p1 = { x: Math.min(ps[0].x, ps[1].x), y: Math.min(ps[0].y, ps[1].y) };
            let p2 = { x: Math.max(ps[0].x, ps[1].x), y: Math.max(ps[0].y, ps[1].y) };
            this.vPoints = [p1, { x: p2.x, y: p1.y }, p2, { x: p1.x, y: p2.y }];
            ///optimization
            let pt = this.baseToScreen(p2);
            let v = this.footprint.viewMain.view;
            if (pt.x < v.x || pt.y > v.y + v.h) return false;
            pt = this.baseToScreen(p1);
            if (pt.x > v.x + v.w || pt.y < v.y) return false;
            ///optimization
            return true;
        }
        return false;
    }
    selectedPoint(point) {
        this.sortPoints();
        return this.selectedPoint_(point, this.vPoints);
    }
    strokeRect() {
        if (this.pointArray.length == 2) {
            let pt1 = this.baseToScreen(this.vPoints[0]);
            let pt2 = this.baseToScreen(this.vPoints[2]);
            this.footprint.ctx.myStrokeRect({ x: pt1.x, y: pt1.y, w: pt2.x - pt1.x, h: pt2.y - pt1.y });
        }
    }
    drawShape() {
        if (this.sortPoints()) {
            this.footprint.ctx.lineWidth = this.width;
            this.footprint.ctx.strokeStyle = this.color;
            this.strokeRect();
        }
    }
    drawSelection() {
        this.footprint.ctx.fillStyle = this.color;
        for (let px of this.vPoints) {
            let p = this.baseToScreen(px);
            this.footprint.ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
        }
    }
    onStartMovePoint(point) {
        super.onStartMovePoint(point);
        if (this.selPoint != null) {
            this.selPointX = (this.pointArray[0].x == this.selPoint.x) ? this.pointArray[0] : this.pointArray[1];
            this.selPointY = (this.pointArray[0].y == this.selPoint.y) ? this.pointArray[0] : this.pointArray[1];
        }
        this.mouseDown = point;
    }
    movePoint(mouseDown, mouseMove) {
        let p = this.screenToBaseDelta(mouseDown, mouseMove);
        this.selPointX.x += p.x;
        this.selPointY.y += p.y;
    }
    onMovePoint(point) {
        if (this.selPoint != null)
            this.movePoint(this.mouseDown, point);
        else
            this.movePoints(this.mouseDown, point);
        this.mouseDown = point;
    }
}
class Text extends Rect {
    constructor(manager) {
        super(manager);
        this.type = "Text";
        this.controlMap = { color: true, width: false, font: true, id: false, text: true, arrow: false, toolbar: false, profile: false };
        this.getFromModel();
    }
    getFromModel() {
        this.color = this.model.markup.color;
        this.font = this.model.markup.font;
        this.text = this.model.markup.text;
    }
    setToModel() {
        this.model.set("markup.color", this.color);
        this.model.set("markup.font", this.font);
        this.model.set("markup.text", this.text);
    }
    drawShape() {
        if (this.pointArray.length == 2) {
            let ctx = this.footprint.ctx;
            if (this.sortPoints()) {
                ctx.fillStyle = this.color;//selectedPoint.element.color;
                ctx.textAlign = "left";
                ctx.textBaseline = "top";
                ctx.font = this.font + "px Verdana";
                ctx.lineWidth = 1;
                let p = this.baseToScreen(this.vPoints[3]);
                let p2 = this.baseToScreen(this.vPoints[1]);
                wrapText(ctx, this.text, p.x, p.y, p2.x - p.x, this.font + 2);
                if (this.manager.drawingShape == this)
                    this.drawSelection();
            }
        }
    }
    drawSelection() {
        if (this.sortPoints()) {
            this.footprint.ctx.lineWidth = 0.8;
            var rgbcolor = hexToRgb(this.color);
            this.footprint.ctx.strokeStyle = "rgba({0},{1},{2},0.5)".format(rgbcolor.r, rgbcolor.g, rgbcolor.b);
            this.footprint.ctx.setLineDash([5, 3, 5]);
            this.strokeRect();
            this.footprint.ctx.setLineDash([]);
            super.drawSelection();
        }
    }
}





class Strenght extends Rect {
    constructor(manager) {
        super(manager);
        this.type = "Strenght";
        this.controlMap = { color: false, width: false, font: false, id: false, text: false, arrow: false, toolbar: false, profile: true };
        this.getFromModel();
    }
    getFromModel() {
        this.total = this.model.markup.total;
        this.dockable = this.model.markup.dockable;
    }
    setToModel() {
        this.total = this.model.markup.total;
        this.model.set("markup.dockable", this.dockable);
    }

    dock() {
        this.pointArray[0].x = Math.round(this.pointArray[0].x);
        this.pointArray[1].x = Math.round(this.pointArray[1].x);
        if (this.pointArray[1].x == this.pointArray[0].x)
            this.pointArray[1].x = this.pointArray[0].x + 1;
        let ps = this.footprint.data.priceScale;
        this.pointArray[0].y = Math.round(this.pointArray[0].y / ps) * ps - ps / 2;
        this.pointArray[1].y = Math.round(this.pointArray[1].y / ps) * ps - ps / 2;
        if (this.pointArray[1].y == this.pointArray[0].y)
            this.pointArray[1].y = this.pointArray[0].y + ps;
    }
    onMouseUp(point) {
        if (this.dockable && this.pointArray.length == 2) {
            this.dock();

            let pt1 = this.baseToScreen(this.vPoints[0]);
            let pt2 = this.baseToScreen(this.vPoints[2]);

            var v1 = MoscowTimeShift(inttodate(this.footprint.viewMain.pointFromDevice({ offsetX: pt1.x, offsetY: pt1.y }).x));
            var v1 = MoscowTimeShift(inttodate(this.footprint.viewMain.pointFromDevice({ offsetX: pt2.x, offsetY: pt2.y }).x));



            alert(v);
        }
    }
    drawShape() {
        let ctx = this.footprint.ctx;
        this.footprint.ctx.lineWidth = 1;
        if (this.sortPoints()) {




            let pt1 = this.baseToScreen(this.vPoints[0]);
            let pt2 = this.baseToScreen(this.vPoints[2]);




            ctx.myStrokeRect({ x: pt1.x, y: pt1.y, w: pt2.x - pt1.x, h: pt2.y - pt1.y });

        }
    }
}

class Profile extends Rect {
    constructor(manager) {
        super(manager);
        this.type = "Profile";
        this.controlMap = { color: false, width: false, font: false, id: false, text: false, arrow: false, toolbar: false, profile: true };
        this.getFromModel();
    }
    getFromModel() {
        this.total = this.model.markup.total;
        this.dockable = this.model.markup.dockable;
    }
    setToModel() {
        this.total = this.model.markup.total;
        this.model.set("markup.dockable", this.dockable);
    }
    getTotalColumn(data, c1, c2, p1, p2) {
        c1 = Math.max(c1, 0);
        c2 = Math.min(c2, data.length)
        var result = {};
        for (var i = c1; i < c2; i++) {
            var col = data[i];
            for (var j = 0; j < col.cl.length; j++) {
                var p = col.cl[j].p;
                if (p >= p1 && p <= p2) {
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
        }
        var values = Object.keys(result);
        var len = values.length;
        for (var i = 0; i < len; i++)
            values[i] = parseFloat(values[i]);
        values.sort(function (a, b) { return a - b; });
        var res = {};// = { cl: new Array(len) };
        res["cl"] = new Array(len);
        for (var k = 0; k < len; k++) {
            var r = result[values[k]];
         /*   res.cl[k].p = r.p;
            res.cl[k].q = r.q;
            res.cl[k].bq = r.bq;
            res.cl[k].ct = r.ct;
            res.cl[k].mx = r.mx;*/

            res.cl[k] = r;
        }
        return res;
    }
    dock() {
        this.pointArray[0].x = Math.round(this.pointArray[0].x);
        this.pointArray[1].x = Math.round(this.pointArray[1].x);
        if (this.pointArray[1].x == this.pointArray[0].x)
            this.pointArray[1].x = this.pointArray[0].x + 1;
        let ps = this.footprint.data.priceScale;
        this.pointArray[0].y = Math.round(this.pointArray[0].y / ps) * ps - ps / 2;
        this.pointArray[1].y = Math.round(this.pointArray[1].y / ps) * ps - ps / 2;
        if (this.pointArray[1].y == this.pointArray[0].y)
            this.pointArray[1].y = this.pointArray[0].y + ps;
    }
    onMouseUp(point) {
        if (this.dockable && this.pointArray.length == 2) {
            this.dock();
        }
    }


     findMiddleElement(arr) {
        let minDiff = Infinity;
        let middleElementIndex = 0;

        for (let i = 1; i < arr.length - 1; i++) {
            let leftSum = arr.slice(0, i).reduce((acc, cur) => acc + cur.q, 0);
            let rightSum = arr.slice(i + 1).reduce((acc, cur) => acc + cur.q, 0);

            let diff = Math.abs(leftSum - rightSum);

            if (diff < minDiff) {
                minDiff = diff;
                middleElementIndex = i;
            }
        }

        return middleElementIndex;
    };
    

    drawShape() {
        let ctx = this.footprint.ctx;
        this.footprint.ctx.lineWidth = 1;
        if (this.sortPoints()) {
            let col1 = Math.trunc(this.vPoints[0].x);
            let col2 = Math.trunc(this.vPoints[1].x);
            if (col2 != this.vPoints[1].x)
                col2++;
            let p1 = this.vPoints[0].y;
            let p2 = this.vPoints[2].y;
            var column = this.getTotalColumn(this.footprint.data.clusterData, col1, col2, p1, p2);
            var maxc = 0;
            var totalvolume = 0;
           
            for (let x of column.cl) {
                maxc = Math.max(x.q, maxc);
                totalvolume += x.q;
            }

            let mtx = this.footprint.viewMain.mtx;
            let barw = mtx.applyToPoint(col2, this.footprint.data.priceScale).x - mtx.applyToPoint(col1, 0).x
            let rgbcolor = hexToRgb('#6495ed');
            var gc = "rgba({0},{1},{2},0.35)".format(rgbcolor.r, rgbcolor.g, rgbcolor.b);
            var gc2 = "rgba({0},{1},{2},0.6)".format(rgbcolor.r, rgbcolor.g, rgbcolor.b);
            ctx.strokeStyle = '#c0c0c0';
            ctx.fillStyle = gc2;
            let pt1 = this.baseToScreen(this.vPoints[0]);
            let pt2 = this.baseToScreen(this.vPoints[2]);
            ctx.myStrokeRect({ x: pt1.x, y: pt1.y, w: pt2.x - pt1.x, h: pt2.y - pt1.y });
            if (this.total && totalvolume > 0) {
                ctx.font = "12px Verdana";
                ctx.textBaseline = "top";
                ctx.fillText(/*"Total=" +*/ drob(totalvolume, 4), pt1.x + 3, pt1.y + 2);
            }
            ctx.save();
            ctx.beginPath();
            ctx.rect(pt1.x, pt1.y, pt2.x - pt1.x, pt2.y - pt1.y);
            ctx.clip();
            var middle = this.findMiddleElement(column.cl);
            for (var j = 0; j < column.cl.length; j++) {
                var i = j;//z[j];

                var r1 = this.footprint.clusterRect2(column.cl[middle].p, col1, col2, mtx);

                var r = this.footprint.clusterRect2(column.cl[i].p, col1, col2, mtx);
                r.w = column.cl[i].q * barw / maxc;
                r.w *= 0.95;
                ctx.fillStyle = column.cl[i].q == maxc ? 'rgba(255,127,80,0.35)' : gc;
                ctx.beginPath();
                ctx.moveTo(pt1.x, r1.y);
                ctx.lineTo(pt2.x, r1.y);
                ctx.stroke();
                ctx.myFillRect(r);
                ctx.myStrokeRect(r);
            }
            ctx.restore();
        }
    }
}
class ProfileAuto extends Profile {
    constructor(manager) {
        super(manager);
    }
    getFromModel() {
        this.total = this.model.markup.total;
        this.dockable = this.model.markup.dockable;
    }
    setToModel() {
        this.total = this.model.markup.total;
        this.model.set("markup.dockable", this.dockable);
    }
    onMouseUp(point) {
    }
    getProfiles(period) {
        let data = this.footprint.data.clusterData;
        let pairs = [];
        let s = 0;
        function datesComaprer(d1, d2, p) {
            if (p == 30000) {              
                return d1.getMonth() == d1.getMonth();
            }                        
            if (p == 10080) {
                const diffDays = Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays < 7 && d1.getDay() <= d2.getDay();                
            }            
            return Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * p)) <1;                                        
        }
        for (let i = 0; i < data.length; i++) {
            if (!datesComaprer(data[s].x, data[i].x, period)) {
                pairs.push([s, i]);
                s = i;
            }
        }
        if (pairs.length == 0)
            pairs = [[0, data.length]];
        else
            pairs.push([pairs[pairs.length - 1][1], data.length]);
        let res = [];
        let ss = this.footprint.data.priceScale
        for (let i = 0; i < pairs.length; i++) {
            let minp = data[pairs[i][0]].l;// cl[0].p;
            let maxp = data[pairs[i][0]].h;// minp;
            for (let j = pairs[i][0]; j < pairs[i][1]; j++) {
                maxp = Math.max(maxp, data[j].h);
                minp = Math.min(minp, data[j].l);
            }
            let col = data[pairs[i][1] - 1];
            res.push([{ x: pairs[i][0], y: (minp / ss) * ss },                { x: pairs[i][1], y: ss + (maxp / ss) * ss }]);
        }
        return res;
    }
    drawShape() {
        let period = this.model.markup.profilePeriod;
        if (period == -1)
            return;
        let arr = this.getProfiles(period);
        for (let i = 0; i < arr.length; i++) {
            this.pointArray = arr[i];
            this.getFromModel();

            this.dock();

            super.drawShape();
        }
    }
}
class MarkUpManager {
    constructor(model, footprint) {
        this.selectedShape = null;
        this.mouseShape = null;
        this.model = model;
        this.footprint = footprint;
        this.shapeArray = new Array();
        this.drawingShape = null;
    }
    selectShape(point) {
        for (let shape of this.shapeArray) {
            let p = shape.selectedPoint(point)
            if (p != null)
                return p;
        }
        return null;
    }
    shapeFactory(type) {
        if (type == 'Line')
            return new Line(this);
        if (type == 'Brush')
            return new Brush(this);
        if (type == 'Rect')
            return new Rect(this);
        if (type == 'Text')
            return new Text(this);
        if (type == 'Profile')
            return new Profile(this);

        if (type == 'Strenght')
            return new Strenght(this);


        return null;
    }
    updateShapeFromModel() {
        if (this.selectedShape != null) {
            this.selectedShape.shape.getFromModel();
        }
        this.footprint.resize();
    }
    resetEdit() {
        this.model.set("markup.visible", { color: false, width: false, font: false, id: false, text: false, arrow: false, toolbar: false });
    }
    deleteCurrent() {
        if (this.selectedShape) {
            this.shapeArray.splice(this.shapeArray.indexOf(this.selectedShape.shape), 1);
            this.selectedShape = null;
            this.footprint.resize();
            this.resetEdit();
        }
    }
    onMouseDown(point) {
        this.selectedShape = this.mouseShape;
        if (this.selectedShape != null) {
            this.selectedShape.shape.selectControls();
            this.selectedShape.shape.onStartMovePoint(point);
        }
        else {
            if (mode == 'Profile' && this.model.markup.profilePeriod != -1)
                return;
            if (mode == 'Edit')
                this.resetEdit();
            this.drawingShape = this.shapeFactory(mode);
            if (this.drawingShape != null)
                this.drawingShape.onStartDraw(point);
        }
    }
    onMouseDownMove(point) {
        if (this.selectedShape != null) {
            this.selectedShape.shape.onMovePoint(point);
            this.footprint.resize();
        }
        if (this.drawingShape != null) {
            this.drawingShape.onMouseDownMove(point);
            this.footprint.resize();
        }
    }
    onMouseMove(point) {
        this.mouseShape = this.selectShape(point);
        canvas.style.cursor = (this.mouseShape != null) ? ((this.mouseShape.point != null) ? 'pointer' : 'move') : 'default';
    }
    onMouseUp(point) {
        if (this.drawingShape != null && this.drawingShape.pointArray.length > 1) {
            if (this.drawingShape.sortPoints()) {
                this.shapeArray.push(this.drawingShape);
                this.drawingShape.onMouseUp(point);
            }
            this.drawingShape = null;
        }
        if (this.selectedShape != null) {
            this.selectedShape.shape.onMouseUp(point);
            //    this.selectedShape = null;
        }
    }
    changeMode(m) {
        if (m == 'Edit' && mode == 'Edit')
            return;
        mode = m;
        let s = this.shapeFactory(mode);
        if (s == null) {
            this.resetEdit();
        }
        else
            this.shapeFactory(mode).setupControls();
        this.selectedShape = null;
        this.footprint.resize();
    }
    allowPan() {
        return (this.selectedShape == null && this.drawingShape == null);
    }
    drawAll() {
        let pro = new ProfileAuto(this);
        pro.drawShape();
        for (let shape of this.shapeArray) {
            shape.drawShape();
            if (
                (this.mouseShape != null && this.mouseShape.shape == shape) ||
                (this.selectedShape != null && this.selectedShape.shape == shape)
            )
                shape.drawSelection();
        }
        if (this.drawingShape != null)
            this.drawingShape.drawShape();
    }
}