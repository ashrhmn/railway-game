export type IEditingSetting = null | {
  key: string;
  strValue?: string | null;
  numValue?: number | null;
  boolValue?: boolean | null;
  valueType: string;
  title: string | null;
};

export interface IPoint {
  x: number;
  y: number;
}

export class Position {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  static from(point: IPoint) {
    return new Position(point.x, point.y);
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
}
