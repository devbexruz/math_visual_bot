import { Shape2D } from "../ShapeTypes";

class Ellips extends Shape2D {
    public a: number;
    public b: number;
    constructor(a: number, b: number) {
        super();
        this.a = a;
        this.b = b;
    }
}
export default Ellips;
