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

// See https://kit.svelte.dev/docs/types#app

import type { ComponentProps } from "svelte";

import type WorkspacePanel from "$lib/components/WorkspacePanel.svelte";
import type { Writable } from "svelte/store";

// for information about these interfaces
declare global {
  enum Persona {
    Female,
    Male,
  }

  type PersonaKeys = keyof typeof Persona;

  enum PersonaSide {
    FemaleFront,
    FemaleBack,
    MaleFront,
    MaleBack,
  }

  type PersonaSideKeys = keyof typeof PersonaSide;

  type SvgPath = {
    [side in PersonaSideKeys]: string;
  };

  type Point = {
    x: number;
    y: number;
  };

  type Sensation = {
    valence: number;
    intensity: number;
  };

  type SensationPoint = Point & Sensation;

  type Stroke = {
    points: Point[];
    brushColor: string;
    brushSize: number;
    intensity: number;
    valence: number;
  };

  type PixelMapX = {
    [key: number]: PixelMapY;
  };

  type PixelMapY = {
    [key: number]: Sensation;
  };

  type PixelMapLine = {
    x: number;
    y: number;
    valence: number;
    intensity: number;
  };

  type PersonaDrawing = {
    imgWidth: number;
    imgHeight: number;
    scaleFactor: number;
    strokes: Stroke[];
    sensationPixelMap?: PixelMapX;
    drawnPoints?: SensationPoint[];
  };

  type Drawing = {
    [personaSide in PersonaSideKeys]?: PersonaDrawing;
  };

  type Bin = Array<SensationPoint> & {
    x: number;
    y: number;
  };

  type MenuContext = {
    enableIcon: boolean;
  };

  type ValenceMapPoint = Point & {
    valence: number;
    intensity: number;
  };

  type ImageExport = {
    name: string;
    dataUrl: string;
  };
}

export {};
