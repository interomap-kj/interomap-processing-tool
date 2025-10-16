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

import Papa from "papaparse";
import { Writer } from "@transcend-io/conflux";

import type { Survey } from "$lib/models/Survey";
import { drawStrokes } from "$lib/utils";
import { Participant, type DrawingArea } from "$lib/models/Participant";

const STEPS_PER_PARTICIPANT = 2;

let current: number = 0;
let total: number = 0;
let canvas: OffscreenCanvas;

function progress(event: string, msg: string): void {
  self.postMessage({
    event,
    params: { current, total, msg },
  });
}

addEventListener("message", (message) => {
  const params = message.data.params;

  if (message.data.command === "get-pixelmaps-zip") {
    // Add pixel map generation steps.
    total =
      STEPS_PER_PARTICIPANT * Object.keys(params.survey.participants).length;
    // Add archive creation step.
    total += 1;
    // Add download step.
    total += 1;
    // Init progress counter.
    current = 0;
    // Register canvas.
    canvas = params.canvas;

    process(params.survey, params.fileHandle);
  } else if (message.data.command === "get-areas") {
    const data: Array<{ id: string; drawing: Drawing }> = params.data;
    const areas: Array<{
      id: string;
      areas: DrawingArea;
      totalDrawingArea: number;
    }> = [];

    total = data.length;
    current = 0;

    // Register canvas.
    canvas = params.canvas;

    for (const participantData of data) {
      const { id, drawing } = participantData;
      const participant = new Participant({ id, drawing });

      progress("areas-progress", `Computing stroke areas of participant ${id}`);

      participant.computeStrokeAreas(canvas);
      areas.push({
        id: participant.id,
        areas: participant.areas,
        totalDrawingArea: participant.totalDrawingArea,
      });
      current++;
    }

    self.postMessage({ event: "areas-done", params: areas });
  }
});

async function process(survey: Survey, fileHandle: FileSystemFileHandle) {
  // Setup ZIP file-related streams.
  const zipFileStream = await fileHandle.createWritable();
  const { readable, writable } = new Writer();
  const writer = writable.getWriter();
  readable.pipeTo(zipFileStream);

  const participants = Object.values(survey.participants);

  let drawnPoints: SensationPoint[];
  let csv: string;

  for (const participant of participants) {
    progress(
      "pixelmaps-zip-progress",
      `Computing pixel map of participant ${participant.id}`,
    );

    for (const personaSide in participant.drawing) {
      current++;

      const side = personaSide as PersonaSideKeys;
      const drawing = participant.drawing[side]!;

      if (drawing) {
        drawnPoints = getDrawnPoints(drawing);
        csv = Papa.unparse(drawnPoints); // get CSV lines for this side

        // Create CSV file inside the ZIP archive.
        writer.write(new File([csv], `${participant.id}-${personaSide}.csv`));
      }
    }
  }

  writer.close();

  self.postMessage({ event: "pixelmaps-done" });
}

function getDrawnPoints(drawing: PersonaDrawing): SensationPoint[] {
  // `willReadFrequently` optimizes reading the bitmap (see below) by processing on the CPU.
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (ctx == undefined) {
    throw new Error("Could not get context to compute drawn points.");
  }

  const cache: Record<string, SensationPoint> = {}; // key = point coordinates

  for (const stroke of drawing.strokes) {
    // In this function, we don't scale the canvas to the screen resolution
    // because the pixel data we get from `getImageData` below is not
    // scaled even if we scaled the canvas.
    canvas.width = drawing.imgWidth;
    canvas.height = drawing.imgHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height); // clear the canvas before drawing
    drawStrokes([stroke], canvas);

    const pixelData = ctx.getImageData(
      0,
      0,
      drawing.imgWidth,
      drawing.imgHeight,
    ).data;

    let valence: number;
    let intensity: number;
    let x: number;
    let y: number;
    let key: string;

    // Loop through each pixel of the canvas. For performance reasons, we
    // compute multiple things in here:
    //
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
        x = Math.floor(i / 4) % drawing.imgWidth;
        y = Math.floor(i / 4 / drawing.imgWidth);

        // Set the sensation felt on this pixel.
        key = `${x}:${y}`;

        // This will overwrite any previous drawn pixel if the current one
        // is overlapping.
        cache[key] = { x, y, valence, intensity };
      }
    }
  }

  return Object.values(cache);
}
