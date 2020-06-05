import { Injectable } from '@angular/core';

function encodeCharCode(cCode) {
  if (isNaN(cCode) || !cCode || cCode < 10 || cCode > 127) {
    return 1 + 26 + 10 + 26 + 2;
  } else if (cCode >= ('a').charCodeAt(0) && cCode <= ('z').charCodeAt(0)) {
    return 1 + cCode - ('a').charCodeAt(0);
  } else if (cCode >= ('0').charCodeAt(0) && cCode <= ('9').charCodeAt(0)) {
    return 1 + 26 + (cCode - ('0').charCodeAt(0));
  } else if (cCode >= ('A').charCodeAt(0) && cCode <= ('Z').charCodeAt(0)) {
    return 1 + 26 + 10 + (cCode - ('A').charCodeAt(0));
  } else if (cCode == ('=').charCodeAt(0)) {
    return 26 + 10 + 26 + 1;
  } else if (cCode == (' ').charCodeAt(0)) {
    return 26 + 10 + 26 + 2;
  } else {
    return 26 + 10 + 26 + 3;
  }
}

function decodeCharCode(code) {
  if (code === 26 + 10 + 26 + 1) {
    return '=';
  } else if (code === 26 + 10 + 26 + 2) {
    return ' ';
  } else if (code === 26 + 10 + 26 + 3) {
    return '-';
  } else if (code > 0 && code <= 26) {
    return String.fromCharCode(('a').charCodeAt(0) + code - 1);
  } else if (code >= 26 && code <= 36) {
    return String.fromCharCode(('0').charCodeAt(0) + (code - 27));
  } else if (code >= 36 && code <= 36 + 26) {
    return String.fromCharCode(('A').charCodeAt(0) + (code - 37));
  } else {
    return null;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AppendedImageService {

  constructor() { }

  getImageAppendedData(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const imageData = ctx.getImageData(0, canvas.height-1, canvas.width, 1);
    if (!imageData || !imageData.data || imageData.width !== canvas.width || imageData.data.length !== canvas.width * 4) {
      return null;
    }
    return imageData.data;
  }

  isAnnotatedCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const data = this.getImageAppendedData(canvas, ctx);
    if (!data) {
      return false;
    }
    return (
      (data[0] === 137 || data[0] === 138) &&
      (data[1] === 8 || data[1] === 9) &&
      (data[2] === 199) &&
      (data[3] === 124 || data[3] === 255)
    );
  }

  getAnnotationFromCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): string[] {
    const data = this.getImageAppendedData(canvas, ctx);
    if (!data) {
      return null;
    }
    if (data[0] !== 138) {
      throw new Error("Image data does not start with expected value of 138, got " + data[0]);
    }
    let i = 4;
    const maxIndex = data.length - 4;

    let list = [""];
    for (let i = 4; i < maxIndex; i++) {
      if (i % 4 === 3) {
        continue;
      }
      const rawCode = data[i];
      const code = decodeCharCode(Math.round(rawCode / 3));
      if (code === null) {
        if (!list[list.length-1]) {
          break;
        }
        list.push("");
        continue;
      }
      list[list.length-1] += code;
    }
    if (list[list.length-1] === "") {
      list.pop();
    }
    return list;
  }
}
