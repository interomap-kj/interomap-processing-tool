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

// This factory helps us build rectangular bins of two-dimensional points.
// For example: Group all (x, y) points that are inside the same 10x10 area.
// Code inspired by https://github.com/fabid/d3-rectbin

export class BinFactory {
  xDomain: [number, number];
  yDomain: [number, number];
  binWidth: number = 1.0;
  binHeight: number = 1.0;
  _bins: Record<string, Bin> = {};

  constructor(
    xDomain: [number, number],
    yDomain: [number, number],
    binWidth?: number,
    binHeight?: number,
  ) {
    this.xDomain = xDomain;
    this.yDomain = yDomain;
    this.binWidth = binWidth ?? this.binWidth;
    this.binHeight = binHeight ?? this.binHeight;

    this.makeBins();
  }

  makeBins() {
    for (
      let x = this.xDomain[0], l = this.xDomain[1];
      x < l;
      x += this.binWidth
    ) {
      for (
        let y = this.yDomain[0], l = this.yDomain[1];
        y < l;
        y += this.binHeight
      ) {
        // Compute the coordinates in the reduced domain
        const nx = Math.floor(x / this.binWidth);
        const ny = Math.floor(y / this.binHeight);
        const id = nx + "-" + ny;

        // Compute the coordinates of the bin in the original domain.
        const bx = nx * this.binWidth;
        const by = ny * this.binHeight;

        // Store the coordinates as properties in the Array.
        this._bins[id] = Object.assign(new Array<SensationPoint>(), {
          nx,
          ny,
          x: bx,
          y: by,
        });
      }
    }
  }

  binPoints(points: SensationPoint[], onProgress?: (progress: number, total: number) => void) {
    const total = points.length;
    console.log(total)
    let progress = 0;

    for (let i = 0; i < points.length; i++) {
      // Compute the coordinates of the point in the reduced domain
      const nx = Math.floor(points[i].x / this.binWidth);
      const ny = Math.floor(points[i].y / this.binHeight);
      const id = nx + "-" + ny;
      const bin = this._bins[id];

      if (bin === undefined) {
        throw `Error: Could not find bin for point with id ${id}`;
      }

      bin.push(points[i]);
      progress++;

      if (onProgress) onProgress(progress, total);
    }
  }

  // Return only non-empty bins.
  get bins() {
    return Object.values(this._bins).filter((b) => b.length > 0);
  }
}
