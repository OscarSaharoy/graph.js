// Oscar Saharoy 2021

class Graph {

    constructor(graphID) {

        // get canvas and drawing context
        this.canvas = document.getElementById(graphID);
        this.ctx    = this.canvas.getContext("2d");

        // declare properties
        this.boundingRect         = null;
        this.canvasSize           = vec2.zero;
        this.canvasToGraphScale   = new vec2(0.01, -0.01); // 2d scale factor that converts from canvas space to graph space
        this.originOffset         = vec2.zero; // offset of the origin from top corner of canvas in graph space
        this.originFixedInCanvas  = vec2.zero;
        this.mousePos             = vec2.zero;
        this.mousePosOnCanvas     = vec2.zero;
        this.mouseMove            = vec2.zero;
        this.lastTouchPosOnCanvas = vec2.notANumber;
        this.pinchLength          = 0;
        this.lastPinchLength      = null;
        this.preventPanning       = false;
        this.mouseOverCanvas      = false;
        this.dpr                  = 0;
        this.rem                  = parseInt( getComputedStyle(document.documentElement).fontSize );
 
        // data variables 
        this.points               = [];

        // user-changeable drawing functions
        this.curveDrawingFunction = graphjsDefaultDrawCurve;
        this.userDrawFunctions    = [];

        // functions to  translate from graph space to canvas space
        this.canvasToGraph  = point  => vec2.mul( point, this.canvasToGraphScale ).decBy( this.originOffset );
        this.graphToCanvas  = point  => vec2.add( point, this.originOffset ).divBy( this.canvasToGraphScale );

        this.graphToCanvasX = graphX => (graphX + this.originOffset.x) / this.canvasToGraphScale.x;
        this.graphToCanvasY = graphY => (graphY + this.originOffset.y) / this.canvasToGraphScale.y;

        // returns true if a point is inside the graph viewport
        this.insideViewport = point  => point.x > - this.originOffset.x
                                     && point.y < - this.originOffset.y
                                     && point.x < this.canvasSize.x * this.canvasToGraphScale.x - this.originOffset.x 
                                     && point.y > this.canvasSize.y * this.canvasToGraphScale.y - this.originOffset.y;

        // function to determine if we must draw a point or if we can skip it to save performance
        this.mustDrawPoint = (p, i, arr) => this.insideViewport( p ) 
                                         || i != 0            && this.insideViewport( arr[i-1] )
                                         || i != arr.length-1 && this.insideViewport( arr[i+1] );

        // event listeners
        window.addEventListener(      "resize",     event => this.resize(event)      );

        this.canvas.addEventListener( "wheel",      event => this.zoomGraph(event)   );
        this.canvas.addEventListener( "mouseup",    event => this.mouseup(event)     );
        this.canvas.addEventListener( "mousemove",  event => this.setMousePos(event) );
        this.canvas.addEventListener( "mousemove",  event => this.panGraph(event)    );
        this.canvas.addEventListener( "mousedown",  event => this.mousedown(event)   );
        this.canvas.addEventListener( "mouseleave", event => this.mouseleave(event)  );

        this.canvas.addEventListener( "touchstart", event => this.touchstart(event)  );
        this.canvas.addEventListener( "touchmove",  event => this.setTouchPos(event) );
        this.canvas.addEventListener( "touchmove",  event => this.panGraph(event)    );
        this.canvas.addEventListener( "touchend",   event => this.touchend(event)    );

        // initial canvas resize, center canvas & draw
        this.resize();
        this.setCentre( new vec2(0, 0) );
        this.redraw();
    }

    resize() {

        // set canvas to have 1:1 canvas pixel to screen pixel ratio
        this.dpr = window.devicePixelRatio || 1;
        this.boundingRect = this.canvas.getBoundingClientRect();
        this.canvasSize.setxy( this.boundingRect.width * this.dpr, this.boundingRect.height * this.dpr );

        this.canvas.width  = this.canvasSize.x;
        this.canvas.height = this.canvasSize.y;
    }

    zoomGraph(event) {

        // zoom in and out on the graph

        event.preventDefault();

        const zoomAmount = event.deltaY / 1000;

        // use ctrl and shift keys to decide whether to zoom in x or y directions or both
        if( !event.ctrlKey ) {

            // have to shift the origin to make the mouse the centre of enlargement
            this.originOffset.x       += this.mousePosOnCanvas.x * zoomAmount * this.canvasToGraphScale.x;
            this.canvasToGraphScale.x *= 1 + zoomAmount;
        }

        if( !event.shiftKey ) {

            this.originOffset.y       += this.mousePosOnCanvas.y * zoomAmount * this.canvasToGraphScale.y;
            this.canvasToGraphScale.y *= 1 + zoomAmount;
        }
    }

