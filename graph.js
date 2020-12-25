// Oscar Saharoy 2020

class Graph {

    constructor(graphID) {

        // get canvas and drawing context
        this.canvas = document.getElementById(graphID);
        this.ctx    = this.canvas.getContext("2d");

        // declare properties
        this.canvasSize           = new vec2(0, 0);
        this.canvasToGraphScale   = new vec2(0.01, -0.01); // 2d scale factor that converts from canvas space to graph space
        this.originOffset         = new vec2(0, 0); // offset of the origin from top corner of canvas in graph space
        this.originFixedInCanvas  = new vec2(0, 0);
        this.mousePos             = new vec2(0, 0);
        this.mouseMove            = new vec2(0, 0);
        this.dpr                  = 0;
        this.rem                  = parseInt( getComputedStyle(document.documentElement).fontSize );
        this.canDragPoints        = false;

        // data variables
        this.points               = [];
        this.closePoint           = undefined;

        // user-changeable drawing functions
        this.pointDrawingFunction = graphjsDefaultDrawPoint;
        this.curveDrawingFunction = graphjsDefaultDrawCurve;

        // functions to  translate from graph space to canvas space
        this.canvasToGraph  = point  => point.mulBy( this.canvasToGraphScale ).decBy( this.originOffset );
        this.graphToCanvas  = point  => point.incBy( this.originOffset ).divBy( this.canvasToGraphScale );

        this.graphToCanvasX = graphX => (graphX + this.originOffset.x) / this.canvasToGraphScale.x;
        this.graphToCanvasY = graphY => (graphY + this.originOffset.y) / this.canvasToGraphScale.y;

        // returns true if a point is inside the graph viewport
        this.insideViewport = point  => point.x > - this.originOffset.x
                                     && point.y < - this.originOffset.y
                                     && point.x < this.canvasSize.x * this.canvasToGraphScale.x - this.originOffset.x 
                                     && point.y > this.canvasSize.y * this.canvasToGraphScale.y - this.originOffset.y;

        // function to determine if we must draw a point or if we can skip it to save performance
        this.mustDrawPoint = (p, i, arr) => i == 0 || i == arr.length-1 
                                         || this.insideViewport( p ) 
                                         || this.insideViewport( arr[i-1] )
                                         || this.insideViewport( arr[i+1] );

        // event listeners
        window.addEventListener(      "resize",     event => this.resize(event)    );
        this.canvas.addEventListener( "wheel",      event => this.wheel(event)     );
        this.canvas.addEventListener( "mouseup",    event => this.mouseup(event)   );
        this.canvas.addEventListener( "mousemove",  event => this.mousemove(event) );
        this.canvas.addEventListener( "mousedown",  event => this.mousedown(event) );
        this.canvas.addEventListener( "mouseleave", event => this.mouseleave(event));
        // this.canvas.addEventListener( "touchend",   event => this.mouseup(event.touches[0])   );
        // this.canvas.addEventListener( "touchmove",  event => this.mousemove(event.touches[0]) );
        // this.canvas.addEventListener( "touchstart", event => this.mousedown(event.touches[0]) );
        // this.canvas.addEventListener( "mouseleave", event => this.mouseleave(event.touches[0]));

        // initial canvas resize, center canvas & draw
        this.resize();
        this.setCentre( new vec2(0, 0) );
        this.redraw();
    }

    resize() {

        // set canvas to have 1:1 canvas pixel to screen pixel ratio
        this.dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvasSize.setxy( rect.width * this.dpr, rect.height * this.dpr );

        this.canvas.width  = this.canvasSize.x;
        this.canvas.height = this.canvasSize.y;

        // redraw canvas with new sizing
        this.redraw();
    }

    wheel(event) {

        // zoom in and out on the graph

        event.preventDefault();

        const zoomAmount = event.deltaY / 1000;

        // use ctrl and shift keys to decide whether to zoom in x or y directions or both
        if( !event.ctrlKey ) {

            // have to shift the origin to make the mouse the centre of enlargement
            this.originOffset.x       += event.offsetX * this.dpr * zoomAmount * this.canvasToGraphScale.x;
            this.canvasToGraphScale.x *= 1 + zoomAmount;
        }

        if( !event.shiftKey ) {
            this.originOffset.y       += event.offsetY * this.dpr * zoomAmount * this.canvasToGraphScale.y;
            this.canvasToGraphScale.y *= 1 + zoomAmount;
        }

        this.redraw();
    }

    mousedown(event) {

        // set mouseclicked flag
        this.mouseClicked = true;
    }

    mousemove(event) {

        // get mousePos for display at top of graph and close data point, and mouseMove for panning graph
        this.canvasToGraph( this.mousePos.setxy( event.offsetX, event.offsetY ).scaleBy( this.dpr ) );
        this.mouseMove.setxy( event.movementX, event.movementY ).mulBy( this.canvasToGraphScale );
        this.drawMousePosition();

        // cases where the mouse is clicked
        if( this.mouseClicked ) {

            // set moved in click flag
            this.movedInClick = true;

            // move close data point to under cursor if there is one
            if( this.closePoint ) this.closePoint.setv( this.mousePos );

            // otherwise handle panning the graph
            else {

                // set cursor to little hand grabbing
                this.canvas.style.cursor = "grabbing";

                // shift origin to pan graph
                this.originOffset.incBy( this.mouseMove );
            }

            this.redraw();
        }

        // otherwise handle case where mouse isnt clicked
        else {

            // update close point
            this.closePoint = this.points.find( point => this.canDragPoints &&
                                                         sqrDistv( this.graphToCanvas( vec2.clone( this.mousePos ) ), 
                                                                   this.graphToCanvas( vec2.clone( point         ) ) ) < this.rem**2 / 4 );

            // if mouse is close to a point then change cursor to movey
            this.canvas.style.cursor = this.closePoint ? "move" : "auto";
        }
    }

