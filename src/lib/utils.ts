/*
 * Copyright (C) 2024 Joey Khalil - All Rights Reserved
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

function* iter_range(begin: number, end: number, step: number) {
  // Normalize our inputs
  step = step ? step : 1;

  if (begin == end) {
    return;
  }

  if (begin > end) {
    step = step * -1;
  }

  for (let x = begin; x <= end; x += step) {
    yield x;
  }
}

export function range(begin: number, end: number, step: number): number[] {
  return Array.from(iter_range(begin, end, step));
}

export function getImageDimensions(image: HTMLImageElement): {
  newWidth: number;
  newHeight: number;
  imgWidth: number;
  imgHeight: number;
} {
  // Show the persona image to get its dimensions.
  image.classList.remove("hidden");

  // The persona image is sized via CSS relatively to the page layout.
  // We use its dimensions to resize the canvases so that they fit to the
  // persona image.
  const { width, height } = image.getBoundingClientRect();

  image.classList.add("hidden");

  return {
    newWidth: width,
    newHeight: height,
    imgWidth: image.naturalWidth,
    imgHeight: image.naturalHeight,
  };
}

export function resizeCanvas(
  canvas: HTMLCanvasElement,
  newWidth: number,
  newHeight: number,
): void {
  const context = canvas.getContext("2d");
  if (context == undefined) {
    throw "Could not get context while resizing the canvas.";
  }

  // Scale the canvas for users with a high-resolution screen.
  const dpr = window.devicePixelRatio || 1;
  canvas.width = newWidth * dpr;
  canvas.height = newHeight * dpr;
  context.scale(dpr, dpr);
}

export function drawPersona(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): void {
  const context = canvas.getContext("2d");
  if (context == undefined) {
    throw "Could not get context while drawing persona on the canvas.";
  }

  // Show the persona image to be able to draw it in the canvas.
  image.classList.remove("hidden");

  // Draw the persona image inside the canvas.
  context.drawImage(image, 0, 0, width, height);
  // This has the same effect as a clipping mask.
  context.globalCompositeOperation = "source-atop";

  // Hide the image element as we don't need it anymore because we drew the
  // image inside the canvas.
  image.classList.add("hidden");
}

export function drawImage(
  image: HTMLImageElement,
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  clipping: boolean = false,
): void {
  // Draw the image inside the canvas.
  context.drawImage(image, 0, 0, width, height);

  if (clipping) {
    // This has the same effect as a clipping mask.
    context.globalCompositeOperation = "source-atop";
  }
}

export function drawPoints(
  points: Point[],
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  color?: string,
  size?: number,
): void {
  if (points.length < 2) return;

  context.lineJoin = "round";
  context.lineCap = "round";

  if (color) {
    context.strokeStyle = color;
  }

  if (size) {
    context.lineWidth = size;
  }

  let p1 = points[0];
  let p2 = points[1];

  context.beginPath();

  // Move to the end of the first curve.
  context.moveTo(p2.x, p2.y);

  for (let i = 1; i < points.length; i++) {
    const midPoint: Point = getMidPoint(p1, p2);
    context.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
    p1 = points[i];
    p2 = points[i + 1];
  }

  // When the user draws without dragging, i.e. a single point drawing, it's a
  // zero-length line segment.
  // According to the spec, zero-length line segments are pruned before stroke.
  // This is what Safari does, i.e. it does not render the user's
  // "single-point" drawing. However, Firefox and Chrome violate the spec and
  // render it.
  // We want to keep the code and the serialized output simple, so we choose
  // to bypass the spec by nudging the last point coordinates by 0.1 pixel in
  // order to make it draw when calling `lineTo` right after.
  // Refs:
  // - [Spec](https://html.spec.whatwg.org/multipage/canvas.html#trace-a-path)
  // - [Discussion](https://github.com/whatwg/html/issues/1079)
  // - [Firefox bug report](https://bugzilla.mozilla.org/show_bug.cgi?id=691187)
  // - [Chrome bug report](https://bugs.chromium.org/p/chromium/issues/detail?id=644067)
  p1.x += 0.1;
  p1.y += 0.1;

  // Join the last point to the path.
  context.lineTo(p1.x, p1.y);

  context.stroke();
}

export function getMidPoint(p1: Point, p2: Point): Point {
  return {
    x: p1.x + (p2.x - p1.x) / 2,
    y: p1.y + (p2.y - p1.y) / 2,
  };
}

export function drawStrokes(
  strokes: Stroke[],
  canvas: HTMLCanvasElement | OffscreenCanvas,
  scaleFactor?: number,
): void {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (ctx == undefined) {
    throw "Could not get context to draw strokes.";
  }

  for (const stroke of strokes) {
    let points = stroke.points;
    let brushSize = stroke.brushSize;

    if (scaleFactor !== undefined) {
      points = scalePoints(stroke.points, scaleFactor);
      brushSize *= scaleFactor;
    }

    drawPoints(points, ctx, stroke.brushColor, brushSize);
  }
}

export function scalePoints(points: Point[], scaleFactor: number): Point[] {
  return points.map((p) => ({ x: p.x * scaleFactor, y: p.y * scaleFactor }));
}

// Function that rounds all the given points coordinates to the nearest pixel.
// It returns a new array.
export function roundPoints(points: Point[]): Point[] {
  return points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
}

export function getProgress(i: number, total: number): number {
  return i / total;
}

export function getPersona(drawing: Drawing): PersonaKeys {
  if (drawing.FemaleFront) {
    return "Female";
  }

  return "Male";
}