    mousedown(event) {

        // set mouseclicked flag
        this.mouseClicked = true;
    }

    setMousePos(event) {

        // get mousePos for display at top of graph and close data point, and mouseMove for panning graph
        this.mousePosOnCanvas.setxy(event.offsetX, event.offsetY).scaleBy( this.dpr );
        this.mousePos.setv( this.canvasToGraph( this.mousePosOnCanvas ));
        this.mouseMove.setxy( event.movementX, event.movementY ).mulBy( this.canvasToGraphScale );

        // the mouse must be over the canvas so set that flag
        this.mouseOverCanvas = true;
    }

    panGraph(event) {

        // only act if the mouse is clicked and prevent panning is false
        if( !this.mouseClicked || this.preventPanning ) return;

        // set cursor to little hand grabbing
        this.canvas.style.cursor = "grabbing";

        // shift origin to pan graph
        this.originOffset.incBy( this.mouseMove );
    }

    mouseup(event) {

        // set mouseClicked flag
        this.mouseClicked = false;

        // update cursor
        this.canvas.style.cursor = "auto";
    }

    touchstart(event) {

        // "mouse" is clicked
        this.mouseClicked = true;

        // unset the last touch and pinch length
        this.lastTouchPosOnCanvas = vec2.notANumber;
        this.lastPinchLength      = null;
    }

    setTouchPos(event) {

        // prevent zooming from pinches by the browser
        event.preventDefault();

        // handle touch events
        var meanTouchX = Array.from( event.touches ).reduce( (acc, touch) => acc + touch.pageX, 0 ) / event.touches.length;
        var meanTouchY = Array.from( event.touches ).reduce( (acc, touch) => acc + touch.pageY, 0 ) / event.touches.length;

        meanTouchX -= this.boundingRect.left;
        meanTouchY -= this.boundingRect.top;

        this.mousePosOnCanvas.setxy( meanTouchX, meanTouchY ).scaleBy( this.dpr );
        this.mousePos.setv( this.canvasToGraph( this.mousePosOnCanvas ) );

        // if lastTouchPosOnCanvas is nan then this is the first frame of the drag so there is no mouseMove to set yet
        if( !vec2.isNaN(this.lastTouchPosOnCanvas) ) 
            
            this.mouseMove.setv( vec2.sub( this.mousePosOnCanvas, this.lastTouchPosOnCanvas )
                                     .mulBy( this.canvasToGraphScale )
                                     .scaleBy(1.3) );
        
        // lastTouchPosOnCanvas is used to calculate the mouseMove amount
        this.lastTouchPosOnCanvas.setv( this.mousePosOnCanvas );

        // only proceed if we have 2 touches
        if( event.touches.length != 2 ) return;
    
        // distance between the 2 touches (css pixels)
        this.pinchLength = ( (event.touches[0].pageX - event.touches[1].pageX) **2 
                           + (event.touches[0].pageY - event.touches[1].pageY) **2 ) ** 0.5;

        // if this.lastPinchLength is null then we only just started pinching so can't call zoomGraph
        if( this.lastPinchLength ) {

            event.deltaY  = ( this.lastPinchLength - this.pinchLength ) * 5;
            this.zoomGraph(event);
        }
    
        // set lastPinchLength so we can calculate the change in pinch length next frame
        this.lastPinchLength = this.pinchLength;
    }

    touchend(event) {

        this.mouseClicked = event.touches.length != 0;

        // if the mouseClicked is still true then there are still some touches on the screen
        // so we need to unset lastTouchPos and call setTouchPos to re adjust the mouse pos
        // to the remaining finger
        if( !this.mouseClicked ) return;

        this.lastTouchPosOnCanvas = vec2.notANumber;
        this.setTouchPos(event);
    }

    mouseleave(event) {

        // unset the mouse over canvas flag
        this.mouseOverCanvas = false;

        // treat mouseleave like a mouseup
        this.mouseup();
    }

    redraw() {

        // clear canvas
        this.ctx.clearRect(0, 0, this.canvasSize.x, this.canvasSize.y);

        // set origin position fixed inside the canvas
        this.originFixedInCanvas.setv( 
            vec2.div( this.originOffset, this.canvasToGraphScale ).clamp( new vec2(0, 0), this.canvasSize ) );

        // get positions of gridlines on graph
        const gridlinePositions = this.getGridlinePositions();

        // map points to canvas space - used for drawing them
        const pointsOnCanvas = this.points.filter( this.mustDrawPoint ).map( this.graphToCanvas );

        // draw the graph elements
        this.drawAxes();
        this.drawGridlines(gridlinePositions);
        this.curveDrawingFunction( pointsOnCanvas, this );
        this.drawLabels(gridlinePositions);
        this.drawMousePosition();

        // call each of the user functions
        this.userDrawFunctions.forEach( func => func(this) );
        
        // continue draw loop
        requestAnimationFrame( () => this.redraw() );
    }