    mouseup(event) {

        // handle adding/removing a point on click but only if the mouse didn't more during the click
        if( this.mouseClicked && !this.movedInClick && this.canDragPoints ) {

            // if mouse is over an existing point then remove it
            if( this.closePoint ) 
                this.points = this.points.filter( point => point !== this.closePoint );

            // otherwise add another point at current mouse position
            else this.points.push( vec2.clone( this.mousePos ) );

            this.redraw();    
        }

        // set mouse flags
        this.mouseClicked = this.movedInClick = false;

        // update cursor and closePoint
        this.mousemove(event)
    }

    mouseleave(event) {

        // treat mouse leaving the canvas as a mouseup event
        this.mouseup(event);
    }

    redraw() {

        // clear canvas
        this.ctx.clearRect(0, 0, this.canvasSize.x, this.canvasSize.y);

        // set origin position fixed inside the canvas
        this.originFixedInCanvas.setv( 
            divv( this.originOffset, this.canvasToGraphScale ).clamp( new vec2(0, 0), this.canvasSize ) );

        // get positions of gridlines on graph
        const gridlinePositions = this.getGridlinePositions();

        // map points to canvas space - used for drawing them
        const pointsOnCanvas = this.points.filter( this.mustDrawPoint ).map( vec2.clone ).map( this.graphToCanvas );

        // draw the graph elements
        this.drawAxes();
        this.drawGridlines(gridlinePositions);
        this.drawCurve(pointsOnCanvas);
        this.drawPoints(pointsOnCanvas);
        this.drawLabels(gridlinePositions);
        this.drawMousePosition();
        
        // continue draw loop
        // requestAnimationFrame( () => this.redraw() ); commented as using this.redraw to redraw only when needed
    }

    getGridlinePositions() {

        // object to hold the gridlines in x and y directions
        const gridlines = { x: [], y: [] };

        // size of the graph in graph space
        const graphSize = mulv( this.canvasSize, this.canvasToGraphScale ).abs();

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
        this.ctx.font      = "1rem Roboto Mono";

        gridlinePositions.x.forEach( x => this.drawXLabel( x ) );
        gridlinePositions.y.forEach( y => this.drawYLabel( y ) );
    }

    drawCurve(pointsOnCanvas) {

        // defer to user-controllable curve drawing function
        this.curveDrawingFunction( pointsOnCanvas, this.ctx );
    }

    drawPoints(pointsOnCanvas) {

        // defer to user-controllable point drawing function
        pointsOnCanvas.forEach( point => this.pointDrawingFunction( point, this.ctx ) );
    }

    drawMousePosition() {

        this.ctx.font = "1.3rem Roboto Mono";

        // get text from mousePos
        const text = this.mousePos.x.toPrecision(3) + ", " + this.mousePos.y.toPrecision(3);
        const textWidth = this.ctx.measureText(text).width;

        // draw white box behind
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(this.canvasSize.x-8-textWidth*1.5, 0, 8+textWidth*1.5, this.rem*1.3 + 8);

        // draw numbers
        this.ctx.fillStyle = "black";
        this.ctx.fillText(text, this.canvasSize.x-4-textWidth, this.rem*1.3 + 4);
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
        this.redraw();
    }

    addPoints(points) {

        points.forEach( point => this.points.push(point) );
        this.redraw();
    }

    removePoint(point) {

        this.points = this.points.filter( x => x != point );
        this.redraw();
    }

    clearPoints() {

        this.points = [];
        this.redraw();
    }

    getCentre() {

        return mulv(this.canvasSize, this.canvasToGraphScale).scaleBy( 0.5 ).decBy( this.originOffset );
    }

    setCentre(point) {

        // set the centre of the graph to be point
        this.originOffset.setv( mulv(this.canvasSize, this.canvasToGraphScale).scaleBy( 0.5 ).decBy( point ) );
        this.redraw();
    }

    setXRange(minX, maxX) {

        // set the graph to range from minX to maxX on x axis
        this.canvasToGraphScale.x = (maxX - minX) / this.canvasSize.x;
        this.originOffset.x       = (this.canvasSize.x * this.canvasToGraphScale.x - minX - maxX) / 2;
        this.redraw();
    }

    setYRange(minY, maxY) {

        // set the graph to range from minY to maxY on y axis
        this.canvasToGraphScale.y = (maxY - minY) / -this.canvasSize.y;
        this.originOffset.y       = (this.canvasSize.y * this.canvasToGraphScale.y - minY - maxY) / 2;
        this.redraw();
    }
}


// default point drawing function draws a green circle
function graphjsDefaultDrawPoint(point, ctx) {

    // set style
    ctx.strokeStyle = "#54f330";
    ctx.fillStyle   = "#ffffff"
    ctx.lineWidth   = 3;

    ctx.beginPath();
    ctx.arc( point.x, point.y, 8, 0, 6.28 );
    ctx.fill();
    ctx.stroke();
}

// default curve drawing function
function graphjsDefaultDrawCurve(points, ctx) {

    if( !points.length ) return;

    // set style
    ctx.strokeStyle = "#54f330";
    ctx.lineWidth   = 2.5;

    ctx.beginPath();
    ctx.moveTo( points[0].x, points[0].y );
    points.forEach( point => ctx.lineTo( point.x, point.y ) );
    ctx.stroke();
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