import { Shape2D } from "../ShapeTypes";

class Dot extends Shape2D {
    public symbol: string;
    public x: number;
    public y: number;
    constructor(x: number, y: number, symbol: string) {
        super();
        this.symbol = symbol || "";
        this.x = x;
        this.y = y;
    }
}
export default Dot;

