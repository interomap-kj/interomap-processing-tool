<!--
  Copyright (C) 2024 Joey Khalil - All Rights Reserved

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License version 3 as
  published by the Free Software Foundation.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
-->

<script lang="ts">
  import { personas } from "$lib/svg";
  import {
    drawPersona,
    drawPoints,
    getImageDimensions,
    resizeCanvas,
    scalePoints,
  } from "$lib/utils";
  import { createEventDispatcher, onMount } from "svelte";

  interface ComponentEvent {
    ready: {
      personaSide: PersonaSideKeys;
      canvas: HTMLCanvasElement;
      width: number;
      height: number;
      imgWidth: number;
      imgHeight: number;
      scaleFactor: number;
    };
  }

  export let personaSide: PersonaSideKeys;

  export function getImage(): string {
    return canvas.toDataURL("image/png");
  }

  export function getCanvas(): HTMLCanvasElement {
    return canvas;
  }

  export function getScaleFactor(): number {
    return scaleFactor;
  }

  export function setMessage(newMessage: string): void {
    message = newMessage;
  }

  export function clearMessage(): void {
    message = undefined;
  }

  export function clear(): void {
    drawPersona(image, canvas, width, height);
  }

  export function drawStrokes(strokes: Stroke[]): void {
    const ctx = canvas.getContext("2d");
    if (ctx == undefined) {
      throw "Could not get context to draw strokes.";
    }

    for (let stroke of strokes) {
      let points = stroke.points;
      let brushSize = stroke.brushSize;

      if (scaleFactor !== undefined) {
        points = scalePoints(stroke.points, scaleFactor);
        brushSize *= scaleFactor;
      } else {
        const msg =
          "Could not draw strokes because the scale factor is unknown.";
        alert(msg);
        throw msg;
      }

      drawPoints(points, ctx, stroke.brushColor, brushSize);
    }
  }

  const dispatch = createEventDispatcher<ComponentEvent>();

  let message: string | undefined = "Loading persona...";

  let imageSvgPath: string = personas[personaSide];
  let canvas: HTMLCanvasElement;
  let width: number = 0;
  let height: number = 0;
  let scaleFactor: number = 1.0;
  let image: HTMLImageElement;
  let container: HTMLDivElement;

  function onImageLoaded(): void {
    const { imgWidth, imgHeight } = getImageDimensions(image);
    // Save the resized image dimensions.
    width = Math.ceil(imgWidth);
    height = Math.ceil(imgHeight);

    // Compute the scale factor of to the resized persona image. This is used
    // to adjust the brush size so that it is proportional to the persona.
    scaleFactor = width / image.naturalWidth;

    resizeCanvas(canvas, width, height);

    // Draw the persona image inside the canvas. This call will also hide the
    // persona image as it is no longer needed.
    drawPersona(image, canvas, width, height);

    clearMessage();
    dispatch("ready", {
      personaSide,
      canvas,
      width,
      height,
      imgWidth,
      imgHeight,
      scaleFactor,
    });
  }
</script>

<div
  class="{$$props.class ?? ''} relative w-full h-full bg-white"
  bind:this={container}
>
  <!-- svelte-ignore a11y-missing-attribute -->
  <img
    src={imageSvgPath}
    class="absolute left-1/2 -translate-x-1/2 h-full object-contain"
    on:load={onImageLoaded}
    bind:this={image}
  />

  <canvas
    class="z-10 absolute left-1/2 -translate-x-1/2 h-full"
    bind:this={canvas}
  />

  {#if message}
    <div
      class="z-20 absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center py-1.5 px-2 bg-neutral-900 bg-opacity-75 text-white text-xs font-medium"
    >
      <svg
        class="animate-spin mr-1 h-4 w-4 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {message}
    </div>
  {/if}
</div>