    getGridlinePositions() {

        // object to hold the gridlines in x and y directions
        const gridlines = { x: [], y: [] };

        // size of the graph in graph space
        const graphSize = vec2.mul( this.canvasSize, this.canvasToGraphScale ).abs();

        // calculate space between the gridlines in graph units
        var gridlineSpacingX = Math.pow(10, Math.floor( Math.log10(graphSize.x) ) );
        var gridlineSpacingY = Math.pow(10, Math.floor( Math.log10(graphSize.y) ) );

        // adjust the gridline spacing to get a nice number of gridlines
        if      ( graphSize.x / gridlineSpacingX < 2.5 ) gridlineSpacingX /= 5;
        else if ( graphSize.x / gridlineSpacingX < 6   ) gridlineSpacingX /= 2;
        if      ( graphSize.y / gridlineSpacingY < 2.5 ) gridlineSpacingY /= 5;
        else if ( graphSize.y / gridlineSpacingY < 6   ) gridlineSpacingY /= 2;

        // calculate positions of the most negative gridline in graph space
        const firstGridlineX = Math.floor( - this.originOffset.x                / gridlineSpacingX ) * gridlineSpacingX;
        const firstGridlineY = Math.floor( -(this.originOffset.y + graphSize.y) / gridlineSpacingY ) * gridlineSpacingY;

        // keep adding grid lines at a spacing of gridlineSpacing until the whole graph is covered
        for(var x = firstGridlineX; x < firstGridlineX + graphSize.x + gridlineSpacingX; x += gridlineSpacingX)
            gridlines.x.push(x);

        for(var y = firstGridlineY; y < firstGridlineY + graphSize.y + gridlineSpacingY; y += gridlineSpacingY)
            gridlines.y.push(y);

        return gridlines;
    }

    drawAxes() {

        // draw the x and y axes

        this.ctx.lineWidth   = 3;
        this.ctx.strokeStyle = "black";

        this.drawVerticalLine(   this.originFixedInCanvas.x );
        this.drawHorizontalLine( this.originFixedInCanvas.y );
    }

    drawGridlines(gridlinePositions) {

        // change style for gridlines
        this.ctx.lineWidth   = 1;
        this.ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";

        gridlinePositions.x.forEach( x => this.drawVerticalLine(   this.graphToCanvasX( x ) ) );
        gridlinePositions.y.forEach( y => this.drawHorizontalLine( this.graphToCanvasY( y ) ) );
    }

    drawLabels(gridlinePositions) {

        // change style for labels
        this.ctx.fillStyle = "black";
        this.ctx.font      = "500 1rem Roboto Mono";

        gridlinePositions.x.forEach( x => this.drawXLabel( x ) );
        gridlinePositions.y.forEach( y => this.drawYLabel( y ) );
    }

    drawMousePosition() {

        this.ctx.font = "500 1.3rem Roboto Mono";

        // get text from mousePos
        const text = this.mousePos.x.toPrecision(3) + ", " + this.mousePos.y.toPrecision(3);
        const textWidth = this.ctx.measureText(text).width;

        // draw white box behind
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(this.canvasSize.x-8-textWidth, 0, 8+textWidth, this.rem*1.3 + 8);

        // draw numbers
        this.ctx.fillStyle = "black";
        this.ctx.fillText(text, this.canvasSize.x-8-textWidth, this.rem*1.3 + 4);
    }

    drawVerticalLine(canvasX) {

        // draws a line down the canvas at a given y coordinate
        this.ctx.beginPath();
        this.ctx.moveTo(canvasX,                 0);
        this.ctx.lineTo(canvasX, this.canvasSize.y);
        this.ctx.stroke();
    }

    drawHorizontalLine(canvasY) {

        // draws a line across the canvas at a given y coordinate
        this.ctx.beginPath();
        this.ctx.moveTo(                0, canvasY);
        this.ctx.lineTo(this.canvasSize.x, canvasY);
        this.ctx.stroke();
    }

    drawXLabel(graphX) {

        // get coordinates of label in canvas space
        const canvasX = this.graphToCanvasX( graphX );
        const canvasY = this.originFixedInCanvas.y;

        // draw number
        const text       = graphjsFormatNumber(graphX);
        const textHeight = this.rem;
        const textX      = canvasX + textHeight / 2;
        const textY      = canvasY-textHeight*2 < 0 ? textHeight*1.5 : canvasY-textHeight/2;

        this.ctx.fillText( text, textX, textY );
    }

