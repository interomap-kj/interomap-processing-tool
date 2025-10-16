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

import * as THREE from "three";
import { getMidPoint } from "$lib/utils";

addEventListener("message", (message) => {
  if (message.data.command === "getBins") {
    const {
      drawings,
      side,
    }: {
      drawings: PersonaDrawing[];
      side: string;
      binWidth: number;
      binHeight: number;
      width: number;
      height: number;
    } = message.data.params;

    if (drawings.length === 0) {
      // If there are no drawings, don't bother going further, return early.
      self.postMessage({
        event: "bins",
        params: { side, bins: [] },
      });
      return;
    }

    const bins = getBins(drawings, side);

    self.postMessage({
      event: "progress",
      params: {
        side,
        msg: "Moving data",
      },
    });

    self.postMessage({
      event: "bins",
      params: { side, bins },
    });
  }
});

function getBins(personaDrawings: PersonaDrawing[], side: string): Bin[] {
  const bins: Record<string, Bin> = {};
  const total: number = personaDrawings.length;

  let progress: number = 0;

  for (const personaDrawing of personaDrawings) {
    for (const stroke of personaDrawing.strokes) {
      if (stroke.points.length < 2) continue;

      const path = new THREE.Path();
      const cache = new Set<string>();
      const radius = stroke.brushSize / 2;

      let p1 = stroke.points[0];
      let p2 = stroke.points[1];

      // Move to the end of the first curve.
      path.moveTo(p2.x, p2.y);

      for (let i = 1; i < stroke.points.length; i++) {
        const midPoint: Point = getMidPoint(p1, p2);
        path.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
        p1 = stroke.points[i];
        p2 = stroke.points[i + 1];
      }

      // Join the last point to the path.
      path.lineTo(p1.x, p1.y);

      const pathPoints = path.getPoints(1);

      // Process each point because there are a lot of overlapping points.
      for (const pathPoint of pathPoints) {
        let { x, y } = pathPoint;
        x = Math.round(x);
        y = Math.round(y);

        // Enlarge point to brush size.
        // Filter unique points.
        for (let ix = x - radius; ix < x + radius; ix++) {
          if (ix < 0 || ix > personaDrawing.imgWidth) continue;

          for (let iy = y - radius; iy < y + radius; iy++) {
            if (iy < 0 || iy > personaDrawing.imgHeight) continue;
            const key = `${ix}:${iy}`;
            if (cache.has(key)) continue; // overlapping point, skip it

            const drawnPoint: SensationPoint = {
              x: ix,
              y: iy,
              valence: stroke.valence,
              intensity: stroke.intensity,
            };

            if (bins[key] == undefined) {
              const newBin: Bin = Object.assign(new Array<SensationPoint>(), {
                x: ix,
                y: iy,
              });
              bins[key] = newBin;
            }
            bins[key].push(drawnPoint);
            cache.add(key); // add to cache to filter out overlapping points
          }
        }
      }
    }

    progress++;

    self.postMessage({
      event: "progress",
      params: {
        side,
        msg: `Merging drawings (${Math.round((100 * progress) / total)}%)`,
      },
    });
  }

  return Object.values(bins);
}
