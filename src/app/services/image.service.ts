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
export class ImageService {

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

  getAnnotationFromCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D = null, required = true): string[] {
    if (canvas.hasAttribute("data-label-list")) {
      return JSON.parse(canvas.getAttribute("data-label-list"));
    }
    if (!ctx) {
      ctx = canvas.getContext("2d");
    }
    const data = this.getImageAppendedData(canvas, ctx);
    if (!data) {
      return null;
    }
    if (data[0] !== 138) {
      if (required) {
        throw new Error("Image data does not start with expected value of 138, got " + data[0]);
      } else {
        return [];
      }
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
    canvas.setAttribute("data-label-list", JSON.stringify(list));
    return list;
  }


  getAnnotationAt(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, point: {x: number, y:number}) {
    let list: string[];
    if (canvas.hasAttribute("data-label-list")) {
      list = JSON.parse(canvas.getAttribute("data-label-list"));
    } else {
      list = this.getAnnotationFromCanvas(canvas, ctx);
    }
    const data = ctx.getImageData(point.x | 0, point.y | 0, 1, 1).data;
    if (data[3] < 128 || data[3] >= 255) {
      return null;
    }
    const labelId = Math.round((255 - data[3]) / 2) - 1;
    if (labelId >= list.length) {
      return null;
    }
    return list[labelId];
  }

  getFeatureLabelCountList(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D = null): number[] {
    if (!ctx) {
      ctx = canvas.getContext("2d");
    }
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height-1);
    if (!imageData || !imageData.data || imageData.width !== canvas.width || imageData.height !== canvas.height - 1) {
      return null;
    }
    let counts = [];
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const data = imageData.data[(y * imageData.height + x) * 4 + 3];
        if (data > 128 && data < 255) {
          const labelId = Math.round((255 - data) / 2) - 1;
          if (typeof counts[labelId] !== "number") {
            counts[labelId] = 1;
          } else {
            counts[labelId]++;
          }
        }
      }
    }
    return counts;
  }

  getFeaturePixels(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height-1);
    if (!imageData || !imageData.data || imageData.width !== canvas.width || imageData.height !== canvas.height) {
      return null;
    }
    let count = 0;
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const data = imageData.data[(y * imageData.height + x) * 4 + 3];
        if (data > 128 && data < 255) {
          const labelId = Math.round((255 - data) / 2) - 1;
        }
      }
    }
    return imageData.data;
  }

  /**
   * Converts an RGB color value to HSL. Conversion formula
   * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
   *
   * @param r The red color value in the set [0, 255]
   * @param g The green color value in the set [0, 255]
   * @param b The blue color value in the set [0, 255]
   * @return  The HSL representation array where each element is in the set [0, 1]
   */
  rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255, g /= 255, b /= 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max == min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }

      h /= 6;
    }

    return [h, s, l];
  }
}
