
CanvasRenderingContext2D.prototype.ArrowHead = function (x1, y1, x2, y2, h, w) {
    var v = { x: x2 - x1, y: y2 - y1 };
    var len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len == 0)
        return;
    var norm = { x: v.x / len, y: v.y / len };
    var c = { x: x2 - norm.x * h, y: y2 - norm.y * h };
    var l = { x: c.x + norm.y * w, y: c.y - norm.x * w };
    var r = { x: c.x - norm.y * w, y: c.y + norm.x * w };
    this.moveTo(l.x, l.y);
    this.lineTo(x2, y2);
    this.lineTo(r.x, r.y);
};
CanvasRenderingContext2D.prototype.myStrokeRect = function (r) {
    var dw = Math.round(Math.round(r.w + r.x) - Math.round(r.x) - Math.round(r.w));
    var dh = Math.round(Math.round(r.h + r.y) - Math.round(r.y) - Math.round(r.h));
    this.strokeRect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w) + dw, Math.round(r.h) + dh);
};
CanvasRenderingContext2D.prototype.myFillRect = function (r) {
    var dw = Math.round(Math.round(r.w + r.x) - Math.round(r.x) - Math.round(r.w));
    var dh = Math.round(Math.round(r.h + r.y) - Math.round(r.y) - Math.round(r.h));
    this.fillRect(Math.round(r.x), Math.round(r.y), Math.round(r.w) + dw, Math.round(r.h) + dh);
};
CanvasRenderingContext2D.prototype.myFillRectSmoothX = function (r) {
    //var dw = Math.round(Math.round(r.w + r.x) - Math.round(r.x) - Math.round(r.w));
    var dh = Math.round(Math.round(r.h + r.y) - Math.round(r.y) - Math.round(r.h));
    this.fillRect(Math.round(r.x), Math.round(r.y), r.w, Math.round(r.h) + dh);
};
CanvasRenderingContext2D.prototype.myStrokeRectXY = function (p1, p2) {
    this.myStrokeRect({ x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y });
}
CanvasRenderingContext2D.prototype.myFillRectXY = function (p1, p2) {
    this.myFillRect({ x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y });
}
CanvasRenderingContext2D.prototype.myRectXY = function (p1, p2) {
    this.myRect({ x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y });
}
CanvasRenderingContext2D.prototype.myMoveTo = function (x, y) { this.moveTo(Math.round(x) + 0.5, Math.round(y) + 0.5); };
CanvasRenderingContext2D.prototype.myLineTo = function (x, y) { this.lineTo(Math.round(x) + 0.5, Math.round(y) + 0.5); };
CanvasRenderingContext2D.prototype.myLine = function (x1, y1, x2, y2) { this.myMoveTo(x1, y1); this.myLineTo(x2, y2); };
CanvasRenderingContext2D.prototype.myFillRectSmooth = function (r) { this.fillRect(r.x, r.y, r.w, r.h); };
CanvasRenderingContext2D.prototype.myRect = function (r) {
    var dw = Math.round(Math.round(r.w + r.x) - Math.round(r.x) - Math.round(r.w));
    var dh = Math.round(Math.round(r.h + r.y) - Math.round(r.y) - Math.round(r.h));
    this.rect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w) + dw, Math.round(r.h) + dh);
};