// Oscar Saharoy 2021

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

    abs() {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
        return this;
    }

    setIfGreater(vec) {
        this.x = Math.max( this.x, vec.x );
        this.y = Math.max( this.y, vec.y );
        return this;
    }

    setIfLess(vec) {
        this.x = Math.min( this.x, vec.x );
        this.y = Math.min( this.y, vec.y );
        return this;
    }

    static clone(vec) {
        return new vec2(vec.x, vec.y);
    }

    static fromPolar(r, theta) {
        return new vec2( Math.cos(theta), Math.sin(theta) ).scaleBy( r );
    }

    static get zero() {
        return new vec2( 0, 0 );
    }

    static get notANumber() {
        return new vec2( NaN, NaN );
    }

    static get infinity() {
        return new vec2( Infinity, Infinity );
    }

    static get minusInfinity() {
        return new vec2( -Infinity, -Infinity );
    }

    static isNaN(vec) {
        return isNaN( vec.x ) || isNaN( vec.y );
    }

    static add(vecA, vecB) {
        return new vec2( vecA.x + vecB.x, vecA.y + vecB.y );
    }

    static sub(vecA, vecB) {
        return new vec2( vecA.x - vecB.x, vecA.y - vecB.y );
    }

    static mul(vecA, vecB) {
        return new vec2( vecA.x * vecB.x, vecA.y * vecB.y );
    }

    static div(vecA, vecB) {
        return new vec2( vecA.x / vecB.x, vecA.y / vecB.y );
    }

    static neg(vec) {
        return new vec2( -vec.x, -vec.y );
    }

    static scale(vec, S) {
        return new vec2( S * vec.x, S * vec.y );
    }

    static sqrDist(vecA, vecB) {
        return ( vecA.x - vecB.x ) ** 2 + ( vecA.y - vecB.y ) ** 2;
    }

    static dist(vecA, vecB) {
        return this.sqrDist(vecA, vecB) ** 0.5;
    }

    static taxiDist(vecA, vecB) {
        return Math.abs( vecA.x - vecB.x ) + Math.abs( vecA.y - vecB.y ); 
    }

    static grad(vec) {
        return vec.y / vec.x;
    }

    static lerp(vecA, vecB, d) {
        return vec2.scale(vecB, d).incBy( vec2.scale(vecA, 1-d) );
    }

    static dot(vecA, vecB) {
        return vecA.x * vecB.x + vecA.y * vecB.y;
    }
}