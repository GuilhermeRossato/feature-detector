import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BrushService {

  constructor() { }

  private brushPixelCache: {
    size?: number,
    spacing?: number,
    shape?: "circle" | "diamond" | "square",
    pixels?: {x: number, y:number}[]
  } = {};

  getBrushPixels(size: number, spacing: number, shape: "circle" | "diamond" | "square") {
    const cache = this.brushPixelCache;
    if (cache.pixels && cache.shape === shape && cache.size === size && cache.spacing === spacing) {
      return cache.pixels;
    }
    const pixels: {x: number, y: number}[] = [];
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        if (shape === "circle") {
          const dist = ((x + 0.5 - size/2) * (x + 0.5 - size/2) + (y + 0.5 - size/2) * (y + 0.5 - size/2));
          if (dist > (size * size/4)) {
            continue;
          }
        } else if (shape === "diamond") {
          const dist = Math.abs(x + 0.5 - size/2) + Math.abs(y + 0.5 - size/2);
          if (dist >= (size/2)) {
            continue;
          }
        } else if (shape !== "square") {
          throw new Error("Unknown brush shape: "+shape);
        }
        if (spacing > 1) {
          if ((Math.abs(x - (size/2|0))) % spacing != 0) {
            continue;
          }
          if ((Math.abs(y - (size/2|0))) % spacing != 0) {
            continue;
          }
        }
        pixels.push({
          x: (x - (size / 2 | 0)),
          y: (y - (size / 2 | 0))
        });
      }
    }
    this.brushPixelCache = {size, spacing, shape, pixels};
    return pixels;
  }
}
