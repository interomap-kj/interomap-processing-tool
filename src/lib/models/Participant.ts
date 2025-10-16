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

import { drawStrokes, getPersona } from "$lib/utils";

export type DrawingArea = Record<string, number>; // key is `valence:intensity`

class Participant {
  id: string;
  persona: PersonaKeys;
  drawing: Drawing;
  areas: DrawingArea;
  totalDrawingArea: number;
  computed: boolean;

  constructor({ id, drawing }: { id: string; drawing: Drawing }) {
    this.id = id;
    this.drawing = drawing;
    this.persona = getPersona(drawing);
    this.totalDrawingArea = 0;
    this.areas = {};
    this.computed = false;
  }

  // In this function, we want to get all the pixels over which the participant
  // has drawn the stroke.
  //
  // To do so, we first get the ImageData array from the given canvas context.
  //
  //   - ImageData is a one-dimension array representing the pixels of the
  //     canvas.
  //   - It is constructed in row-major order.
  //   - Each pixel is represented by 4 array items which corresponds to its
  //     RGBA channels.
  //   - Each array item represents 1 byte (value 0 -> 255).
  //
  // In order to get a pixel map from ImageData, we need to look only at the
  // alpha channel. If it's not equal to zero, it means the pixel is drawn.
  // We can then build an array of coordinates of each drawn pixel.
  computeStrokeAreas(canvas?: HTMLCanvasElement | OffscreenCanvas) {
    canvas ??= document.createElement("canvas");

    for (const personaDrawing of Object.values(this.drawing)) {
      // Init empty pixel map.
      personaDrawing.sensationPixelMap ||= {};

      // Initialize array containing the coordinates of drawn pixels.
      personaDrawing.drawnPoints ||= [];

      for (const stroke of personaDrawing.strokes) {
        // In this function, we don't scale the canvas to the screen resolution
        // because the pixel data we get from `getImageData` below is not
        // scaled even if we scaled the canvas.
        canvas.width = personaDrawing.imgWidth;
        canvas.height = personaDrawing.imgHeight;

        const ctx = canvas.getContext("2d");
        if (ctx == undefined) {
          throw `Could not get context to draw stroke ${stroke} of participant ${this.id}.`;
        }

        // Clear the canvas before drawing.
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawStrokes([stroke], canvas);

        const pixelData = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data;

        let valence: number;
        let intensity: number;
        let x: number;
        let y: number;

        // Loop through each pixel of the canvas. For performance reasons, we
        // compute multiple things in here:
        //
        //   - The area of the current stroke.
        //   - The total area of all strokes.
        //   - The coordinates of each drawn pixel.
        //   - The sensation felt of each drawn pixel.
        //
        // Loop optimizations:
        //
        //   1. By caching the pixel array length, we save a few operations on
        //      each iteration.
        //   2. We look only at the alpha channel, i.e. the 4th array item, of
        //      each pixel to determine if it was drawn upon.
        //
        for (let i = 3, l = pixelData.length; i < l; i += 4) {
          // We are looking for the alpha channel of every pixel. It is stored
          // as every 4th element in the pixel data array.

          if (pixelData[i] > 0) {
            // If the alpha channel of the pixel is positive, it means the
            // pixel contains color, i.e. it was drawn upon.

            valence = stroke.valence;
            intensity = stroke.intensity;

            // Compute the coordinates of the pixel.
            x = Math.floor(i / 4) % personaDrawing.imgWidth;
            y = Math.floor(i / 4 / personaDrawing.imgWidth);

            // Set the sensation felt on this pixel.
            personaDrawing.sensationPixelMap[x] ||= {};
            personaDrawing.sensationPixelMap[x][y] = { valence, intensity };
          }
        }
      }

      // Use the pixel map to derive the drawn points array after having drawn all the
      // strokes. We cannot build the drawn points array while drawing each stroke
      // separately (above) because sometimes strokes overlap which leads to having
      // mulitple drawn points at the same (x,y) coordinate.
      //
      // We also use the pixel map to compute the area of each valence and intensity
      // pair.
      //
      // Here, every pixel is visited only once.
      for (const x in personaDrawing.sensationPixelMap) {
        for (const y in personaDrawing.sensationPixelMap[x]) {
          const vals: Sensation = personaDrawing.sensationPixelMap[x][y];
          personaDrawing.drawnPoints.push({
            x: parseInt(x),
            y: parseInt(y),
            ...vals,
          });

          // Compute the area of each valence:intensity pair here because every pixel
          // is visited only once, thus giving us an accurate area.
          const key = `${vals.valence}:${vals.intensity}`;
          this.areas[key] ??= 0;
          this.areas[key]++;
          this.totalDrawingArea++;
        }
      }
    }

    this.computed = true;
  }
}

export { Participant };
