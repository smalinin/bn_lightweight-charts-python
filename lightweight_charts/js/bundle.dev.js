var Lib = (function (exports, lightweightCharts) {
    'use strict';

    const paneStyleDefault = {
        backgroundColor: 'rgb(18,24,38)',
        hoverBackgroundColor: '#3c434c',
        clickBackgroundColor: '#50565E',
        activeBackgroundColor: 'rgba(0, 122, 255, 0.7)',
        mutedBackgroundColor: 'rgba(0, 122, 255, 0.3)',
        borderColor: '#3C434C',
        color: '#d8d9db',
        activeColor: '#ececed',
    };
    function globalParamInit() {
        window.pane = {
            ...paneStyleDefault,
        };
        window.containerDiv = document.getElementById("container") || document.createElement('div');
        window.setCursor = (type) => {
            if (type)
                window.cursor = type;
            document.body.style.cursor = window.cursor;
        };
        window.cursor = 'default';
        window.textBoxFocused = false;
    }
    const setCursor = (type) => {
        if (type)
            window.cursor = type;
        document.body.style.cursor = window.cursor;
    };
    function htmlToElement(html) {
        let template = document.createElement('template');
        html = html.trim(); // Never return a text node of whitespace as the result
        template.innerHTML = html;
        const el = template.content.firstChild;
        if (!el)
            throw new Error("Invalid HTML passed to htmlToElement");
        return el;
    }
    // export interface SeriesHandler {
    //     type: string;
    //     series: ISeriesApi<SeriesType>;
    //     markers: SeriesMarker<"">[],
    //     horizontal_lines: HorizontalLine[],
    //     name?: string,
    //     precision: number,
    // }

    class Legend {
        handler;
        div;
        seriesContainer;
        ohlcEnabled = false;
        percentEnabled = false;
        linesEnabled = false;
        colorBasedOnCandle = false;
        text;
        candle;
        _lines = [];
        _lines_grp = {};
        constructor(handler) {
            this.legendHandler = this.legendHandler.bind(this);
            this.handler = handler;
            this.ohlcEnabled = false;
            this.percentEnabled = false;
            this.linesEnabled = false;
            this.colorBasedOnCandle = false;
            this.div = document.createElement('div');
            this.div.classList.add("legend");
            this.div.style.maxWidth = `${(handler.scale.width * 100) - 8}vw`;
            this.div.style.display = 'none';
            const seriesWrapper = document.createElement('div');
            seriesWrapper.style.display = 'flex';
            seriesWrapper.style.flexDirection = 'row';
            this.seriesContainer = document.createElement("div");
            this.seriesContainer.classList.add("series-container");
            this.text = document.createElement('span');
            this.text.style.lineHeight = '1.8';
            this.candle = document.createElement('div');
            seriesWrapper.appendChild(this.seriesContainer);
            this.div.appendChild(this.text);
            this.div.appendChild(this.candle);
            this.div.appendChild(seriesWrapper);
            handler.div.appendChild(this.div);
            // this.makeSeriesRows(handler);
            handler.chart.subscribeCrosshairMove(this.legendHandler);
        }
        toJSON() {
            // Exclude the chart attribute from serialization
            const { _lines, handler, ...serialized } = this;
            return serialized;
        }
        // makeSeriesRows(handler: Handler) {
        //     if (this.linesEnabled) handler._seriesList.forEach(s => this.makeSeriesRow(s))
        // }
        makeSeriesRow(name, series, paneIndex) {
            const strokeColor = '#FFF';
            let openEye = `
    <path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:${strokeColor};stroke-opacity:1;stroke-miterlimit:4;" d="M 21.998437 12 C 21.998437 12 18.998437 18 12 18 C 5.001562 18 2.001562 12 2.001562 12 C 2.001562 12 5.001562 6 12 6 C 18.998437 6 21.998437 12 21.998437 12 Z M 21.998437 12 " transform="matrix(0.833333,0,0,0.833333,0,0)"/>
    <path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:${strokeColor};stroke-opacity:1;stroke-miterlimit:4;" d="M 15 12 C 15 13.654687 13.654687 15 12 15 C 10.345312 15 9 13.654687 9 12 C 9 10.345312 10.345312 9 12 9 C 13.654687 9 15 10.345312 15 12 Z M 15 12 " transform="matrix(0.833333,0,0,0.833333,0,0)"/>\`
    `;
            let closedEye = `
    <path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:${strokeColor};stroke-opacity:1;stroke-miterlimit:4;" d="M 20.001562 9 C 20.001562 9 19.678125 9.665625 18.998437 10.514062 M 12 14.001562 C 10.392187 14.001562 9.046875 13.589062 7.95 12.998437 M 12 14.001562 C 13.607812 14.001562 14.953125 13.589062 16.05 12.998437 M 12 14.001562 L 12 17.498437 M 3.998437 9 C 3.998437 9 4.354687 9.735937 5.104687 10.645312 M 7.95 12.998437 L 5.001562 15.998437 M 7.95 12.998437 C 6.689062 12.328125 5.751562 11.423437 5.104687 10.645312 M 16.05 12.998437 L 18.501562 15.998437 M 16.05 12.998437 C 17.38125 12.290625 18.351562 11.320312 18.998437 10.514062 M 5.104687 10.645312 L 2.001562 12 M 18.998437 10.514062 L 21.998437 12 " transform="matrix(0.833333,0,0,0.833333,0,0)"/>
    `;
            let row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            let div = document.createElement('div');
            let toggle = document.createElement('div');
            toggle.classList.add('legend-toggle-switch');
            let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("width", "22");
            svg.setAttribute("height", "16");
            let group = document.createElementNS("http://www.w3.org/2000/svg", "g");
            group.innerHTML = openEye;
            let on = true;
            toggle.addEventListener('click', () => {
                if (on) {
                    on = false;
                    group.innerHTML = closedEye;
                    series.applyOptions({
                        visible: false
                    });
                }
                else {
                    on = true;
                    series.applyOptions({
                        visible: true
                    });
                    group.innerHTML = openEye;
                }
            });
            svg.appendChild(group);
            toggle.appendChild(svg);
            row.appendChild(div);
            row.appendChild(toggle);
            this.seriesContainer.appendChild(row);
            const color = series.options().baseLineColor;
            this._lines.push({
                name: name,
                paneIndex: paneIndex,
                div: div,
                row: row,
                toggle: toggle,
                series: series,
                solid: color.startsWith('rgba') ? color.replace(/[^,]+(?=\))/, '1') : color
            });
            this._lines.sort((a, b) => a.paneIndex - b.paneIndex);
            this._lines_grp = this._lines.reduce((acc, item) => {
                if (!acc[item.paneIndex]) {
                    acc[item.paneIndex] = [];
                }
                acc[item.paneIndex].push(item);
                return acc;
            }, {});
            this.seriesContainer.innerHTML = '';
            for (const k in this._lines_grp) {
                for (const l of this._lines_grp[k]) {
                    this.seriesContainer.appendChild(l.row);
                }
                this.seriesContainer.appendChild(htmlToElement("<br>"));
            }
        }
        legendItemFormat(num, decimal) {
            return num.toFixed(decimal).toString().padStart(8, ' ');
        }
        shorthandFormat(num) {
            const absNum = Math.abs(num);
            if (absNum >= 1000000) {
                return (num / 1000000).toFixed(1) + 'M';
            }
            else if (absNum >= 1000) {
                return (num / 1000).toFixed(1) + 'K';
            }
            return num.toString().padStart(8, ' ');
        }
        legendHandler(param, usingPoint = false) {
            if (!this.ohlcEnabled && !this.linesEnabled && !this.percentEnabled)
                return;
            const options = this.handler.series.options();
            if (!param.time) {
                this.candle.style.color = 'transparent';
                this.candle.innerHTML = this.candle.innerHTML.replace(options['upColor'], '').replace(options['downColor'], '');
                return;
            }
            let data;
            let logical = null;
            if (usingPoint) {
                const timeScale = this.handler.chart.timeScale();
                let coordinate = timeScale.timeToCoordinate(param.time);
                if (coordinate)
                    logical = timeScale.coordinateToLogical(coordinate.valueOf());
                if (logical)
                    data = this.handler.series.dataByIndex(logical.valueOf());
            }
            else {
                data = param.seriesData.get(this.handler.series);
            }
            this.candle.style.color = '';
            let str = '<span style="line-height: 1.8;">';
            if (data) {
                if (this.ohlcEnabled) {
                    str += `O ${this.legendItemFormat(data.open, this.handler.precision)} `;
                    str += `| H ${this.legendItemFormat(data.high, this.handler.precision)} `;
                    str += `| L ${this.legendItemFormat(data.low, this.handler.precision)} `;
                    str += `| C ${this.legendItemFormat(data.close, this.handler.precision)} `;
                }
                if (this.handler.volumeSeries) {
                    let volumeData;
                    if (logical) {
                        volumeData = this.handler.volumeSeries.dataByIndex(logical);
                    }
                    else {
                        volumeData = param.seriesData.get(this.handler.volumeSeries);
                    }
                    if (volumeData) {
                        str += this.ohlcEnabled ? `| V ${this.shorthandFormat(volumeData.value)}` : '';
                    }
                }
                if (this.percentEnabled) {
                    let percentMove = ((data.close - data.open) / data.open) * 100;
                    let color = percentMove > 0 ? options["upColor"] : options["downColor"];
                    let percentStr = `${percentMove >= 0 ? "+" : ""}${percentMove.toFixed(2)} %`;
                    if (this.colorBasedOnCandle) {
                        str += `| <span style="color: ${color};">${percentStr}</span>`;
                    }
                    else {
                        str += "| " + percentStr;
                    }
                }
            }
            this.candle.innerHTML = str + '</span>';
            this._lines.forEach((e) => {
                if (!this.linesEnabled) {
                    e.row.style.display = 'none';
                    return;
                }
                e.row.style.display = 'flex';
                let data;
                if (usingPoint && logical) {
                    data = e.series.dataByIndex(logical);
                }
                else {
                    data = param.seriesData.get(e.series);
                }
                if (!data?.value)
                    return;
                let price;
                if (e.series.seriesType() == 'Histogram') {
                    price = this.shorthandFormat(data.value);
                }
                else {
                    const format = e.series.options().priceFormat;
                    price = this.legendItemFormat(data.value, format.precision); // couldn't this just be line.options().precision?
                }
                e.div.innerHTML = `<span style="color: ${e.solid};">▨</span>    ${e.name} : ${price}`;
            });
        }
    }

    function ensureDefined(value) {
        if (value === undefined) {
            throw new Error('Value is undefined');
        }
        return value;
    }

    //* PluginBase is a useful base to build a plugin upon which
    //* already handles creating getters for the chart and series,
    //* and provides a requestUpdate method.
    class PluginBase {
        _chart = undefined;
        _series = undefined;
        requestUpdate() {
            if (this._requestUpdate)
                this._requestUpdate();
        }
        _requestUpdate;
        attached({ chart, series, requestUpdate, }) {
            this._chart = chart;
            this._series = series;
            this._series.subscribeDataChanged(this._fireDataUpdated);
            this._requestUpdate = requestUpdate;
            this.requestUpdate();
        }
        detached() {
            this._chart = undefined;
            this._series = undefined;
            this._requestUpdate = undefined;
        }
        get chart() {
            return ensureDefined(this._chart);
        }
        get series() {
            return ensureDefined(this._series);
        }
        _fireDataUpdated(scope) {
            if (this.dataUpdated) {
                this.dataUpdated(scope);
            }
        }
    }

    const defaultOptions = {
        lineColor: '#1E80F0',
        lineStyle: lightweightCharts.LineStyle.Solid,
        width: 4,
    };

    var InteractionState;
    (function (InteractionState) {
        InteractionState[InteractionState["NONE"] = 0] = "NONE";
        InteractionState[InteractionState["HOVERING"] = 1] = "HOVERING";
        InteractionState[InteractionState["DRAGGING"] = 2] = "DRAGGING";
        InteractionState[InteractionState["DRAGGINGP1"] = 3] = "DRAGGINGP1";
        InteractionState[InteractionState["DRAGGINGP2"] = 4] = "DRAGGINGP2";
        InteractionState[InteractionState["DRAGGINGP3"] = 5] = "DRAGGINGP3";
        InteractionState[InteractionState["DRAGGINGP4"] = 6] = "DRAGGINGP4";
    })(InteractionState || (InteractionState = {}));
    class Drawing extends PluginBase {
        _paneViews = [];
        _options;
        _points = [];
        _state = InteractionState.NONE;
        _startDragPoint = null;
        _latestHoverPoint = null;
        static _mouseIsDown = false;
        static hoveredObject = null;
        static lastHoveredObject = null;
        _listeners = [];
        constructor(options) {
            super();
            this._options = {
                ...defaultOptions,
                ...options,
            };
        }
        updateAllViews() {
            this._paneViews.forEach(pw => pw.update());
        }
        paneViews() {
            return this._paneViews;
        }
        applyOptions(options) {
            this._options = {
                ...this._options,
                ...options,
            };
            this.requestUpdate();
        }
        updatePoints(...points) {
            for (let i = 0; i < this.points.length; i++) {
                if (points[i] == null)
                    continue;
                this.points[i] = points[i];
            }
            this.requestUpdate();
        }
        detach() {
            this._options.lineColor = 'transparent';
            this.requestUpdate();
            this.series.detachPrimitive(this);
            for (const s of this._listeners) {
                document.body.removeEventListener(s.name, s.listener);
            }
        }
        get points() {
            return this._points;
        }
        _subscribe(name, listener) {
            document.body.addEventListener(name, listener);
            this._listeners.push({ name: name, listener: listener });
        }
        _unsubscribe(name, callback) {
            document.body.removeEventListener(name, callback);
            const toRemove = this._listeners.find((x) => x.name === name && x.listener === callback);
            this._listeners.splice(this._listeners.indexOf(toRemove), 1);
        }
        _handleHoverInteraction(param) {
            this._latestHoverPoint = param.point;
            if (Drawing._mouseIsDown) {
                this._handleDragInteraction(param);
            }
            else {
                if (this._mouseIsOverDrawing(param)) {
                    if (this._state != InteractionState.NONE)
                        return;
                    this._moveToState(InteractionState.HOVERING);
                    Drawing.hoveredObject = Drawing.lastHoveredObject = this;
                }
                else {
                    if (this._state == InteractionState.NONE)
                        return;
                    this._moveToState(InteractionState.NONE);
                    if (Drawing.hoveredObject === this)
                        Drawing.hoveredObject = null;
                }
            }
        }
        static _eventToPoint(param, series) {
            if (!series || !param.point || !param.logical)
                return null;
            const barPrice = series.coordinateToPrice(param.point.y);
            if (barPrice == null)
                return null;
            return {
                time: param.time || null,
                logical: param.logical,
                price: barPrice.valueOf(),
            };
        }
        static _getDiff(p1, p2) {
            const diff = {
                logical: p1.logical - p2.logical,
                price: p1.price - p2.price,
            };
            return diff;
        }
        _addDiffToPoint(point, logicalDiff, priceDiff) {
            if (!point)
                return;
            point.logical = point.logical + logicalDiff;
            point.price = point.price + priceDiff;
            point.time = this.series.dataByIndex(point.logical)?.time || null;
        }
        _handleMouseDownInteraction = () => {
            // if (Drawing._mouseIsDown) return;
            Drawing._mouseIsDown = true;
            this._onMouseDown();
        };
        _handleMouseUpInteraction = () => {
            // if (!Drawing._mouseIsDown) return;
            Drawing._mouseIsDown = false;
            this._moveToState(InteractionState.HOVERING);
        };
        _handleDragInteraction(param) {
            if (this._state != InteractionState.DRAGGING &&
                this._state != InteractionState.DRAGGINGP1 &&
                this._state != InteractionState.DRAGGINGP2 &&
                this._state != InteractionState.DRAGGINGP3 &&
                this._state != InteractionState.DRAGGINGP4) {
                return;
            }
            const mousePoint = Drawing._eventToPoint(param, this.series);
            if (!mousePoint)
                return;
            this._startDragPoint = this._startDragPoint || mousePoint;
            const diff = Drawing._getDiff(mousePoint, this._startDragPoint);
            this._onDrag(diff);
            this.requestUpdate();
            this._startDragPoint = mousePoint;
        }
    }

    class DrawingPaneRenderer {
        _options;
        constructor(options) {
            this._options = options;
        }
    }
    class TwoPointDrawingPaneRenderer extends DrawingPaneRenderer {
        _p1;
        _p2;
        _hovered;
        constructor(p1, p2, options, hovered) {
            super(options);
            this._p1 = p1;
            this._p2 = p2;
            this._hovered = hovered;
        }
        _getScaledCoordinates(scope) {
            if (this._p1.x === null || this._p1.y === null ||
                this._p2.x === null || this._p2.y === null)
                return null;
            return {
                x1: Math.round(this._p1.x * scope.horizontalPixelRatio),
                y1: Math.round(this._p1.y * scope.verticalPixelRatio),
                x2: Math.round(this._p2.x * scope.horizontalPixelRatio),
                y2: Math.round(this._p2.y * scope.verticalPixelRatio),
            };
        }
        // _drawTextLabel(scope: BitmapCoordinatesRenderingScope, text: string, x: number, y: number, left: boolean) {
        //  scope.context.font = '24px Arial';
        //  scope.context.beginPath();
        //  const offset = 5 * scope.horizontalPixelRatio;
        //  const textWidth = scope.context.measureText(text);
        //  const leftAdjustment = left ? textWidth.width + offset * 4 : 0;
        //  scope.context.fillStyle = this._options.labelBackgroundColor;
        //  scope.context.roundRect(x + offset - leftAdjustment, y - 24, textWidth.width + offset * 2,  24 + offset, 5);
        //  scope.context.fill();
        //  scope.context.beginPath();
        //  scope.context.fillStyle = this._options.labelTextColor;
        //  scope.context.fillText(text, x + offset * 2 - leftAdjustment, y);
        // }
        _drawEndCircle(scope, x, y) {
            const radius = 9;
            scope.context.fillStyle = '#000';
            scope.context.beginPath();
            scope.context.arc(x, y, radius, 0, 2 * Math.PI);
            scope.context.stroke();
            scope.context.fill();
            // scope.context.strokeStyle = this._options.lineColor;
        }
    }

    function setLineStyle(ctx, style) {
        const dashPatterns = {
            [lightweightCharts.LineStyle.Solid]: [],
            [lightweightCharts.LineStyle.Dotted]: [ctx.lineWidth, ctx.lineWidth],
            [lightweightCharts.LineStyle.Dashed]: [2 * ctx.lineWidth, 2 * ctx.lineWidth],
            [lightweightCharts.LineStyle.LargeDashed]: [6 * ctx.lineWidth, 6 * ctx.lineWidth],
            [lightweightCharts.LineStyle.SparseDotted]: [ctx.lineWidth, 4 * ctx.lineWidth],
        };
        const dashPattern = dashPatterns[style];
        ctx.setLineDash(dashPattern);
    }

    class HorizontalLinePaneRenderer extends DrawingPaneRenderer {
        _point = { x: null, y: null };
        constructor(point, options) {
            super(options);
            this._point = point;
        }
        draw(target) {
            target.useBitmapCoordinateSpace(scope => {
                if (this._point.y == null)
                    return;
                const ctx = scope.context;
                const scaledY = Math.round(this._point.y * scope.verticalPixelRatio);
                const scaledX = this._point.x ? this._point.x * scope.horizontalPixelRatio : 0;
                ctx.lineWidth = this._options.width;
                ctx.strokeStyle = this._options.lineColor;
                setLineStyle(ctx, this._options.lineStyle);
                ctx.beginPath();
                ctx.moveTo(scaledX, scaledY);
                ctx.lineTo(scope.bitmapSize.width, scaledY);
                ctx.stroke();
            });
        }
    }

    class DrawingPaneView {
        _source;
        constructor(source) {
            this._source = source;
        }
    }
    class TwoPointDrawingPaneView extends DrawingPaneView {
        _p1 = { x: null, y: null };
        _p2 = { x: null, y: null };
        _source;
        constructor(source) {
            super(source);
            this._source = source;
        }
        update() {
            if (!this._source.p1 || !this._source.p2)
                return;
            const series = this._source.series;
            const y1 = series.priceToCoordinate(this._source.p1.price);
            const y2 = series.priceToCoordinate(this._source.p2.price);
            const x1 = this._getX(this._source.p1);
            const x2 = this._getX(this._source.p2);
            this._p1 = { x: x1, y: y1 };
            this._p2 = { x: x2, y: y2 };
            if (!x1 || !x2 || !y1 || !y2)
                return;
        }
        _getX(p) {
            const timeScale = this._source.chart.timeScale();
            return timeScale.logicalToCoordinate(p.logical);
        }
    }

    class HorizontalLinePaneView extends DrawingPaneView {
        _source;
        _point = { x: null, y: null };
        constructor(source) {
            super(source);
            this._source = source;
        }
        update() {
            const point = this._source._point;
            const timeScale = this._source.chart.timeScale();
            const series = this._source.series;
            if (this._source._type == "RayLine") {
                this._point.x = point.time ? timeScale.timeToCoordinate(point.time) : timeScale.logicalToCoordinate(point.logical);
            }
            this._point.y = series.priceToCoordinate(point.price);
        }
        renderer() {
            return new HorizontalLinePaneRenderer(this._point, this._source._options);
        }
    }

    class HorizontalLineAxisView {
        _source;
        _y = null;
        _price = null;
        constructor(source) {
            this._source = source;
        }
        update() {
            if (!this._source.series || !this._source._point)
                return;
            this._y = this._source.series.priceToCoordinate(this._source._point.price);
            const priceFormat = this._source.series.options().priceFormat;
            const precision = priceFormat.precision;
            this._price = this._source._point.price.toFixed(precision).toString();
        }
        visible() {
            return true;
        }
        tickVisible() {
            return true;
        }
        coordinate() {
            return this._y ?? 0;
        }
        text() {
            return this._price || '';
        }
        textColor() {
            return 'white';
        }
        backColor() {
            return this._source._options.lineColor;
        }
    }

    class HorizontalLine extends Drawing {
        _type = 'HorizontalLine';
        _paneViews;
        _point;
        _callbackName;
        _priceAxisViews;
        _startDragPoint = null;
        constructor(point, options, callbackName = null) {
            super(options);
            this._point = point;
            this._point.time = null; // time is null for horizontal lines
            this._paneViews = [new HorizontalLinePaneView(this)];
            this._priceAxisViews = [new HorizontalLineAxisView(this)];
            this._callbackName = callbackName;
        }
        get points() {
            return [this._point];
        }
        updatePoints(...points) {
            for (const p of points)
                if (p)
                    this._point.price = p.price;
            this.requestUpdate();
        }
        updateAllViews() {
            this._paneViews.forEach((pw) => pw.update());
            this._priceAxisViews.forEach((tw) => tw.update());
        }
        priceAxisViews() {
            return this._priceAxisViews;
        }
        _moveToState(state) {
            switch (state) {
                case InteractionState.NONE:
                    document.body.style.cursor = "default";
                    this._unsubscribe("mousedown", this._handleMouseDownInteraction);
                    break;
                case InteractionState.HOVERING:
                    document.body.style.cursor = "pointer";
                    this._unsubscribe("mouseup", this._childHandleMouseUpInteraction);
                    this._subscribe("mousedown", this._handleMouseDownInteraction);
                    this.chart.applyOptions({ handleScroll: true });
                    break;
                case InteractionState.DRAGGING:
                    document.body.style.cursor = "grabbing";
                    this._subscribe("mouseup", this._childHandleMouseUpInteraction);
                    this.chart.applyOptions({ handleScroll: false });
                    break;
            }
            this._state = state;
        }
        _onDrag(diff) {
            this._addDiffToPoint(this._point, 0, diff.price);
            this.requestUpdate();
        }
        _mouseIsOverDrawing(param, tolerance = 4) {
            if (!param.point)
                return false;
            const y = this.series.priceToCoordinate(this._point.price);
            if (!y)
                return false;
            return (Math.abs(y - param.point.y) < tolerance);
        }
        _onMouseDown() {
            this._startDragPoint = null;
            const hoverPoint = this._latestHoverPoint;
            if (!hoverPoint)
                return;
            return this._moveToState(InteractionState.DRAGGING);
        }
        _childHandleMouseUpInteraction = () => {
            this._handleMouseUpInteraction();
            if (!this._callbackName)
                return;
            window.callbackFunction(`${this._callbackName}_~_${this._point.price.toFixed(8)}`);
        };
    }

    class DrawingTool {
        _chart;
        _series;
        _finishDrawingCallback = null;
        _drawings = [];
        _activeDrawing = null;
        _isDrawing = false;
        _drawingType = null;
        constructor(chart, series, finishDrawingCallback = null) {
            this._chart = chart;
            this._series = series;
            this._finishDrawingCallback = finishDrawingCallback;
            this._chart.subscribeClick(this._clickHandler);
            this._chart.subscribeCrosshairMove(this._moveHandler);
        }
        _clickHandler = (param) => this._onClick(param);
        _moveHandler = (param) => this._onMouseMove(param);
        beginDrawing(DrawingType) {
            this._drawingType = DrawingType;
            this._isDrawing = true;
        }
        stopDrawing() {
            this._isDrawing = false;
            this._activeDrawing = null;
        }
        get drawings() {
            return this._drawings;
        }
        addNewDrawing(drawing) {
            this._series.attachPrimitive(drawing);
            this._drawings.push(drawing);
        }
        delete(d) {
            if (d == null)
                return;
            const idx = this._drawings.indexOf(d);
            if (idx == -1)
                return;
            this._drawings.splice(idx, 1);
            d.detach();
        }
        clearDrawings() {
            for (const d of this._drawings)
                d.detach();
            this._drawings = [];
        }
        repositionOnTime() {
            for (const drawing of this.drawings) {
                const newPoints = [];
                for (const point of drawing.points) {
                    if (!point) {
                        newPoints.push(point);
                        continue;
                    }
                    const logical = point.time ? this._chart.timeScale()
                        .coordinateToLogical(this._chart.timeScale().timeToCoordinate(point.time) || 0) : point.logical;
                    newPoints.push({
                        time: point.time,
                        logical: logical,
                        price: point.price,
                    });
                }
                drawing.updatePoints(...newPoints);
            }
        }
        _onClick(param) {
            if (!this._isDrawing)
                return;
            const point = Drawing._eventToPoint(param, this._series);
            if (!point)
                return;
            if (this._activeDrawing == null) {
                if (this._drawingType == null)
                    return;
                this._activeDrawing = new this._drawingType(point, point);
                this._series.attachPrimitive(this._activeDrawing);
                if (this._drawingType == HorizontalLine)
                    this._onClick(param);
            }
            else {
                this._drawings.push(this._activeDrawing);
                this.stopDrawing();
                if (!this._finishDrawingCallback)
                    return;
                this._finishDrawingCallback();
            }
        }
        _onMouseMove(param) {
            if (!param)
                return;
            for (const t of this._drawings)
                t._handleHoverInteraction(param);
            if (!this._isDrawing || !this._activeDrawing)
                return;
            const point = Drawing._eventToPoint(param, this._series);
            if (!point)
                return;
            this._activeDrawing.updatePoints(null, point);
            // this._activeDrawing.setSecondPoint(point);
        }
    }

    class TrendLinePaneRenderer extends TwoPointDrawingPaneRenderer {
        constructor(p1, p2, options, hovered) {
            super(p1, p2, options, hovered);
        }
        draw(target) {
            target.useBitmapCoordinateSpace(scope => {
                if (this._p1.x === null ||
                    this._p1.y === null ||
                    this._p2.x === null ||
                    this._p2.y === null)
                    return;
                const ctx = scope.context;
                const scaled = this._getScaledCoordinates(scope);
                if (!scaled)
                    return;
                ctx.lineWidth = this._options.width;
                ctx.strokeStyle = this._options.lineColor;
                setLineStyle(ctx, this._options.lineStyle);
                ctx.beginPath();
                ctx.moveTo(scaled.x1, scaled.y1);
                ctx.lineTo(scaled.x2, scaled.y2);
                ctx.stroke();
                // this._drawTextLabel(scope, this._text1, x1Scaled, y1Scaled, true);
                // this._drawTextLabel(scope, this._text2, x2Scaled, y2Scaled, false);
                if (!this._hovered)
                    return;
                this._drawEndCircle(scope, scaled.x1, scaled.y1);
                this._drawEndCircle(scope, scaled.x2, scaled.y2);
            });
        }
    }

    class TrendLinePaneView extends TwoPointDrawingPaneView {
        constructor(source) {
            super(source);
        }
        renderer() {
            return new TrendLinePaneRenderer(this._p1, this._p2, this._source._options, this._source.hovered);
        }
    }

    class TwoPointDrawing extends Drawing {
        _paneViews = [];
        _hovered = false;
        constructor(p1, p2, options) {
            super();
            this.points.push(p1);
            this.points.push(p2);
            this._options = {
                ...defaultOptions,
                ...options,
            };
        }
        setFirstPoint(point) {
            this.updatePoints(point);
        }
        setSecondPoint(point) {
            this.updatePoints(null, point);
        }
        get p1() { return this.points[0]; }
        get p2() { return this.points[1]; }
        get hovered() { return this._hovered; }
    }

    class TrendLine extends TwoPointDrawing {
        _type = "TrendLine";
        constructor(p1, p2, options) {
            super(p1, p2, options);
            this._paneViews = [new TrendLinePaneView(this)];
        }
        _moveToState(state) {
            switch (state) {
                case InteractionState.NONE:
                    document.body.style.cursor = "default";
                    this._hovered = false;
                    this.requestUpdate();
                    this._unsubscribe("mousedown", this._handleMouseDownInteraction);
                    break;
                case InteractionState.HOVERING:
                    document.body.style.cursor = "pointer";
                    this._hovered = true;
                    this.requestUpdate();
                    this._subscribe("mousedown", this._handleMouseDownInteraction);
                    this._unsubscribe("mouseup", this._handleMouseDownInteraction);
                    this.chart.applyOptions({ handleScroll: true });
                    break;
                case InteractionState.DRAGGINGP1:
                case InteractionState.DRAGGINGP2:
                case InteractionState.DRAGGING:
                    document.body.style.cursor = "grabbing";
                    this._subscribe("mouseup", this._handleMouseUpInteraction);
                    this.chart.applyOptions({ handleScroll: false });
                    break;
            }
            this._state = state;
        }
        _onDrag(diff) {
            if (this._state == InteractionState.DRAGGING || this._state == InteractionState.DRAGGINGP1) {
                this._addDiffToPoint(this.p1, diff.logical, diff.price);
            }
            if (this._state == InteractionState.DRAGGING || this._state == InteractionState.DRAGGINGP2) {
                this._addDiffToPoint(this.p2, diff.logical, diff.price);
            }
        }
        _onMouseDown() {
            this._startDragPoint = null;
            const hoverPoint = this._latestHoverPoint;
            if (!hoverPoint)
                return;
            const p1 = this._paneViews[0]._p1;
            const p2 = this._paneViews[0]._p2;
            if (!p1.x || !p2.x || !p1.y || !p2.y)
                return this._moveToState(InteractionState.DRAGGING);
            const tolerance = 10;
            if (Math.abs(hoverPoint.x - p1.x) < tolerance && Math.abs(hoverPoint.y - p1.y) < tolerance) {
                this._moveToState(InteractionState.DRAGGINGP1);
            }
            else if (Math.abs(hoverPoint.x - p2.x) < tolerance && Math.abs(hoverPoint.y - p2.y) < tolerance) {
                this._moveToState(InteractionState.DRAGGINGP2);
            }
            else {
                this._moveToState(InteractionState.DRAGGING);
            }
        }
        _mouseIsOverDrawing(param, tolerance = 4) {
            if (!param.point)
                return false;
            const x1 = this._paneViews[0]._p1.x;
            const y1 = this._paneViews[0]._p1.y;
            const x2 = this._paneViews[0]._p2.x;
            const y2 = this._paneViews[0]._p2.y;
            if (!x1 || !x2 || !y1 || !y2)
                return false;
            const mouseX = param.point.x;
            const mouseY = param.point.y;
            if (mouseX <= Math.min(x1, x2) - tolerance ||
                mouseX >= Math.max(x1, x2) + tolerance) {
                return false;
            }
            const distance = Math.abs((y2 - y1) * mouseX - (x2 - x1) * mouseY + x2 * y1 - y2 * x1) / Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);
            return distance <= tolerance;
        }
    }

    class BoxPaneRenderer extends TwoPointDrawingPaneRenderer {
        constructor(p1, p2, options, showCircles) {
            super(p1, p2, options, showCircles);
        }
        draw(target) {
            target.useBitmapCoordinateSpace(scope => {
                const ctx = scope.context;
                const scaled = this._getScaledCoordinates(scope);
                if (!scaled)
                    return;
                ctx.lineWidth = this._options.width;
                ctx.strokeStyle = this._options.lineColor;
                setLineStyle(ctx, this._options.lineStyle);
                ctx.fillStyle = this._options.fillColor;
                const mainX = Math.min(scaled.x1, scaled.x2);
                const mainY = Math.min(scaled.y1, scaled.y2);
                const width = Math.abs(scaled.x1 - scaled.x2);
                const height = Math.abs(scaled.y1 - scaled.y2);
                ctx.strokeRect(mainX, mainY, width, height);
                ctx.fillRect(mainX, mainY, width, height);
                if (!this._hovered)
                    return;
                this._drawEndCircle(scope, mainX, mainY);
                this._drawEndCircle(scope, mainX + width, mainY);
                this._drawEndCircle(scope, mainX + width, mainY + height);
                this._drawEndCircle(scope, mainX, mainY + height);
            });
        }
    }

    class BoxPaneView extends TwoPointDrawingPaneView {
        constructor(source) {
            super(source);
        }
        renderer() {
            return new BoxPaneRenderer(this._p1, this._p2, this._source._options, this._source.hovered);
        }
    }

    const defaultBoxOptions = {
        fillEnabled: true,
        fillColor: 'rgba(255, 255, 255, 0.2)',
        ...defaultOptions
    };
    class Box extends TwoPointDrawing {
        _type = "Box";
        constructor(p1, p2, options) {
            super(p1, p2, options);
            this._options = {
                ...defaultBoxOptions,
                ...options,
            };
            this._paneViews = [new BoxPaneView(this)];
        }
        // autoscaleInfo(startTimePoint: Logical, endTimePoint: Logical): AutoscaleInfo | null {
        // const p1Index = this._pointIndex(this._p1);
        // const p2Index = this._pointIndex(this._p2);
        // if (p1Index === null || p2Index === null) return null;
        // if (endTimePoint < p1Index || startTimePoint > p2Index) return null;
        // return {
        //  priceRange: {
        //      minValue: this._minPrice,
        //      maxValue: this._maxPrice,
        //  },
        // };
        // }
        _moveToState(state) {
            switch (state) {
                case InteractionState.NONE:
                    document.body.style.cursor = "default";
                    this._hovered = false;
                    this._unsubscribe("mousedown", this._handleMouseDownInteraction);
                    break;
                case InteractionState.HOVERING:
                    document.body.style.cursor = "pointer";
                    this._hovered = true;
                    this._unsubscribe("mouseup", this._handleMouseUpInteraction);
                    this._subscribe("mousedown", this._handleMouseDownInteraction);
                    this.chart.applyOptions({ handleScroll: true });
                    break;
                case InteractionState.DRAGGINGP1:
                case InteractionState.DRAGGINGP2:
                case InteractionState.DRAGGINGP3:
                case InteractionState.DRAGGINGP4:
                case InteractionState.DRAGGING:
                    document.body.style.cursor = "grabbing";
                    document.body.addEventListener("mouseup", this._handleMouseUpInteraction);
                    this._subscribe("mouseup", this._handleMouseUpInteraction);
                    this.chart.applyOptions({ handleScroll: false });
                    break;
            }
            this._state = state;
        }
        _onDrag(diff) {
            if (this._state == InteractionState.DRAGGING || this._state == InteractionState.DRAGGINGP1) {
                this._addDiffToPoint(this.p1, diff.logical, diff.price);
            }
            if (this._state == InteractionState.DRAGGING || this._state == InteractionState.DRAGGINGP2) {
                this._addDiffToPoint(this.p2, diff.logical, diff.price);
            }
            if (this._state != InteractionState.DRAGGING) {
                if (this._state == InteractionState.DRAGGINGP3) {
                    this._addDiffToPoint(this.p1, diff.logical, 0);
                    this._addDiffToPoint(this.p2, 0, diff.price);
                }
                if (this._state == InteractionState.DRAGGINGP4) {
                    this._addDiffToPoint(this.p1, 0, diff.price);
                    this._addDiffToPoint(this.p2, diff.logical, 0);
                }
            }
        }
        _onMouseDown() {
            this._startDragPoint = null;
            const hoverPoint = this._latestHoverPoint;
            const p1 = this._paneViews[0]._p1;
            const p2 = this._paneViews[0]._p2;
            if (!p1.x || !p2.x || !p1.y || !p2.y)
                return this._moveToState(InteractionState.DRAGGING);
            const tolerance = 10;
            if (Math.abs(hoverPoint.x - p1.x) < tolerance && Math.abs(hoverPoint.y - p1.y) < tolerance) {
                this._moveToState(InteractionState.DRAGGINGP1);
            }
            else if (Math.abs(hoverPoint.x - p2.x) < tolerance && Math.abs(hoverPoint.y - p2.y) < tolerance) {
                this._moveToState(InteractionState.DRAGGINGP2);
            }
            else if (Math.abs(hoverPoint.x - p1.x) < tolerance && Math.abs(hoverPoint.y - p2.y) < tolerance) {
                this._moveToState(InteractionState.DRAGGINGP3);
            }
            else if (Math.abs(hoverPoint.x - p2.x) < tolerance && Math.abs(hoverPoint.y - p1.y) < tolerance) {
                this._moveToState(InteractionState.DRAGGINGP4);
            }
            else {
                this._moveToState(InteractionState.DRAGGING);
            }
        }
        _mouseIsOverDrawing(param, tolerance = 4) {
            if (!param.point)
                return false;
            const x1 = this._paneViews[0]._p1.x;
            const y1 = this._paneViews[0]._p1.y;
            const x2 = this._paneViews[0]._p2.x;
            const y2 = this._paneViews[0]._p2.y;
            if (!x1 || !x2 || !y1 || !y2)
                return false;
            const mouseX = param.point.x;
            const mouseY = param.point.y;
            const mainX = Math.min(x1, x2);
            const mainY = Math.min(y1, y2);
            const width = Math.abs(x1 - x2);
            const height = Math.abs(y1 - y2);
            const halfTolerance = tolerance / 2;
            return mouseX > mainX - halfTolerance && mouseX < mainX + width + halfTolerance &&
                mouseY > mainY - halfTolerance && mouseY < mainY + height + halfTolerance;
        }
    }

    class ColorPicker {
        colorOption;
        static colors = [
            '#EBB0B0', '#E9CEA1', '#E5DF80', '#ADEB97', '#A3C3EA', '#D8BDED',
            '#E15F5D', '#E1B45F', '#E2D947', '#4BE940', '#639AE1', '#D7A0E8',
            '#E42C2A', '#E49D30', '#E7D827', '#3CFF0A', '#3275E4', '#B06CE3',
            '#F3000D', '#EE9A14', '#F1DA13', '#2DFC0F', '#1562EE', '#BB00EF',
            '#B50911', '#E3860E', '#D2BD11', '#48DE0E', '#1455B4', '#6E009F',
            '#7C1713', '#B76B12', '#8D7A13', '#479C12', '#165579', '#51007E',
        ];
        _div;
        saveDrawings;
        opacity = 0;
        _opacitySlider;
        _opacityLabel;
        rgba;
        constructor(saveDrawings, colorOption) {
            this.colorOption = colorOption;
            this.saveDrawings = saveDrawings;
            this._div = document.createElement('div');
            this._div.classList.add('color-picker');
            let colorPicker = document.createElement('div');
            colorPicker.style.margin = '10px';
            colorPicker.style.display = 'flex';
            colorPicker.style.flexWrap = 'wrap';
            ColorPicker.colors.forEach((color) => colorPicker.appendChild(this.makeColorBox(color)));
            let separator = document.createElement('div');
            separator.style.backgroundColor = window.pane.borderColor;
            separator.style.height = '1px';
            separator.style.width = '130px';
            let opacity = document.createElement('div');
            opacity.style.margin = '10px';
            let opacityText = document.createElement('div');
            opacityText.style.color = 'lightgray';
            opacityText.style.fontSize = '12px';
            opacityText.innerText = 'Opacity';
            this._opacityLabel = document.createElement('div');
            this._opacityLabel.style.color = 'lightgray';
            this._opacityLabel.style.fontSize = '12px';
            this._opacitySlider = document.createElement('input');
            this._opacitySlider.type = 'range';
            this._opacitySlider.value = (this.opacity * 100).toString();
            this._opacityLabel.innerText = this._opacitySlider.value + '%';
            this._opacitySlider.oninput = () => {
                this._opacityLabel.innerText = this._opacitySlider.value + '%';
                this.opacity = parseInt(this._opacitySlider.value) / 100;
                this.updateColor();
            };
            opacity.appendChild(opacityText);
            opacity.appendChild(this._opacitySlider);
            opacity.appendChild(this._opacityLabel);
            this._div.appendChild(colorPicker);
            this._div.appendChild(separator);
            this._div.appendChild(opacity);
            window.containerDiv.appendChild(this._div);
        }
        _updateOpacitySlider() {
            this._opacitySlider.value = (this.opacity * 100).toString();
            this._opacityLabel.innerText = this._opacitySlider.value + '%';
        }
        makeColorBox(color) {
            const box = document.createElement('div');
            box.style.width = '18px';
            box.style.height = '18px';
            box.style.borderRadius = '3px';
            box.style.margin = '3px';
            box.style.boxSizing = 'border-box';
            box.style.backgroundColor = color;
            box.addEventListener('mouseover', () => box.style.border = '2px solid lightgray');
            box.addEventListener('mouseout', () => box.style.border = 'none');
            const rgba = ColorPicker.extractRGBA(color);
            box.addEventListener('click', () => {
                this.rgba = rgba;
                this.updateColor();
            });
            return box;
        }
        static extractRGBA(anyColor) {
            const dummyElem = document.createElement('div');
            dummyElem.style.color = anyColor;
            document.body.appendChild(dummyElem);
            const computedColor = getComputedStyle(dummyElem).color;
            document.body.removeChild(dummyElem);
            const rgb = computedColor.match(/\d+/g)?.map(Number);
            if (!rgb)
                return [];
            let isRgba = computedColor.includes('rgba');
            let opacity = isRgba ? parseFloat(computedColor.split(',')[3]) : 1;
            return [rgb[0], rgb[1], rgb[2], opacity];
        }
        updateColor() {
            if (!Drawing.lastHoveredObject || !this.rgba)
                return;
            const oColor = `rgba(${this.rgba[0]}, ${this.rgba[1]}, ${this.rgba[2]}, ${this.opacity})`;
            Drawing.lastHoveredObject.applyOptions({ [this.colorOption]: oColor });
            this.saveDrawings();
        }
        openMenu(rect) {
            if (!Drawing.lastHoveredObject)
                return;
            this.rgba = ColorPicker.extractRGBA(Drawing.lastHoveredObject._options[this.colorOption]);
            this.opacity = this.rgba[3];
            this._updateOpacitySlider();
            this._div.style.top = (rect.top - 30) + 'px';
            this._div.style.left = rect.right + 'px';
            this._div.style.display = 'flex';
            setTimeout(() => document.addEventListener('mousedown', (event) => {
                if (!this._div.contains(event.target)) {
                    this.closeMenu();
                }
            }), 10);
        }
        closeMenu() {
            document.body.removeEventListener('click', this.closeMenu);
            this._div.style.display = 'none';
        }
    }

    class StylePicker {
        static _styles = [
            { name: 'Solid', var: lightweightCharts.LineStyle.Solid },
            { name: 'Dotted', var: lightweightCharts.LineStyle.Dotted },
            { name: 'Dashed', var: lightweightCharts.LineStyle.Dashed },
            { name: 'Large Dashed', var: lightweightCharts.LineStyle.LargeDashed },
            { name: 'Sparse Dotted', var: lightweightCharts.LineStyle.SparseDotted },
        ];
        _div;
        _saveDrawings;
        constructor(saveDrawings) {
            this._saveDrawings = saveDrawings;
            this._div = document.createElement('div');
            this._div.classList.add('context-menu');
            StylePicker._styles.forEach((style) => {
                this._div.appendChild(this._makeTextBox(style.name, style.var));
            });
            window.containerDiv.appendChild(this._div);
        }
        _makeTextBox(text, style) {
            const item = document.createElement('span');
            item.classList.add('context-menu-item');
            item.innerText = text;
            item.addEventListener('click', () => {
                Drawing.lastHoveredObject?.applyOptions({ lineStyle: style });
                this._saveDrawings();
            });
            return item;
        }
        openMenu(rect) {
            this._div.style.top = (rect.top - 30) + 'px';
            this._div.style.left = rect.right + 'px';
            this._div.style.display = 'block';
            setTimeout(() => document.addEventListener('mousedown', (event) => {
                if (!this._div.contains(event.target)) {
                    this.closeMenu();
                }
            }), 10);
        }
        closeMenu() {
            document.removeEventListener('click', this.closeMenu);
            this._div.style.display = 'none';
        }
    }

    function camelToTitle(inputString) {
        const result = [];
        for (const c of inputString) {
            if (result.length == 0) {
                result.push(c.toUpperCase());
            }
            else if (c == c.toUpperCase()) {
                result.push(' ' + c);
            }
            else
                result.push(c);
        }
        return result.join('');
    }
    class ContextMenu {
        saveDrawings;
        drawingTool;
        div;
        hoverItem;
        items = [];
        constructor(saveDrawings, drawingTool) {
            this.saveDrawings = saveDrawings;
            this.drawingTool = drawingTool;
            this._onRightClick = this._onRightClick.bind(this);
            this.div = document.createElement('div');
            this.div.classList.add('context-menu');
            document.body.appendChild(this.div);
            this.hoverItem = null;
            document.body.addEventListener('contextmenu', this._onRightClick);
        }
        _handleClick = (ev) => this._onClick(ev);
        _onClick(ev) {
            if (!ev.target)
                return;
            if (!this.div.contains(ev.target)) {
                this.div.style.display = 'none';
                document.body.removeEventListener('click', this._handleClick);
            }
        }
        _onRightClick(ev) {
            if (!Drawing.hoveredObject)
                return;
            for (const item of this.items) {
                this.div.removeChild(item);
            }
            this.items = [];
            for (const optionName of Object.keys(Drawing.hoveredObject._options)) {
                let subMenu;
                if (optionName.toLowerCase().includes('color')) {
                    subMenu = new ColorPicker(this.saveDrawings, optionName);
                }
                else if (optionName === 'lineStyle') {
                    subMenu = new StylePicker(this.saveDrawings);
                }
                else
                    continue;
                let onClick = (rect) => subMenu.openMenu(rect);
                this.menuItem(camelToTitle(optionName), onClick, () => {
                    document.removeEventListener('click', subMenu.closeMenu);
                    subMenu._div.style.display = 'none';
                });
            }
            let onClickDelete = () => this.drawingTool.delete(Drawing.lastHoveredObject);
            this.separator();
            this.menuItem('Delete Drawing', onClickDelete);
            // const colorPicker = new ColorPicker(this.saveDrawings)
            // const stylePicker = new StylePicker(this.saveDrawings)
            // let onClickDelete = () => this._drawingTool.delete(Drawing.lastHoveredObject);
            // let onClickColor = (rect: DOMRect) => colorPicker.openMenu(rect)
            // let onClickStyle = (rect: DOMRect) => stylePicker.openMenu(rect)
            // contextMenu.menuItem('Color Picker', onClickColor, () => {
            //     document.removeEventListener('click', colorPicker.closeMenu)
            //     colorPicker._div.style.display = 'none'
            // })
            // contextMenu.menuItem('Style', onClickStyle, () => {
            //     document.removeEventListener('click', stylePicker.closeMenu)
            //     stylePicker._div.style.display = 'none'
            // })
            // contextMenu.separator()
            // contextMenu.menuItem('Delete Drawing', onClickDelete)
            ev.preventDefault();
            this.div.style.left = ev.clientX + 'px';
            this.div.style.top = ev.clientY + 'px';
            this.div.style.display = 'block';
            document.body.addEventListener('click', this._handleClick);
        }
        menuItem(text, action, hover = null) {
            const item = document.createElement('span');
            item.classList.add('context-menu-item');
            this.div.appendChild(item);
            const elem = document.createElement('span');
            elem.innerText = text;
            elem.style.pointerEvents = 'none';
            item.appendChild(elem);
            if (hover) {
                let arrow = document.createElement('span');
                arrow.innerText = `►`;
                arrow.style.fontSize = '8px';
                arrow.style.pointerEvents = 'none';
                item.appendChild(arrow);
            }
            item.addEventListener('mouseover', () => {
                if (this.hoverItem && this.hoverItem.closeAction)
                    this.hoverItem.closeAction();
                this.hoverItem = { elem: elem, action: action, closeAction: hover };
            });
            if (!hover)
                item.addEventListener('click', (event) => { action(event); this.div.style.display = 'none'; });
            else {
                let timeout;
                item.addEventListener('mouseover', () => timeout = setTimeout(() => action(item.getBoundingClientRect()), 100));
                item.addEventListener('mouseout', () => clearTimeout(timeout));
            }
            this.items.push(item);
        }
        separator() {
            const separator = document.createElement('div');
            separator.style.width = '90%';
            separator.style.height = '1px';
            separator.style.margin = '3px 0px';
            separator.style.backgroundColor = window.pane.borderColor;
            this.div.appendChild(separator);
            this.items.push(separator);
        }
    }

    class RayLine extends HorizontalLine {
        _type = 'RayLine';
        constructor(point, options) {
            super({ ...point }, options);
            this._point.time = point.time;
        }
        updatePoints(...points) {
            for (const p of points)
                if (p)
                    this._point = p;
            this.requestUpdate();
        }
        _onDrag(diff) {
            this._addDiffToPoint(this._point, diff.logical, diff.price);
            this.requestUpdate();
        }
        _mouseIsOverDrawing(param, tolerance = 4) {
            if (!param.point)
                return false;
            const y = this.series.priceToCoordinate(this._point.price);
            const x = this._point.time ? this.chart.timeScale().timeToCoordinate(this._point.time) : null;
            if (!y || !x)
                return false;
            return (Math.abs(y - param.point.y) < tolerance && param.point.x > x - tolerance);
        }
    }

    class VerticalLinePaneRenderer extends DrawingPaneRenderer {
        _point = { x: null, y: null };
        constructor(point, options) {
            super(options);
            this._point = point;
        }
        draw(target) {
            target.useBitmapCoordinateSpace(scope => {
                if (this._point.x == null)
                    return;
                const ctx = scope.context;
                const scaledX = this._point.x * scope.horizontalPixelRatio;
                ctx.lineWidth = this._options.width;
                ctx.strokeStyle = this._options.lineColor;
                setLineStyle(ctx, this._options.lineStyle);
                ctx.beginPath();
                ctx.moveTo(scaledX, 0);
                ctx.lineTo(scaledX, scope.bitmapSize.height);
                ctx.stroke();
            });
        }
    }

    class VerticalLinePaneView extends DrawingPaneView {
        _source;
        _point = { x: null, y: null };
        constructor(source) {
            super(source);
            this._source = source;
        }
        update() {
            const point = this._source._point;
            const timeScale = this._source.chart.timeScale();
            const series = this._source.series;
            this._point.x = point.time ? timeScale.timeToCoordinate(point.time) : timeScale.logicalToCoordinate(point.logical);
            this._point.y = series.priceToCoordinate(point.price);
        }
        renderer() {
            return new VerticalLinePaneRenderer(this._point, this._source._options);
        }
    }

    class VerticalLineTimeAxisView {
        _source;
        _x = null;
        constructor(source) {
            this._source = source;
        }
        update() {
            if (!this._source.chart || !this._source._point)
                return;
            const point = this._source._point;
            const timeScale = this._source.chart.timeScale();
            this._x = point.time ? timeScale.timeToCoordinate(point.time) : timeScale.logicalToCoordinate(point.logical);
        }
        visible() {
            return true;
        }
        tickVisible() {
            return true;
        }
        coordinate() {
            return this._x ?? 0;
        }
        text() {
            return '';
        }
        textColor() {
            return "white";
        }
        backColor() {
            return this._source._options.lineColor;
        }
    }

    class VerticalLine extends Drawing {
        _type = 'VerticalLine';
        _paneViews;
        _timeAxisViews;
        _point;
        _callbackName;
        _startDragPoint = null;
        constructor(point, options, callbackName = null) {
            super(options);
            this._point = point;
            this._paneViews = [new VerticalLinePaneView(this)];
            this._callbackName = callbackName;
            this._timeAxisViews = [new VerticalLineTimeAxisView(this)];
        }
        updateAllViews() {
            this._paneViews.forEach(pw => pw.update());
            this._timeAxisViews.forEach(tw => tw.update());
        }
        timeAxisViews() {
            return this._timeAxisViews;
        }
        updatePoints(...points) {
            for (const p of points) {
                if (!p)
                    continue;
                if (!p.time && p.logical) {
                    p.time = this.series.dataByIndex(p.logical)?.time || null;
                }
                this._point = p;
            }
            this.requestUpdate();
        }
        get points() {
            return [this._point];
        }
        _moveToState(state) {
            switch (state) {
                case InteractionState.NONE:
                    document.body.style.cursor = "default";
                    this._unsubscribe("mousedown", this._handleMouseDownInteraction);
                    break;
                case InteractionState.HOVERING:
                    document.body.style.cursor = "pointer";
                    this._unsubscribe("mouseup", this._childHandleMouseUpInteraction);
                    this._subscribe("mousedown", this._handleMouseDownInteraction);
                    this.chart.applyOptions({ handleScroll: true });
                    break;
                case InteractionState.DRAGGING:
                    document.body.style.cursor = "grabbing";
                    this._subscribe("mouseup", this._childHandleMouseUpInteraction);
                    this.chart.applyOptions({ handleScroll: false });
                    break;
            }
            this._state = state;
        }
        _onDrag(diff) {
            this._addDiffToPoint(this._point, diff.logical, 0);
            this.requestUpdate();
        }
        _mouseIsOverDrawing(param, tolerance = 4) {
            if (!param.point)
                return false;
            const timeScale = this.chart.timeScale();
            let x;
            if (this._point.time) {
                x = timeScale.timeToCoordinate(this._point.time);
            }
            else {
                x = timeScale.logicalToCoordinate(this._point.logical);
            }
            if (!x)
                return false;
            return (Math.abs(x - param.point.x) < tolerance);
        }
        _onMouseDown() {
            this._startDragPoint = null;
            const hoverPoint = this._latestHoverPoint;
            if (!hoverPoint)
                return;
            return this._moveToState(InteractionState.DRAGGING);
        }
        _childHandleMouseUpInteraction = () => {
            this._handleMouseUpInteraction();
            if (!this._callbackName)
                return;
            window.callbackFunction(`${this._callbackName}_~_${this._point.price.toFixed(8)}`);
        };
    }

    class ToolBox {
        static TREND_SVG = '<rect x="3.84" y="13.67" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -5.9847 14.4482)" width="21.21" height="1.56"/><path d="M23,3.17L20.17,6L23,8.83L25.83,6L23,3.17z M23,7.41L21.59,6L23,4.59L24.41,6L23,7.41z"/><path d="M6,20.17L3.17,23L6,25.83L8.83,23L6,20.17z M6,24.41L4.59,23L6,21.59L7.41,23L6,24.41z"/>';
        static HORZ_SVG = '<rect x="4" y="14" width="9" height="1"/><rect x="16" y="14" width="9" height="1"/><path d="M11.67,14.5l2.83,2.83l2.83-2.83l-2.83-2.83L11.67,14.5z M15.91,14.5l-1.41,1.41l-1.41-1.41l1.41-1.41L15.91,14.5z"/>';
        static RAY_SVG = '<rect x="8" y="14" width="17" height="1"/><path d="M3.67,14.5l2.83,2.83l2.83-2.83L6.5,11.67L3.67,14.5z M7.91,14.5L6.5,15.91L5.09,14.5l1.41-1.41L7.91,14.5z"/>';
        static BOX_SVG = '<rect x="8" y="6" width="12" height="1"/><rect x="9" y="22" width="11" height="1"/><path d="M3.67,6.5L6.5,9.33L9.33,6.5L6.5,3.67L3.67,6.5z M7.91,6.5L6.5,7.91L5.09,6.5L6.5,5.09L7.91,6.5z"/><path d="M19.67,6.5l2.83,2.83l2.83-2.83L22.5,3.67L19.67,6.5z M23.91,6.5L22.5,7.91L21.09,6.5l1.41-1.41L23.91,6.5z"/><path d="M19.67,22.5l2.83,2.83l2.83-2.83l-2.83-2.83L19.67,22.5z M23.91,22.5l-1.41,1.41l-1.41-1.41l1.41-1.41L23.91,22.5z"/><path d="M3.67,22.5l2.83,2.83l2.83-2.83L6.5,19.67L3.67,22.5z M7.91,22.5L6.5,23.91L5.09,22.5l1.41-1.41L7.91,22.5z"/><rect x="22" y="9" width="1" height="11"/><rect x="6" y="9" width="1" height="11"/>';
        static VERT_SVG = ToolBox.RAY_SVG;
        div;
        activeIcon = null;
        buttons = [];
        _commandFunctions;
        _handlerID;
        _drawingTool;
        constructor(handlerID, chart, series, commandFunctions) {
            this._handlerID = handlerID;
            this._commandFunctions = commandFunctions;
            this._drawingTool = new DrawingTool(chart, series, () => this.removeActiveAndSave());
            this.div = this._makeToolBox();
            new ContextMenu(this.saveDrawings, this._drawingTool);
            commandFunctions.push((event) => {
                if ((event.metaKey || event.ctrlKey) && event.code === 'KeyZ') {
                    const drawingToDelete = this._drawingTool.drawings.pop();
                    if (drawingToDelete)
                        this._drawingTool.delete(drawingToDelete);
                    return true;
                }
                return false;
            });
        }
        toJSON() {
            // Exclude the chart attribute from serialization
            const { ...serialized } = this;
            return serialized;
        }
        _makeToolBox() {
            let div = document.createElement('div');
            div.classList.add('toolbox');
            this.buttons.push(this._makeToolBoxElement(TrendLine, 'KeyT', ToolBox.TREND_SVG));
            this.buttons.push(this._makeToolBoxElement(HorizontalLine, 'KeyH', ToolBox.HORZ_SVG));
            this.buttons.push(this._makeToolBoxElement(RayLine, 'KeyR', ToolBox.RAY_SVG));
            this.buttons.push(this._makeToolBoxElement(Box, 'KeyB', ToolBox.BOX_SVG));
            this.buttons.push(this._makeToolBoxElement(VerticalLine, 'KeyV', ToolBox.VERT_SVG, true));
            for (const button of this.buttons) {
                div.appendChild(button);
            }
            return div;
        }
        _makeToolBoxElement(DrawingType, keyCmd, paths, rotate = false) {
            const elem = document.createElement('div');
            elem.classList.add("toolbox-button");
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("width", "29");
            svg.setAttribute("height", "29");
            const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
            group.innerHTML = paths;
            group.setAttribute("fill", window.pane.color);
            svg.appendChild(group);
            elem.appendChild(svg);
            const icon = { div: elem, group: group, type: DrawingType };
            elem.addEventListener('click', () => this._onIconClick(icon));
            this._commandFunctions.push((event) => {
                if (this._handlerID !== window.handlerInFocus)
                    return false;
                if (event.altKey && event.code === keyCmd) {
                    event.preventDefault();
                    this._onIconClick(icon);
                    return true;
                }
                return false;
            });
            if (rotate == true) {
                svg.style.transform = 'rotate(90deg)';
                svg.style.transformBox = 'fill-box';
                svg.style.transformOrigin = 'center';
            }
            return elem;
        }
        _onIconClick(icon) {
            if (this.activeIcon) {
                this.activeIcon.div.classList.remove('active-toolbox-button');
                window.setCursor('crosshair');
                this._drawingTool?.stopDrawing();
                if (this.activeIcon === icon) {
                    this.activeIcon = null;
                    return;
                }
            }
            this.activeIcon = icon;
            this.activeIcon.div.classList.add('active-toolbox-button');
            window.setCursor('crosshair');
            this._drawingTool?.beginDrawing(this.activeIcon.type);
        }
        removeActiveAndSave = () => {
            window.setCursor('default');
            if (this.activeIcon)
                this.activeIcon.div.classList.remove('active-toolbox-button');
            this.activeIcon = null;
            this.saveDrawings();
        };
        addNewDrawing(d) {
            this._drawingTool.addNewDrawing(d);
        }
        clearDrawings() {
            this._drawingTool.clearDrawings();
        }
        saveDrawings = () => {
            const drawingMeta = [];
            for (const d of this._drawingTool.drawings) {
                drawingMeta.push({
                    type: d._type,
                    points: d.points,
                    options: d._options
                });
            }
            const string = JSON.stringify(drawingMeta);
            window.callbackFunction(`save_drawings${this._handlerID}_~_${string}`);
        };
        loadDrawings(drawings) {
            drawings.forEach((d) => {
                switch (d.type) {
                    case "Box":
                        this._drawingTool.addNewDrawing(new Box(d.points[0], d.points[1], d.options));
                        break;
                    case "TrendLine":
                        this._drawingTool.addNewDrawing(new TrendLine(d.points[0], d.points[1], d.options));
                        break;
                    case "HorizontalLine":
                        this._drawingTool.addNewDrawing(new HorizontalLine(d.points[0], d.options));
                        break;
                    case "RayLine":
                        this._drawingTool.addNewDrawing(new RayLine(d.points[0], d.options));
                        break;
                    case "VerticalLine":
                        this._drawingTool.addNewDrawing(new VerticalLine(d.points[0], d.options));
                        break;
                }
            });
        }
    }

    class Menu {
        makeButton;
        callbackName;
        div;
        isOpen = false;
        widget;
        constructor(makeButton, callbackName, items, activeItem, separator, align) {
            this.makeButton = makeButton;
            this.callbackName = callbackName;
            this.div = document.createElement('div');
            this.div.classList.add('topbar-menu');
            this.widget = this.makeButton(activeItem + ' ↓', null, separator, true, align);
            this.updateMenuItems(items);
            this.widget.elem.addEventListener('click', () => {
                this.isOpen = !this.isOpen;
                if (!this.isOpen) {
                    this.div.style.display = 'none';
                    return;
                }
                let rect = this.widget.elem.getBoundingClientRect();
                this.div.style.display = 'flex';
                this.div.style.flexDirection = 'column';
                let center = rect.x + (rect.width / 2);
                this.div.style.left = center - (this.div.clientWidth / 2) + 'px';
                this.div.style.top = rect.y + rect.height + 'px';
            });
            document.body.appendChild(this.div);
        }
        updateMenuItems(items) {
            this.div.innerHTML = '';
            items.forEach(text => {
                let button = this.makeButton(text, null, false, false);
                button.elem.addEventListener('click', () => {
                    this._clickHandler(button.elem.innerText);
                });
                button.elem.style.margin = '4px 4px';
                button.elem.style.padding = '2px 2px';
                this.div.appendChild(button.elem);
            });
            this.widget.elem.innerText = items[0] + ' ↓';
        }
        _clickHandler(name) {
            this.widget.elem.innerText = name + ' ↓';
            window.callbackFunction(`${this.callbackName}_~_${name}`);
            this.div.style.display = 'none';
            this.isOpen = false;
        }
    }

    class TopBar {
        _handler;
        _div;
        left;
        right;
        constructor(handler) {
            this._handler = handler;
            this._div = document.createElement('div');
            this._div.classList.add('topbar');
            const createTopBarContainer = (justification) => {
                const div = document.createElement('div');
                div.classList.add('topbar-container');
                div.style.justifyContent = justification;
                this._div.appendChild(div);
                return div;
            };
            this.left = createTopBarContainer('flex-start');
            this.right = createTopBarContainer('flex-end');
        }
        makeSwitcher(items, defaultItem, callbackName, align = 'left') {
            const switcherElement = document.createElement('div');
            switcherElement.style.margin = '4px 12px';
            let activeItemEl;
            const createAndReturnSwitcherButton = (itemName) => {
                const button = document.createElement('button');
                button.classList.add('topbar-button');
                button.classList.add('switcher-button');
                button.style.margin = '0px 2px';
                button.innerText = itemName;
                if (itemName == defaultItem) {
                    activeItemEl = button;
                    button.classList.add('active-switcher-button');
                }
                const buttonWidth = TopBar.getClientWidth(button);
                button.style.minWidth = buttonWidth + 1 + 'px';
                button.addEventListener('click', () => widget.onItemClicked(button));
                switcherElement.appendChild(button);
                return button;
            };
            const widget = {
                elem: switcherElement,
                callbackName: callbackName,
                intervalElements: items.map(createAndReturnSwitcherButton),
                onItemClicked: (item) => {
                    if (item == activeItemEl)
                        return;
                    activeItemEl.classList.remove('active-switcher-button');
                    item.classList.add('active-switcher-button');
                    activeItemEl = item;
                    window.callbackFunction(`${widget.callbackName}_~_${item.innerText}`);
                }
            };
            this.appendWidget(switcherElement, align, true);
            return widget;
        }
        makeTextBoxWidget(text, align = 'left', callbackName = null) {
            if (callbackName) {
                const textBox = document.createElement('input');
                textBox.classList.add('topbar-textbox-input');
                textBox.value = text;
                textBox.style.width = `${(textBox.value.length + 2)}ch`;
                textBox.addEventListener('focus', () => {
                    window.textBoxFocused = true;
                });
                textBox.addEventListener('input', (e) => {
                    e.preventDefault();
                    textBox.style.width = `${(textBox.value.length + 2)}ch`;
                });
                textBox.addEventListener('keydown', (e) => {
                    if (e.key == 'Enter') {
                        e.preventDefault();
                        textBox.blur();
                    }
                });
                textBox.addEventListener('blur', () => {
                    window.callbackFunction(`${callbackName}_~_${textBox.value}`);
                    window.textBoxFocused = false;
                });
                this.appendWidget(textBox, align, true);
                return textBox;
            }
            else {
                const textBox = document.createElement('div');
                textBox.classList.add('topbar-textbox');
                textBox.innerText = text;
                this.appendWidget(textBox, align, true);
                return textBox;
            }
        }
        makeMenu(items, activeItem, separator, callbackName, align) {
            return new Menu(this.makeButton.bind(this), callbackName, items, activeItem, separator, align);
        }
        makeButton(defaultText, callbackName, separator, append = true, align = 'left', toggle = false) {
            let button = document.createElement('button');
            button.classList.add('topbar-button');
            // button.style.color = window.pane.color
            button.innerText = defaultText;
            document.body.appendChild(button);
            button.style.minWidth = button.clientWidth + 1 + 'px';
            document.body.removeChild(button);
            let widget = {
                elem: button,
                callbackName: callbackName
            };
            if (callbackName) {
                let handler;
                if (toggle) {
                    let state = false;
                    handler = () => {
                        state = !state;
                        window.callbackFunction(`${widget.callbackName}_~_${state}`);
                        button.style.backgroundColor = state ? 'var(--active-bg-color)' : '';
                        button.style.color = state ? 'var(--active-color)' : '';
                    };
                }
                else {
                    handler = () => window.callbackFunction(`${widget.callbackName}_~_${button.innerText}`);
                }
                button.addEventListener('click', handler);
            }
            if (append)
                this.appendWidget(button, align, separator);
            return widget;
        }
        makeSeparator(align = 'left') {
            const separator = document.createElement('div');
            separator.classList.add('topbar-seperator');
            const div = align == 'left' ? this.left : this.right;
            div.appendChild(separator);
        }
        appendWidget(widget, align, separator) {
            const div = align == 'left' ? this.left : this.right;
            if (separator) {
                if (align == 'left')
                    div.appendChild(widget);
                this.makeSeparator(align);
                if (align == 'right')
                    div.appendChild(widget);
            }
            else
                div.appendChild(widget);
            this._handler.reSize();
        }
        static getClientWidth(element) {
            document.body.appendChild(element);
            const width = element.clientWidth;
            document.body.removeChild(element);
            return width;
        }
    }

    globalParamInit();
    class Handler {
        id;
        commandFunctions = [];
        wrapper;
        div;
        chart;
        scale;
        precision = 2;
        series;
        volumeSeries;
        legend;
        _topBar;
        toolBox;
        spinner;
        _seriesList = [];
        resize_hdr_height = 8;
        watermark;
        seriesMarkers;
        // TODO find a better solution rather than the 'position' parameter
        constructor(chartId, innerWidth, innerHeight, position, autoSize, paneIndex = 0) {
            this.reSize = this.reSize.bind(this);
            this.id = chartId;
            this.scale = {
                width: innerWidth,
                height: innerHeight,
            };
            this.wrapper = document.createElement('div');
            this.wrapper.classList.add("handler");
            this.wrapper.style.float = position;
            this.div = document.createElement('div');
            this.div.style.position = 'relative';
            this.wrapper.appendChild(this.div);
            window.containerDiv.append(this.wrapper);
            // --- add this block to enable mouse‐drag height resizing ---
            const handle = document.createElement('div');
            handle.classList.add('resize-handle');
            this.wrapper.appendChild(handle);
            let startY, startHeight;
            const onMouseMove = (e) => {
                const delta = e.clientY - startY;
                const newH = Math.max(50, startHeight + delta); // min height 50px
                this.wrapper.style.height = `${newH}px`;
                // Resize the chart canvas accordingly:
                this.chart.resize(this.wrapper.offsetWidth, newH - this.resize_hdr_height);
            };
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            handle.addEventListener('mousedown', (e) => {
                // prevent selecting text, etc.
                e.preventDefault();
                startY = e.clientY;
                startHeight = this.wrapper.getBoundingClientRect().height;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
            this.chart = this._createChart();
            this.series = this.createCandlestickSeries(paneIndex);
            this.volumeSeries = this.createVolumeSeries(paneIndex);
            this.seriesMarkers = lightweightCharts.createSeriesMarkers(this.series, []);
            this.legend = new Legend(this);
            document.addEventListener('keydown', (event) => {
                for (let i = 0; i < this.commandFunctions.length; i++) {
                    if (this.commandFunctions[i](event))
                        break;
                }
            });
            window.handlerInFocus = this.id;
            this.wrapper.addEventListener('mouseover', () => window.handlerInFocus = this.id);
            this.reSize();
            if (!autoSize)
                return;
            window.addEventListener('resize', () => this.reSize());
        }
        reSize() {
            let topBarOffset = this.scale.height !== 0 ? this._topBar?._div.offsetHeight || 0 : 0;
            if (this.scale.height >= 0) {
                this.chart.resize(window.innerWidth * this.scale.width, (window.innerHeight * this.scale.height) - topBarOffset - this.resize_hdr_height);
                this.wrapper.style.width = `${100 * this.scale.width}%`;
                this.wrapper.style.height = `${100 * this.scale.height}%`;
            }
            else {
                var chart_height = Math.ceil(Math.abs(this.scale.height));
                this.chart.resize(window.containerDiv.offsetWidth * this.scale.width, chart_height - topBarOffset - this.resize_hdr_height);
                this.wrapper.style.width = `${100 * this.scale.width}%`;
                this.wrapper.style.height = `${chart_height}px`;
            }
            // TODO definitely a better way to do this
            if (this.scale.height === 0 || this.scale.width === 0) {
                // if (this.legend.div.style.display == 'flex') this.legend.div.style.display = 'none'
                if (this.toolBox) {
                    this.toolBox.div.style.display = 'none';
                }
            }
            else {
                // this.legend.div.style.display = 'flex'
                if (this.toolBox) {
                    this.toolBox.div.style.display = 'flex';
                }
            }
        }
        _createChart() {
            return lightweightCharts.createChart(this.div, {
                width: window.containerDiv.offsetWidth * this.scale.width,
                height: this.scale.height < 0 ? Math.ceil(Math.abs(this.scale.height)) : window.innerHeight * this.scale.height,
                layout: {
                    textColor: window.pane.color,
                    background: {
                        color: 'rgb(18,24,38)',
                        type: lightweightCharts.ColorType.Solid,
                    },
                    fontSize: 12,
                    panes: {
                        separatorColor: 'lightgrey',
                        separatorHoverColor: "rgba(255, 0, 0, 0.4)",
                        enableResize: true,
                    },
                },
                rightPriceScale: {
                    scaleMargins: { top: 0.3, bottom: 0.25 },
                },
                timeScale: { timeVisible: true, secondsVisible: false },
                crosshair: {
                    mode: lightweightCharts.CrosshairMode.Normal,
                    vertLine: {
                        labelBackgroundColor: 'rgb(46, 46, 46)',
                    },
                    horzLine: {
                        labelBackgroundColor: 'rgb(55, 55, 55)',
                    },
                },
                grid: {
                    vertLines: { color: '#444', style: 1 },
                    horzLines: { color: '#444', style: 1 },
                },
                handleScroll: { vertTouchDrag: true },
            });
        }
        createCandlestickSeries(paneIndex) {
            const up = 'rgba(39, 157, 130, 100)';
            const down = 'rgba(200, 97, 100, 100)';
            const candleSeries = this.chart.addSeries(lightweightCharts.CandlestickSeries, {
                upColor: up, borderUpColor: up, wickUpColor: up,
                downColor: down, borderDownColor: down, wickDownColor: down
            }, paneIndex);
            candleSeries.priceScale().applyOptions({
                scaleMargins: { top: 0.2, bottom: 0.2 },
            });
            return candleSeries;
        }
        createVolumeSeries(paneIndex) {
            const volumeSeries = this.chart.addSeries(lightweightCharts.HistogramSeries, {
                color: '#26a69a',
                priceFormat: { type: 'volume' },
                priceScaleId: 'volume_scale',
            }, paneIndex);
            volumeSeries.priceScale().applyOptions({
                scaleMargins: { top: 0.8, bottom: 0 },
            });
            return volumeSeries;
        }
        createLineSeries(name, options, paneIndex = 0) {
            const line = this.chart.addSeries(lightweightCharts.LineSeries, { ...options }, paneIndex);
            this._seriesList.push(line);
            this.legend.makeSeriesRow(name, line, paneIndex);
            return {
                name: name,
                series: line,
            };
        }
        createHistogramSeries(name, options, paneIndex = 0) {
            const line = this.chart.addSeries(lightweightCharts.HistogramSeries, { ...options }, paneIndex);
            this._seriesList.push(line);
            this.legend.makeSeriesRow(name, line, paneIndex);
            return {
                name: name,
                series: line,
            };
        }
        createToolBox() {
            this.toolBox = new ToolBox(this.id, this.chart, this.series, this.commandFunctions);
            this.div.appendChild(this.toolBox.div);
        }
        createTopBar() {
            this._topBar = new TopBar(this);
            this.wrapper.prepend(this._topBar._div);
            return this._topBar;
        }
        toJSON() {
            // Exclude the chart attribute from serialization
            const { chart, ...serialized } = this;
            return serialized;
        }
        static syncChartsAll(handlers, crosshairOnly = false) {
            // 1) Crosshair
            handlers.forEach((source) => {
                source.chart.subscribeCrosshairMove((param) => {
                    handlers.forEach((target) => {
                        if (target === source)
                            return;
                        if (!param.time) {
                            target.chart.clearCrosshairPosition();
                            return;
                        }
                        // get the point from the source series (for legend update)
                        const point = param.seriesData.get(source.series) || null;
                        // set the crosshair on the target chart
                        target.chart.setCrosshairPosition(0, param.time, target.series);
                        // update the legend on the target
                        if (point) {
                            target.legend.legendHandler(point, true);
                        }
                    });
                });
            });
            if (crosshairOnly)
                return;
            // 2) Visible range synchronization
            handlers.forEach((source) => {
                source.chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
                    handlers.forEach((target) => {
                        if (target === source || !range)
                            return;
                        target.chart.timeScale().setVisibleLogicalRange(range);
                    });
                });
            });
        }
        static syncCharts(childChart, parentChart, crosshairOnly = false) {
            function crosshairHandler(chart, point, param) {
                if (!param.time) {
                    chart.chart.clearCrosshairPosition();
                    return;
                }
                chart.chart.setCrosshairPosition(0, param.time, chart.series);
                if (point)
                    chart.legend.legendHandler(point, true);
            }
            function getPoint(series, param) {
                if (!param.time)
                    return null;
                return param.seriesData.get(series) || null;
            }
            const childTimeScale = childChart.chart.timeScale();
            const parentTimeScale = parentChart.chart.timeScale();
            const setChildRange = (timeRange) => {
                if (timeRange)
                    childTimeScale.setVisibleLogicalRange(timeRange);
            };
            const setParentRange = (timeRange) => {
                if (timeRange)
                    parentTimeScale.setVisibleLogicalRange(timeRange);
            };
            const setParentCrosshair = (param) => {
                crosshairHandler(parentChart, getPoint(childChart.series, param), param);
            };
            const setChildCrosshair = (param) => {
                crosshairHandler(childChart, getPoint(parentChart.series, param), param);
            };
            parentChart.chart.subscribeCrosshairMove(setChildCrosshair);
            childChart.chart.subscribeCrosshairMove(setParentCrosshair);
            if (crosshairOnly)
                return;
            childChart.chart.timeScale().subscribeVisibleLogicalRangeChange(setParentRange);
            parentChart.chart.timeScale().subscribeVisibleLogicalRangeChange(setChildRange);
        }
        static makeSearchBox(chart) {
            const searchWindow = document.createElement('div');
            searchWindow.classList.add('searchbox');
            searchWindow.style.display = 'none';
            const magnifyingGlass = document.createElement('div');
            magnifyingGlass.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="24px" height="24px" viewBox="0 0 24 24" version="1.1"><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:lightgray;stroke-opacity:1;stroke-miterlimit:4;" d="M 15 15 L 21 21 M 10 17 C 6.132812 17 3 13.867188 3 10 C 3 6.132812 6.132812 3 10 3 C 13.867188 3 17 6.132812 17 10 C 17 13.867188 13.867188 17 10 17 Z M 10 17 "/></svg>`;
            const sBox = document.createElement('input');
            sBox.type = 'text';
            searchWindow.appendChild(magnifyingGlass);
            searchWindow.appendChild(sBox);
            chart.div.appendChild(searchWindow);
            chart.commandFunctions.push((event) => {
                if (window.handlerInFocus !== chart.id || window.textBoxFocused)
                    return false;
                if (searchWindow.style.display === 'none') {
                    if (/^[a-zA-Z0-9]$/.test(event.key)) {
                        searchWindow.style.display = 'flex';
                        sBox.focus();
                        return true;
                    }
                    else
                        return false;
                }
                else if (event.key === 'Enter' || event.key === 'Escape') {
                    if (event.key === 'Enter')
                        window.callbackFunction(`search${chart.id}_~_${sBox.value}`);
                    searchWindow.style.display = 'none';
                    sBox.value = '';
                    return true;
                }
                else
                    return false;
            });
            sBox.addEventListener('input', () => sBox.value = sBox.value.toUpperCase());
            return {
                window: searchWindow,
                box: sBox,
            };
        }
        static makeSpinner(chart) {
            chart.spinner = document.createElement('div');
            chart.spinner.classList.add('spinner');
            chart.wrapper.appendChild(chart.spinner);
            // TODO below can be css (animate)
            let rotation = 0;
            const speed = 10;
            function animateSpinner() {
                if (!chart.spinner)
                    return;
                rotation += speed;
                chart.spinner.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
                requestAnimationFrame(animateSpinner);
            }
            animateSpinner();
        }
        static _styleMap = {
            '--bg-color': 'backgroundColor',
            '--hover-bg-color': 'hoverBackgroundColor',
            '--click-bg-color': 'clickBackgroundColor',
            '--active-bg-color': 'activeBackgroundColor',
            '--muted-bg-color': 'mutedBackgroundColor',
            '--border-color': 'borderColor',
            '--color': 'color',
            '--active-color': 'activeColor',
        };
        static setRootStyles(styles) {
            const rootStyle = document.documentElement.style;
            for (const [property, valueKey] of Object.entries(this._styleMap)) {
                rootStyle.setProperty(property, styles[valueKey]);
            }
        }
        createWatermark(text, fontSize, color) {
            if (!this.watermark) {
                this.watermark = lightweightCharts.createTextWatermark(this.chart.panes()[0], {
                    horzAlign: 'center',
                    vertAlign: 'center',
                    lines: [{
                            text: text,
                            color: color,
                            fontSize: fontSize,
                        }],
                });
                return;
            }
            this.watermark.applyOptions({
                lines: [{
                        text: text,
                        color: color,
                        fontSize: fontSize,
                    }]
            });
        }
    }

    class Table {
        _div;
        callbackName;
        borderColor;
        borderWidth;
        table;
        rows = {};
        headings;
        widths;
        alignments;
        footer;
        header;
        constructor(width, height, headings, widths, alignments, position, draggable = false, tableBackgroundColor, borderColor, borderWidth, textColors, backgroundColors) {
            this._div = document.createElement('div');
            this.callbackName = null;
            this.borderColor = borderColor;
            this.borderWidth = borderWidth;
            if (draggable) {
                this._div.style.position = 'absolute';
                this._div.style.cursor = 'move';
            }
            else {
                this._div.style.position = 'relative';
                this._div.style.float = position;
            }
            this._div.style.zIndex = '2000';
            this.reSize(width, height);
            this._div.style.display = 'flex';
            this._div.style.flexDirection = 'column';
            // this._div.style.justifyContent = 'space-between'
            this._div.style.borderRadius = '5px';
            this._div.style.color = 'white';
            this._div.style.fontSize = '12px';
            this._div.style.fontVariantNumeric = 'tabular-nums';
            this.table = document.createElement('table');
            this.table.style.width = '100%';
            this.table.style.borderCollapse = 'collapse';
            this._div.style.overflow = 'hidden';
            this.headings = headings;
            this.widths = widths.map((width) => `${width * 100}%`);
            this.alignments = alignments;
            let head = this.table.createTHead();
            let row = head.insertRow();
            for (let i = 0; i < this.headings.length; i++) {
                let th = document.createElement('th');
                th.textContent = this.headings[i];
                th.style.width = this.widths[i];
                th.style.letterSpacing = '0.03rem';
                th.style.padding = '0.2rem 0px';
                th.style.fontWeight = '500';
                th.style.textAlign = 'center';
                if (i !== 0)
                    th.style.borderLeft = borderWidth + 'px solid ' + borderColor;
                th.style.position = 'sticky';
                th.style.top = '0';
                th.style.backgroundColor = backgroundColors.length > 0 ? backgroundColors[i] : tableBackgroundColor;
                th.style.color = textColors[i];
                row.appendChild(th);
            }
            let overflowWrapper = document.createElement('div');
            overflowWrapper.style.overflowY = 'auto';
            overflowWrapper.style.overflowX = 'hidden';
            overflowWrapper.style.backgroundColor = tableBackgroundColor;
            overflowWrapper.appendChild(this.table);
            this._div.appendChild(overflowWrapper);
            window.containerDiv.appendChild(this._div);
            if (!draggable)
                return;
            let offsetX, offsetY;
            let onMouseDown = (event) => {
                offsetX = event.clientX - this._div.offsetLeft;
                offsetY = event.clientY - this._div.offsetTop;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };
            let onMouseMove = (event) => {
                this._div.style.left = (event.clientX - offsetX) + 'px';
                this._div.style.top = (event.clientY - offsetY) + 'px';
            };
            let onMouseUp = () => {
                // Remove the event listeners for dragging
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            this._div.addEventListener('mousedown', onMouseDown);
        }
        divToButton(div, callbackString) {
            div.addEventListener('mouseover', () => div.style.backgroundColor = 'rgba(60, 60, 60, 0.6)');
            div.addEventListener('mouseout', () => div.style.backgroundColor = 'transparent');
            div.addEventListener('mousedown', () => div.style.backgroundColor = 'rgba(60, 60, 60)');
            div.addEventListener('click', () => window.callbackFunction(callbackString));
            div.addEventListener('mouseup', () => div.style.backgroundColor = 'rgba(60, 60, 60, 0.6)');
        }
        newRow(id, returnClickedCell = false) {
            let row = this.table.insertRow();
            row.style.cursor = 'default';
            for (let i = 0; i < this.headings.length; i++) {
                let cell = row.insertCell();
                cell.style.width = this.widths[i];
                cell.style.textAlign = this.alignments[i];
                cell.style.border = this.borderWidth + 'px solid ' + this.borderColor;
                if (returnClickedCell) {
                    this.divToButton(cell, `${this.callbackName}_~_${id};;;${this.headings[i]}`);
                }
            }
            if (!returnClickedCell) {
                this.divToButton(row, `${this.callbackName}_~_${id}`);
            }
            this.rows[id] = row;
        }
        deleteRow(id) {
            this.table.deleteRow(this.rows[id].rowIndex);
            delete this.rows[id];
        }
        clearRows() {
            let numRows = Object.keys(this.rows).length;
            for (let i = 0; i < numRows; i++)
                this.table.deleteRow(-1);
            this.rows = {};
        }
        _getCell(rowId, column) {
            return this.rows[rowId].cells[this.headings.indexOf(column)];
        }
        updateCell(rowId, column, val) {
            this._getCell(rowId, column).textContent = val;
        }
        styleCell(rowId, column, styleAttribute, value) {
            const style = this._getCell(rowId, column).style;
            style[styleAttribute] = value;
        }
        makeSection(id, type, numBoxes, func = false) {
            let section = document.createElement('div');
            section.style.display = 'flex';
            section.style.width = '100%';
            section.style.padding = '3px 0px';
            section.style.backgroundColor = 'rgb(30, 30, 30)';
            type === 'footer' ? this._div.appendChild(section) : this._div.prepend(section);
            const textBoxes = [];
            for (let i = 0; i < numBoxes; i++) {
                let textBox = document.createElement('div');
                section.appendChild(textBox);
                textBox.style.flex = '1';
                textBox.style.textAlign = 'center';
                if (func) {
                    this.divToButton(textBox, `${id}_~_${i}`);
                    textBox.style.borderRadius = '2px';
                }
                textBoxes.push(textBox);
            }
            if (type === 'footer') {
                this.footer = textBoxes;
            }
            else {
                this.header = textBoxes;
            }
        }
        reSize(width, height) {
            this._div.style.width = width <= 1 ? width * 100 + '%' : width + 'px';
            this._div.style.height = height <= 1 ? height * 100 + '%' : height + 'px';
        }
    }

    exports.Box = Box;
    exports.Handler = Handler;
    exports.HorizontalLine = HorizontalLine;
    exports.Legend = Legend;
    exports.RayLine = RayLine;
    exports.Table = Table;
    exports.ToolBox = ToolBox;
    exports.TopBar = TopBar;
    exports.TrendLine = TrendLine;
    exports.VerticalLine = VerticalLine;
    exports.globalParamInit = globalParamInit;
    exports.htmlToElement = htmlToElement;
    exports.paneStyleDefault = paneStyleDefault;
    exports.setCursor = setCursor;

    return exports;

})({}, LightweightCharts);
