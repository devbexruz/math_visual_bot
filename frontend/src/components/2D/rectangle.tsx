import { Shape2D } from "../ShapeTypes";

class Rectangle extends Shape2D {
    public width: number;
    public height: number;
    constructor(width: number, height: number) {
        super();
        this.width = width;
        this.height = height;
    }
}
export default Rectangle;