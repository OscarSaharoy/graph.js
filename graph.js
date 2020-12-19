// Oscar Saharoy 2020

class Graph {

    constructor() {

        // get canvas and drawing context
        this.canvas = document.getElementById("graph.js");
        this.ctx    = this.canvas.getContext("2d");

        // declare properties
        this.canvasSize          = new vec2(0, 0);
        this.canvasToGraphScale  = new vec2(0.01, -0.01); // 2d scale factor that converts from canvas space to graph space
        this.originOffset        = new vec2(0, 0); // offset of the origin from top corner of canvas in graph space
        this.originFixedInCanvas = new vec2(0, 0);
        this.mousePos            = new vec2(0, 0);
        this.mouseMove           = new vec2(0, 0);
        this.dpr                 = 0;
        this.rem                 = parseInt( getComputedStyle(document.documentElement).fontSize );

        // data variables
        this.points              = [ new vec2(-2.0, -0.5), new vec2(-0.8, 0.2), new vec2(0, -0.3), new vec2(0.6, 0.5), new vec2(2.0, 1.5) ];
        this.closePoint          = undefined;

        // user-changeable drawing functions
        this.pointDrawingFunction = graphjsDefaultDrawPoint;
        this.curveDrawingFunction = graphjsDefaultDrawCurve;

        // functions to  translate from graph space to canvas space
        this.canvasToGraph  = point  => point.mulBy( this.canvasToGraphScale ).decBy( this.originOffset );
        this.graphToCanvas  = point  => point.incBy( this.originOffset ).divBy( this.canvasToGraphScale );

        this.graphToCanvasX = graphX => (graphX + this.originOffset.x) / this.canvasToGraphScale.x;
        this.graphToCanvasY = graphY => (graphY + this.originOffset.y) / this.canvasToGraphScale.y;

        // event listeners
        window.addEventListener(      "resize",     event => this.resize(event)    );
        this.canvas.addEventListener( "wheel",      event => this.wheel(event)     );
        this.canvas.addEventListener( "mouseup",    event => this.mouseup(event)   );
        this.canvas.addEventListener( "mousemove",  event => this.mousemove(event) );
        this.canvas.addEventListener( "mousedown",  event => this.mousedown(event) );
        this.canvas.addEventListener( "mouseleave", event => this.mouseleave(event) );

        // initial canvas resize & start draw loop
        this.resize();
        this.draw();
    }

    resize() {

        // set canvas to have 1:1 canvas pixel to screen pixel ratio
        this.dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvasSize.setxy( rect.width * this.dpr, rect.height * this.dpr );

        this.canvas.width  = this.canvasSize.x;
        this.canvas.height = this.canvasSize.y;
    }

    wheel(event) {

        // zoom in and out on the graph

        event.preventDefault();

        const zoomAmount = event.deltaY / 1000;

        // offset origin by a bit to keep mouse in same place on graph
        this.originOffset.incBy( new vec2( event.offsetX, event.offsetY ).scaleBy( this.dpr * zoomAmount )
                                                                         .mulBy( this.canvasToGraphScale ) );
        // change scale to zoom
        this.canvasToGraphScale.scaleBy( 1 + zoomAmount );
    }

    mousedown(event) {

        // set mouseclicked flag
        this.mouseClicked = true;
    }

    mousemove(event) {

        // get mousePos for display at top of graph and close data point, and mouseMove for panning graph
        this.canvasToGraph( this.mousePos.setxy( event.offsetX, event.offsetY ).scaleBy( this.dpr ) );
        this.mouseMove.setxy( event.movementX, event.movementY ).mulBy( this.canvasToGraphScale );

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
        }

