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
  import chroma from "chroma-js";
  import { onMount, type ComponentEvents } from "svelte";

  import type { Survey } from "$lib/models/Survey";

  import Workspace from "./Workspace.svelte";
  import WorkspacePanel from "./WorkspacePanel.svelte";
  import PersonaCanvas from "./PersonaCanvas.svelte";
  import LabelField from "./LabelField.svelte";

  /* BEGIN: VIEW MODEL */
  export let survey: Survey;

  let personaCanvasFront: PersonaCanvas;
  let personaCanvasBack: PersonaCanvas;
  let persona: PersonaKeys = "Female";
  let binsFront: Bin[];
  let binsBack: Bin[];
  let binWidth: number = 1; // by default, 1px wide
  let binHeight: number = 1; // by default, 1px high
  let totalForPersona: number = 0;
  let computationCount: number = 0;
  /* END: VIEW MODEL */

  // https://vitejs.dev/guide/features.html#web-workers
  const worker = new Worker(
    new URL("../workers/binning.worker.ts", import.meta.url),
    { type: "module" },
  );

  export function getImages(): ImageExport[] {
    return [
      {
        name: `ValenceMap-${persona}Front.png`,
        dataUrl: personaCanvasFront.getImage(),
      },
      {
        name: `ValenceMap-${persona}Back.png`,
        dataUrl: personaCanvasBack.getImage(),
      },
    ];
  }

  function makeBins(personaSide: PersonaSideKeys): void {
    const drawings: PersonaDrawing[] = [];

    for (const p of Object.values(survey.participants)) {
      const drawing = p.drawing[personaSide];
      if (drawing) drawings.push(drawing);
    }

    totalForPersona = drawings.length;

    if (totalForPersona > 0) {
      setMessage(personaSide, "Waiting");

      // Bin the drawn points in a background worker.
      worker.postMessage({
        command: "getBins",
        params: {
          drawings,
          side: personaSide.includes("Front") ? "Front" : "Back",
        },
      });
    } else {
      computationCount--;
      if (personaSide.includes("Front")) {
        personaCanvasFront.clearMessage();
      } else {
        personaCanvasBack.clearMessage();
      }
    }
  }

  // The idea is to combine the averages of both the valence and the intensity.
  //
  // We compute the averages for each bin using the following formulas:
  //
  // Avg(valence) = sum(V) / N
  // Avg(intensity) = sum(I) / T
  //
  // Where:
  //   - V = valence of a participant who drew in this bin
  //   - N = total participants who drew in this bin
  //   - I = valence of a participant who drew in this bin
  //   - T = total participants
  function drawValenceMap(side: "Front" | "Back", bins: Bin[]): void {
    const valenceColorScale = chroma.scale(["red", "green"]);
    const valenceColorDomain = valenceColorScale.domain([1, 11]);

    let canvas: HTMLCanvasElement;
    let scaleFactor: number;

    setMessage(side, "Drawing valence map");

    // The total participants of this persona.

    if (side === "Front") {
      canvas = personaCanvasFront.getCanvas();
      scaleFactor = personaCanvasFront.getScaleFactor();
    } else {
      canvas = personaCanvasBack.getCanvas();
      scaleFactor = personaCanvasBack.getScaleFactor();
    }

    const context = canvas.getContext("2d");
    if (context == undefined) {
      throw "Could not get context to draw density map.";
    }

    for (let bin of bins) {
      const valences = bin.map((p) => p.valence);
      const intensities = bin.map((p) => p.intensity);
      const avgVal = valences.reduce((acc, curr) => acc + curr, 0) / bin.length;
      const avgIntensity =
        intensities.reduce((acc, curr) => acc + curr, 0) / bin.length;

      const valenceColor = valenceColorDomain(avgVal);
      const intensityColorScale = chroma.scale(["white", valenceColor]);
      const intensityColorDomain = intensityColorScale.domain([1, 11]);
      const intensityColor = intensityColorDomain(avgIntensity);

      const alphaColorScale = chroma.scale([
        intensityColor.alpha(0),
        intensityColor,
      ]);
      const alphaColorDomain = alphaColorScale.domain([0, totalForPersona]);
      const color = alphaColorDomain(bin.length);

      context.fillStyle = color.hex();
      context.fillRect(
        bin.x * scaleFactor,
        bin.y * scaleFactor,
        binWidth,
        binHeight,
      );
    }

    clearMessage(side);
  }

  function onPersonaTabClick({
    detail: newPersona,
  }: {
    detail: PersonaKeys;
  }): void {
    if (computationCount > 0) {
      alert("Please wait until computations have completed.");
      return;
    }

    persona = newPersona;
  }

  function onPersonaCanvasReady(
    event: ComponentEvents<PersonaCanvas>["ready"],
  ): void {
    const { personaSide, width, height } = event.detail;

    setMessage(personaSide, "Starting valence map computation");
    computationCount++;
    makeBins(personaSide);
  }

  function setupWorker() {
    worker.onmessage = (message: any) => {
      if (message.data.event === "bins") {
        const { side, bins: newBins }: { side: "Front" | "Back"; bins: Bin[] } =
          message.data.params;

        if (side === "Front") {
          binsFront = newBins;
          personaCanvasFront.clearMessage();
        } else {
          binsBack = newBins;
          personaCanvasBack.clearMessage();
        }

        computationCount--;

        // Remember that the points coordinates are absolute to the persona
        // images, i.e. they are not scaled to the canvas rendered below. We are
        // going to scale them when we draw them on the canvas in
        // `drawDensityMap`.
        drawValenceMap(side, newBins);
      } else if (message.data.event === "progress") {
        const { side, msg }: { side: "Front" | "Back"; msg: string } =
          message.data.params;
        setMessage(side, msg);
      }
    };
  }

  function setMessage(side: PersonaSideKeys | "Front" | "Back", msg: string) {
    if (side.includes("Front")) {
      personaCanvasFront.setMessage(msg);
    } else {
      personaCanvasBack.setMessage(msg);
    }
  }

  function clearMessage(side: PersonaSideKeys | "Front" | "Back") {
    if (side.includes("Front")) {
      personaCanvasFront.clearMessage();
    } else {
      personaCanvasBack.clearMessage();
    }
  }

  onMount(() => {
    setupWorker();
  });
</script>

{#key persona}
  <Workspace>
    <svelte:fragment slot="panels">
      <WorkspacePanel
        tabs={["Female", "Male"]}
        activeTab={persona}
        caption="Valence Map"
        on:tabClick={onPersonaTabClick}
      >
        <div class="flex w-full h-full">
          <PersonaCanvas
            personaSide={`${persona}Front`}
            on:ready={onPersonaCanvasReady}
            bind:this={personaCanvasFront}
          />
          <PersonaCanvas
            personaSide={`${persona}Back`}
            on:ready={onPersonaCanvasReady}
            bind:this={personaCanvasBack}
          />
        </div>
      </WorkspacePanel>
    </svelte:fragment>

    <svelte:fragment slot="settings">
      <WorkspacePanel tabs={["Details"]} highlightTab={false}>
        <ul class="p-2">
          <li>
            <LabelField
              name="Participants count"
              label={Object.keys(survey.participants).length.toString()}
            />
          </li>
          <li>
            <LabelField
              name={`${persona} participants count`}
              label={totalForPersona.toString()}
            />
          </li>
        </ul>
      </WorkspacePanel>
    </svelte:fragment>
  </Workspace>
{/key}
