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

    abs() {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
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