        // otherwise handle case where mouse isnt clicked
        else {

            // update close point
            this.closePoint = this.points.find( point => sqrDistv( this.graphToCanvas( vec2.clone( this.mousePos ) ), 
                                                                   this.graphToCanvas( vec2.clone( point         ) ) ) < this.rem**2 / 4 );

            // if mouse is close to a point then change cursor to movey
            this.canvas.style.cursor = this.closePoint ? "move" : "auto";
        }
    }

    mouseup(event) {

        // handle adding/removing a point on click but only if the mouse didn't more during the click
        if( this.mouseClicked && !this.movedInClick ) {

            // if mouse is over an existing point then remove it
            if( this.closePoint ) 
                this.points = this.points.filter( point => point !== this.closePoint );

            // otherwise add another point at current mouse position
            else this.points.push( vec2.clone( this.mousePos ) );
        }

        // set mouse flags
        this.mouseClicked = this.movedInClick = false;

        // update cursor
        this.canvas.style.cursor = this.closePoint ? "move" : "auto";
    }

    mouseleave(event) {

        // treat mouse leaving the canvas as a mouseup event
        this.mouseup(event);
    }

    draw() {

        // clear canvas
        this.ctx.clearRect(0, 0, this.canvasSize.x, this.canvasSize.y);

        // set origin position fixed inside the canvas
        this.originFixedInCanvas.setv( 
            divv( this.originOffset, this.canvasToGraphScale ).clamp( new vec2(0, 0), this.canvasSize ) );

        // get positions of gridlines on graph
        const gridlinePositions = this.getGridlinePositions();

        // map points to canvas space - used for drawing them
        const pointsOnCanvas = this.points.map( vec2.clone ).map( this.graphToCanvas );

        // draw the graph elements
        this.drawAxes();
        this.drawGridlines(gridlinePositions);
        this.drawCurve(pointsOnCanvas);
        this.drawPoints(pointsOnCanvas);
        this.drawLabels(gridlinePositions);
        this.drawMousePosition();
        
        requestAnimationFrame( () => this.draw() );
    }

    getGridlinePositions() {

        // object to hold the gridlines in x and y directions
        const gridlines = { x: [], y: [] };

        // size of the graph in graph space
        const graphSize        = mulv( this.canvasSize, this.canvasToGraphScale ).abs();

        // calculate space between the gridlines in graph units
        const gridlineSpacingX = Math.pow(10, Math.floor( Math.log10(graphSize.x) ) );
        const gridlineSpacingY = Math.pow(10, Math.floor( Math.log10(graphSize.y) ) );

        // const gridlineSpacingX = Math.pow(5, Math.floor( Math.log10(graphSize.x) ) );
        // const gridlineSpacingY = Math.pow(5, Math.floor( Math.log10(graphSize.y) ) );

        // calculate positions of the most negative gridline in graph space
        const firstGridlineX   = Math.floor( - this.originOffset.x                / gridlineSpacingX ) * gridlineSpacingX;
        const firstGridlineY   = Math.floor( -(this.originOffset.y + graphSize.y) / gridlineSpacingY ) * gridlineSpacingY;

        // keep adding grid lines at a spacing of gridlineSpacing until the whole graph is covered
        for(var x = firstGridlineX; x < firstGridlineX + graphSize.x + gridlineSpacingX; x += gridlineSpacingX)
            gridlines.x.push(x);

        for(var y = firstGridlineY; y < firstGridlineY + graphSize.y + gridlineSpacingY; y += gridlineSpacingY)
            gridlines.y.push(y);

        return gridlines;
    }

    drawAxes() {

        // draw the 2 axes

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
        const text = this.mousePos.x.toFixed(3) + ", " + this.mousePos.y.toFixed(3);
        const textWidth = this.ctx.measureText(text).width;

        // draw white box behind
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(this.canvasSize.x-8-textWidth, 0, 8+textWidth, this.rem*1.3 + 8);

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
        const textHeight = this.rem;
        const text       = graphX.toFixed(1);
        const textX      = canvasX + textHeight / 2;
        const textY      = canvasY-textHeight*2 < 0 ? textHeight*1.5 : canvasY-textHeight/2;

        this.ctx.fillText( text, textX, textY );
    }

    drawYLabel(graphY) {

        // get y coordinate of label in canvas space
        const canvasY = this.graphToCanvasY( graphY );
        const canvasX = this.originFixedInCanvas.x;

        // draw number
        const text       = graphY.toFixed(1);
        const textHeight = this.rem;
        const textWidth  = this.ctx.measureText( text ).width;
        const textX      = canvasX+textHeight+textWidth > this.canvasSize.x ? this.canvasSize.x-textHeight/2-textWidth : canvasX+textHeight/2;
        const textY      = canvasY - textHeight / 2;

        this.ctx.fillText( text, textX, textY );
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

function graphjsDefaultDrawCurve(points, ctx) {

    // set style
    ctx.strokeStyle = "#54f330";
    ctx.lineWidth   = 2;

    ctx.beginPath();
    ctx.moveTo( points[0].x, points[0].y );
    points.forEach( point => ctx.lineTo( point.x, point.y ) );
    ctx.stroke();
}


const graphjs = new Graph();