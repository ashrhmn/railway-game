export class Position {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  getPosition() {
    return { x: this.x, y: this.y };
  }

  left() {
    return new Position(this.x - 1, this.y);
  }

  right() {
    return new Position(this.x + 1, this.y);
  }

  up() {
    return new Position(this.x, this.y + 1);
  }

  down() {
    return new Position(this.x, this.y - 1);
  }

  isValid() {
    return this.x >= 0 && this.x <= 14 && this.y >= 0 && this.y <= 14;
  }
}
