// Oscar Saharoy 2020

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

    static clone(vec) {
        return new vec2(vec.x, vec.y);
    }

    static fromPolar(r, theta) {
        return new vec2( Math.cos(theta), Math.sin(theta) ).scaleBy( r );
    }

    static notANumber() {
        return new vec2( NaN, NaN );
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

    static taxiDist(vecA, vecB) {
        return Math.abs( vecA.x - vecB.x ) + Math.abs( vecA.y - vecB.y ); 
    }

    static lerp(vecA, vecB, d) {
        return vec2.scale(vecB, d).incBy( vec2.scale(vecA, 1-d) );
    }
}