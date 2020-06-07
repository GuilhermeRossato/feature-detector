import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, HostListener, OnChanges, SimpleChanges, Input } from '@angular/core';
import { BrushService } from '../services/brush.service';
import { ImageService } from '../services/image.service';

const clamp = (min: number, max: number) => (value: number) => value < min ? min : value > max ? max : value;

@Component({
  selector: 'app-brush-visualization',
  templateUrl: './brush-visualization.component.html',
  styleUrls: ['./brush-visualization.component.css']
})
export class BrushVisualizationComponent implements OnInit, AfterViewInit, OnChanges {

  public canvasSize: number;
  public leftText?: string;
  public rightText?: string;

  private readonly spaceClamp = clamp(0, 20);
  private readonly sizeClamp = clamp(1, 1000);

  @Input() brushSize: number = 32;
  @Input() brushSpacing: number = 1;
  @Input() brushShape: "square" | "circle" | "diamond" = "circle";
  @Input() brushFormat: "RGB" | "HSL" | "R" | "G" | "B" | "I" = "I";
  @Input() canvasInput: {canvas: HTMLCanvasElement, x: number, y:number} = null;

  @ViewChild("left") left: ElementRef<HTMLCanvasElement>;
  @ViewChild("right") right: ElementRef<HTMLCanvasElement>;

  constructor(
    private elRef: ElementRef,
    private brushService: BrushService,
    private imageService: ImageService
  ) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.redrawCanvas();
  }

  redrawCanvas() {
    if (!this.left || !this.right) {
      if (!this.left && !this.right) {
        return console.warn("Missing both canvases from brush visualization component");
      }
      return console.warn(`Missing ${this.left ? "the right" : "the left"} canvas`);
    }
    if (!this.left.nativeElement || !this.right.nativeElement) {
      return;
    }

    const size = Math.floor(this.sizeClamp(this.brushSize) / 2) * 2 + 1;
    const spacing = this.spaceClamp(this.brushSpacing);
    const format = this.brushFormat;
    const shape = this.brushShape;
    const input = this.canvasInput;

    const left = this.left.nativeElement;
    const right = this.right.nativeElement;
    const leftCtx = left.getContext("2d");
    const rightCtx = right.getContext("2d");

    if (left.width !== size) {
      left.width = size;
      left.height = size;
      right.width = size;
      right.height = size;
    }

    const pixels = this.brushService.getBrushPixels(size, spacing, shape);

    this.drawRawBrush(left, leftCtx, size, pixels);
    this.leftText = `${pixels.length} pixels in a ${size}x${size} area`;

    if (input && input.canvas) {
      const point = { x: input.x | 0, y: input.y | 0 };
      this.drawInputBrushAt(right, rightCtx, size, pixels, input.canvas, point);
      const label = this.imageService.getAnnotationAt(input.canvas, input.canvas.getContext("2d"), point);
      let prefix;
      let sufix = "";
      if (label) {
        prefix = `Label "${label}" at (${point.x}, ${point.y})`;
      } else {
        prefix = `No label at (${point.x}, ${point.y})`;
      }
      if (input.canvas.hasAttribute("data-filename")) {
        sufix = ` of "${input.canvas.getAttribute("data-filename")}"`;
      }
      if (this.rightText !== prefix + sufix) {
        this.rightText = prefix + sufix;
      }
    } else {
      rightCtx.clearRect(-1, -1, size + 2, size + 2);
    }
  }

  drawInputBrushAt(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    size: number,
    pixels: {x: number, y: number}[],
    input: HTMLCanvasElement,
    pixel: {x: number, y: number}
  ) {
    const horizontalClamp = clamp(0, input.width);
    const verticalClamp = clamp(0, input.height);
    const inputOrigin = {
      x: horizontalClamp((pixel.x | 0) - (size / 2 | 0)),
      y: verticalClamp((pixel.y | 0) - (size / 2 | 0))
    };
    const inputTarget = {
      x: horizontalClamp(inputOrigin.x + size),
      y: verticalClamp(inputOrigin.y + size)
    };
    const inputData = input.getContext("2d").getImageData(
      inputOrigin.x,
      inputOrigin.y,
      inputTarget.x - inputOrigin.x,
      inputTarget.y - inputOrigin.y,
    );

    const imageData = ctx.getImageData(0, 0, size, size);
    for (let pixel of pixels) {
      const localX = (pixel.x | 0) + (size / 2 | 0);
      const localY = (pixel.y | 0) + (size / 2 | 0);
      const inputX = (localX + inputOrigin.x) | 0;
      const inputY = (localY + inputOrigin.y) | 0;
      if (localX < 0 || localX > size || localY < 0 || localY > size) {
        throw new Error(`Pixel outside boundary: Original: ${pixel.x}, ${pixel.y} Size: ${size} Converted: ${localX} ${localY}`);
      }
      let color: {r: number, g: number; b: number};

      if (
        inputX >= inputOrigin.x &&
        inputY >= inputOrigin.y &&
        inputX <= inputTarget.x &&
        inputY <= inputTarget.y
      ) {
        let i = ((inputY - inputOrigin.y) * size + (inputX - inputOrigin.x)) * 4;
        if (i < 0 || i >= inputData.data.length) {
          color = {
            r: inputX > inputOrigin.x ? 255 : 128,
            g: inputY > inputOrigin.y ? 255 : 128,
            b: inputX < inputTarget.x ? 255 : 128
          };
        } else {
          color = {
            r: inputData.data[i+0],
            g: inputData.data[i+1],
            b: inputData.data[i+2]
          }
        }
      }

      if (color) {
        let i = (localY * size + localX) * 4;
        imageData.data[i++] = color.r;
        imageData.data[i++] = color.g;
        imageData.data[i++] = color.b;
        imageData.data[i++] = 255;
      } else {
        imageData.data[(localY * size + localX) * 4 + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  drawRawBrush(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, size: number, pixels: {x: number, y: number}[]) {
    const imageData = ctx.getImageData(0, 0, size, size);
    for (let pixel of pixels) {
      const x = pixel.x + (size / 2 | 0);
      const y = pixel.y + (size / 2 | 0);
      if (x < 0 || x > size || y < 0 || y > size) {
        throw new Error(`Pixel outside boundary: Original: ${pixel.x}, ${pixel.y} Size: ${size} Converted: ${x} ${y}`);
      }
      let i = (y * size + x) * 4;
      imageData.data[i++] = 255*x/size;
      imageData.data[i++] = 255*y/size;
      imageData.data[i++] = 0;
      imageData.data[i++] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.updateCanvasHeight();
  }

  updateCanvasHeight() {
    const width = this.elRef.nativeElement.getBoundingClientRect().width / 2;
    this.setCanvasSize(width);
  }

  setCanvasSize(height: number) {
    this.canvasSize = height;
  }

  ngAfterViewInit(): void {
    setTimeout(this.updateCanvasHeight.bind(this), 10);
    setTimeout(this.redrawCanvas.bind(this), 10);
  }
}
