// Oscar Saharoy 2020

// vec2 class really simple
class vec2 {

    constructor(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    setxy(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    setv(vec) {
        this.x = vec.x;
        this.y = vec.y;
        return this;
    }

    incBy(vec) {
        this.x += vec.x;
        this.y += vec.y;
        return this;
    }

    decBy(vec) {
        this.x -= vec.x;
        this.y -= vec.y;
        return this;
    }

    scaleBy(S) {
        this.x *= S;
        this.y *= S;
        return this;
    }

    mulBy(vec) {
        this.x *= vec.x;
        this.y *= vec.y;
        return this;
    }

    divBy(vec) {
        this.x /= vec.x;
        this.y /= vec.y;
        return this;
    }

    clamp(lower, upper) {
        this.x = this.x < lower.x ? lower.x : this.x > upper.x ? upper.x : this.x;
        this.y = this.y < lower.y ? lower.y : this.y > upper.y ? upper.y : this.y;
        return this;
    }

    static clone(vec) {
        return new vec2(vec.x, vec.y);
    }
}

// vector arithmatic
const addv     = (vecA, vecB) => new vec2( vecA.x + vecB.x, vecA.y + vecB.y );
const subv     = (vecA, vecB) => new vec2( vecA.x - vecB.x, vecA.y - vecB.y );
const mulv     = (vecA, vecB) => new vec2( vecA.x * vecB.x, vecA.y * vecB.y );
const divv     = (vecA, vecB) => new vec2( vecA.x / vecB.x, vecA.y / vecB.y );
const negv     = (vec)        => new vec2( -vec.x, -vec.y );
const scalev   = (vec, S)     => new vec2( S * vec.x, S * vec.y );
const sqrDistv = (vecA, vecB) => ( vecA.x - vecB.x ) ** 2 + ( vecA.y - vecB.y ) ** 2;


class Graph {

    constructor() {

        // get canvas and drawing context
        this.canvas = document.getElementById("graph.js");
        this.ctx    = this.canvas.getContext("2d");

        // declare properties
        this.canvasSize         = new vec2(0, 0);
        this.dpr                = 0;
        this.mousePos           = new vec2(0, 0);
        this.mouseMove          = new vec2(0, 0);
        this.canvasToGraphScale = new vec2(1, -1).scaleBy( 0.01 ); // 2d scale factor that converts from canvas space to graph space
        this.originOffset       = new vec2(0, 0); // offset of the origin from top corner of canvas in graph space
        this.rem                = parseInt( getComputedStyle(document.documentElement).fontSize );

        // data variables
        this.points             = [ new vec2(-2.0, -0.5), new vec2(-0.8, 0.2), new vec2(0, -0.3), new vec2(0.6, 0.5), new vec2(2.0, 1.5) ];
        this.closePoint         = undefined;

        // user-changeable drawing functions
        this.pointDrawingFunction = graphjsDefaultDrawPoint;

        // grid lines variables
        this.xGridSpacing    = 1;
        this.yGridSpacing    = 1;
        this.zoomLevelX      = 0;
        this.zoomLevelY      = 0;
        this.gridLinesX      = 16;
        this.gridLinesY      = 16;

        // functions to  translate from graph space to canvas space
        this.canvasToGraph = point => point.mulBy( this.canvasToGraphScale ).incBy( this.originOffset );
        this.graphToCanvas = point => point.decBy( this.originOffset ).divBy( this.canvasToGraphScale );

        // event listeners
        window.addEventListener(      "resize",    event => this.resize(event)    );
        this.canvas.addEventListener( "wheel",     event => this.wheel(event)     );
        this.canvas.addEventListener( "mouseup",   event => this.mouseup(event)   );
        this.canvas.addEventListener( "mousemove", event => this.mousemove(event) );
        this.canvas.addEventListener( "mousedown", event => this.mousedown(event) );

        // initial canvas resize & start draw loop
        this.resize();
        this.wheel( new WheelEvent(null) );
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
        this.originOffset.decBy( new vec2( event.offsetX, event.offsetY ).scaleBy( this.dpr * zoomAmount )
                                                                         .mulBy( this.canvasToGraphScale ) );
        // change scale to zoom
        this.canvasToGraphScale.scaleBy( 1 + zoomAmount );


        // calculate which gridlines to draw
        const viewportSize = mulv( this.canvasSize, this.canvasToGraphScale );
        const xLength = viewportSize.x;
        const yLength = viewportSize.y;

        // this is awful
        if(xLength > this.gridLinesX * this.xGridSpacing) {
            this.xGridSpacing *= ((this.zoomLevelX%3)+3)%3 == 1 ? 2.5 : 2; // weird modulo fixes negative result for negative numbers
            ++this.zoomLevelX;
        }
        else if(xLength < (((this.zoomLevelX%3)+3)%3 == 2 ? this.gridLinesX/2.5 : this.gridLinesX/2) * this.xGridSpacing) {
            this.xGridSpacing /= ((this.zoomLevelX%3)+3)%3 == 2 ? 2.5 : 2;
            --this.zoomLevelX;
        }
        if(yLength > this.gridLinesY * this.yGridSpacing) {
            this.yGridSpacing *= ((this.zoomLevelY%3)+3)%3 == 1 ? 2.5 : 2;
            ++this.zoomLevelY;
        }
        else if(yLength < (((this.zoomLevelY%3)+3)%3 == 2 ? this.gridLinesY/2.5 : this.gridLinesY/2) * this.yGridSpacing) {
            this.yGridSpacing /= ((this.zoomLevelY%3)+3)%3 == 2 ? 2.5 : 2;
            --this.zoomLevelY;
        }
    }

    mousedown(event) {

        // call mousemove to update cursor
        this.mousemove(event);

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
                this.originOffset.decBy( this.mouseMove );
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
        if( !this.movedInClick ) {

            // if mouse is over an existing point then remove it
            if( this.closePoint ) 
                this.points = this.points.filter( point => point !== this.closePoint );

            // otherwise add another point at current mouse position
            else this.points.push( vec2.clone( this.mousePos ) );
        }

        // set mouse flags
        this.mouseClicked = this.movedInClick = false;

        // call mousemove to update cursor
        this.mousemove(event);
    }

    draw() {

        // clear canvas
        this.ctx.clearRect(0, 0, this.canvasSize.x, this.canvasSize.y);

        // get origin position in canvas space, limited to canvas edges
        const originOnCanvas = this.graphToCanvas( new vec2(0,0) ).clamp( new vec2(0,0), this.canvasSize );

        // draw the graph elements
        this.drawAxes( originOnCanvas );
        this.drawGridlines( originOnCanvas );
        this.drawCurve();
        this.drawPoints();
        this.drawMousePosition();
        
        requestAnimationFrame( () => this.draw() );
    }

    drawAxes(origin) {

        // draw the 2 axes

        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = "black";

        this.ctx.beginPath();

        this.ctx.moveTo(                 0, origin.y );
        this.ctx.lineTo( this.canvasSize.x, origin.y );

        this.ctx.moveTo( origin.x,                 0 );
        this.ctx.lineTo( origin.x, this.canvasSize.y );

        this.ctx.stroke();
    }

    drawGridlines(origin) {

        // change strokestyle for gridlines
        this.ctx.lineWidth   = 1;
        this.ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
        this.ctx.fillStyle   = "black";

        // set font for numbers
        this.ctx.font = "1rem Comfortaa";

        // start point for drawing gridlines
        const xStart = Math.floor( this.graphToCanvas(new vec2(0,0)).x / this.xGridSpacing - 1) * this.xGridSpacing;
        const yStart = Math.floor( this.graphToCanvas(new vec2(0,0)).y / this.yGridSpacing - 1) * this.yGridSpacing;

        // get precision for numbers - use log10 of grid spacing to find number of sig figs needed
        const sigFigs = Math.max( 1 - parseInt( Math.log10(this.xGridSpacing) ), 0 );

        // gridlines in x and y
        for(var x=xStart; x < this.canvasToGraph(this.canvasSize).x; x += this.xGridSpacing) {

            x = Math.abs(x) < 1e-10 ? 0.0 : x;

            const lineAcross = this.graphToCanvas(new vec2(x,0)).x;
            this.ctx.beginPath();
            this.ctx.moveTo(lineAcross,                 0);
            this.ctx.lineTo(lineAcross, this.canvasSize.y);
            this.ctx.stroke();

            const textHeight = this.rem;

            // draw numbers
            this.ctx.fillText( x.toFixed(sigFigs), lineAcross+4, (origin.y-8-textHeight < 0 ? textHeight+4 : originY-4) );
        }

        for(var y=yStart; y<this.canvasToGraph(this.canvasSize).y; y += this.yGridSpacing) {
         
            y = Math.abs(y)<1e-10 ? 0.0 : y;

            const lineHeight = this.graphToCanvas(new vec2(0,y)).y;
            this.ctx.beginPath();
            this.ctx.moveTo(                0, lineHeight);
            this.ctx.lineTo(this.canvasSize.y, lineHeight);
            this.ctx.stroke();

            // if number is offscreen shift it onscreen
            const textWidth = this.ctx.measureText( y.toFixed(sigFigs) ).width;

            // draw number
            this.ctx.fillText( y.toFixed(sigFigs), (origin.x+8+textWidth > this.canvasSize.x ? this.canvasSize.x-4-textWidth : origin.x+4), lineHeight-4 );
        }
    }

    drawCurve() {

    }

    drawPoints() {

        // first map points to canvas space then call pointDrawingFunction on them
        const pointsOnCanvas = this.points.map( point => this.graphToCanvas( vec2.clone( point ) ) );

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
}


// default point drawing function draws a green circle
function graphjsDefaultDrawPoint(point, ctx) {

    // set style
    ctx.strokeStyle = "#54f330";
    ctx.fillStyle   = "#ffffff"
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc( point.x, point.y, 8, 0, 6.28 );
    ctx.fill();
    ctx.stroke();
}


const graphjs = new Graph();