    drawYLabel(graphY) {

        // get y coordinate of label in canvas space
        const canvasY = this.graphToCanvasY( graphY );
        const canvasX = this.originFixedInCanvas.x;

        // draw number
        const text       = graphjsFormatNumber(graphY);
        const textHeight = this.rem;
        const textWidth  = this.ctx.measureText( text ).width;
        const textX      = canvasX+textHeight+textWidth > this.canvasSize.x ? this.canvasSize.x-textHeight/2-textWidth : canvasX+textHeight/2;
        const textY      = canvasY - textHeight / 2;

        this.ctx.fillText( text, textX, textY );
    }

    // public functions

    addPoint(point) {

        this.points.push( point );
    }

    addPoints(points) {

        points.forEach( point => this.points.push(point) );
    }

    removePoint(point) {

        this.points = this.points.filter( x => x != point );
    }

    clearPoints() {

        this.points = [];
    }

    getCentre() {

        return vec2.mul( this.canvasSize, this.canvasToGraphScale ).scaleBy( 0.5 ).decBy( this.originOffset );
    }

    setCentre(point) {

        // set the centre of the graph to be point
        this.originOffset.setv( vec2.mul(this.canvasSize, this.canvasToGraphScale).scaleBy( 0.5 ).decBy( point ) );
    }

    setXRange(minX, maxX) {

        // set the graph to range from minX to maxX on x axis
        this.canvasToGraphScale.x = (maxX - minX) / this.canvasSize.x;
        this.originOffset.x       = (this.canvasSize.x * this.canvasToGraphScale.x - minX - maxX) / 2;
    }

    setYRange(minY, maxY) {

        // set the graph to range from minY to maxY on y axis
        this.canvasToGraphScale.y = (maxY - minY) / -this.canvasSize.y;
        this.originOffset.y       = (this.canvasSize.y * this.canvasToGraphScale.y - minY - maxY) / 2;
    }

    setRange(bottomLeft, topRight) {

        // set graph range using 2 points
        this.canvasToGraphScale   = vec2.sub( topRight, bottomLeft ).divBy( this.canvasSize ).mulBy( new vec2(1, -1) );
        this.originOffset         = vec2.mul(this.canvasSize, this.canvasToGraphScale).decBy( bottomLeft ).decBy( topRight ).scaleBy( 0.5 );
    }
}


// default curve drawing function
function graphjsDefaultDrawCurve(points, graph) {

    if( !points.length ) return;

    // set style
    graph.ctx.strokeStyle = "#54f330";
    graph.ctx.lineWidth   = 2.5;

    graph.ctx.beginPath();
    graph.ctx.moveTo( points[0].x, points[0].y );

    // keep track of the last point that we drew
    var lastDrawnPoint = points[0];

    for(point of points) {

        // for each next point, only draw it if its more than 3 pixels away from the last one we drew
        if( vec2.taxiDist(point, lastDrawnPoint) < 3 ) continue;

        lastDrawnPoint = point;
        graph.ctx.lineTo( point.x, point.y );
    }

    graph.ctx.stroke();
}

// number formatting function
function graphjsFormatNumber(x) {

    // if x is basically 0 then just return that
    if( Math.abs(x) < 1e-10 ) return "0";
    
    // use x.toString unless number is very small or very big then use toExponential
    var text = x.toString();
    if( Math.abs(x) > 10000 || Math.abs(x) < 0.001 ) text = x.toExponential();

    var fixed;

    // fix numbers like 57.5699999999995e+12
    const ninesRegexMatch = text.match( /(9|\.|\-){4,}(\d)*/ );

    if(ninesRegexMatch) {

        var incrementPower = false;

        // if start of string is nines (9.999932) then handle this case
        if( ninesRegexMatch.index == 0 ) {

            fixed = x>0 ? "1" : "-1";
            incrementPower = true;
        }

        else{
            
            // extract correct part of string (except digit to be incremented)
            fixed = text.substring(0, ninesRegexMatch.index-1);

            // increment last correct digit and add it on to make up for nines
            fixed += parseInt( text[ninesRegexMatch.index-1] ) + 1;
        }

        // match suffix of the form e+xxx and add it back on
        const suffix = text.match( /e(\+|\-)(\d+)/ );
        
        if(suffix) {

            var power = parseInt( suffix[2] )

            if(incrementPower) power += Math.abs(x) > 1 ? 1 : -1;

            fixed += "e" + suffix[1] + power;
        }

        return fixed;
    }

    // fix numbers like 5.560000000001e-5
    const zerosRegexMatch = text.match( /(0|\.){5,}(\d)+/ );

    if(zerosRegexMatch) {

        // extract correct part of string
        fixed = text.substring(0, zerosRegexMatch.index);

        // match suffix of the form e+xxx and add it back on
        const suffix = text.match( /e(\+|\-)(\d+)/ );

        if(suffix) fixed += suffix[0];

        return fixed;
    }

    return text;
}