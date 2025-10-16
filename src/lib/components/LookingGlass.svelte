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

<svelte:options accessors={true} />

<script lang="ts">
  import { onMount, type ComponentProps, type ComponentEvents } from "svelte";

  import type { DrawingArea, Participant } from "$lib/models/Participant";
  import type { Survey } from "$lib/models/Survey";

  import Workspace from "./Workspace.svelte";
  import WorkspacePanel from "./WorkspacePanel.svelte";
  import SelectField from "./SelectField.svelte";
  import Table from "./Table.svelte";
  import LabelField from "./LabelField.svelte";
  import PersonaCanvas from "./PersonaCanvas.svelte";

  /* BEGIN: VIEW MODEL */
  export let survey: Survey;

  let participant: Participant;
  let personaSides: PersonaSideKeys[];
  let strokes: Stroke[];
  let avgValence: number;
  let avgIntensity: number;
  let areasTable: ComponentProps<Table> = {
    name: "Areas",
    columns: [],
    rows: [],
  };
  /* END: VIEW MODEL */

  let personaCanvasFront: PersonaCanvas;
  let personaCanvasBack: PersonaCanvas;

  let exportWorker: Worker | undefined = undefined;

  export function getImages(): ImageExport[] {
    const fileName = `Participant${participant.id + 1}-${participant.persona}`;
    return [
      {
        name: `LookingGlass-${fileName}Front.png`,
        dataUrl: personaCanvasFront.getImage(),
      },
      {
        name: `LookingGlass-${fileName}Back.png`,
        dataUrl: personaCanvasBack.getImage(),
      },
    ];
  }

  function onPersonaCanvasReady(
    event: ComponentEvents<PersonaCanvas>["ready"],
  ): void {
    const { personaSide } = event.detail;
    const strokes = getStrokes(participant, personaSide);

    let personaCanvas: PersonaCanvas;

    if (personaSide.includes("Front")) {
      personaCanvas = personaCanvasFront;
    } else {
      personaCanvas = personaCanvasBack;
    }

    personaCanvas.drawStrokes(strokes);
  }

  function getAreasTable(participant: Participant): ComponentProps<Table> {
    const table: ComponentProps<Table> = {
      name: "Areas table",
      columns: ["Valence", "Intensity", "Size"],
      rows: [],
    };

    for (const key in participant.areas) {
      const [valence, intensity] = key.split(":");
      table.rows.push({
        cells: [
          { value: valence },
          { value: intensity },
          { value: participant.areas[key] },
        ],
      });
    }

    return table;
  }

  function getAverages(
    participant: Participant,
    forKey: "valence" | "intensity",
  ): number {
    // Areas sorted by valence or intensity.
    const areaByValue: Record<string, number> = {};

    for (const key in participant.areas) {
      const [valence, intensity] = key.split(":");
      const area = participant.areas[key];
      if (forKey === "valence") {
        areaByValue[valence] ??= 0;
        areaByValue[valence] += area;
      } else {
        areaByValue[intensity] ??= 0;
        areaByValue[intensity] += area;
      }
    }

    let numerator: number = 0;

    for (let valStr in areaByValue) {
      const val = parseInt(valStr);
      numerator += val * areaByValue[valStr];
    }

    const avg = numerator / participant.totalDrawingArea;

    const roundedAvg = Math.round(avg * 100) / 100;

    return roundedAvg;
  }

  function setParticipant(id: string): void {
    const p = survey.participants[id];
    const ps = Object.keys(p.drawing) as PersonaSideKeys[];

    if (p.computed === false) {
      //p.computeStrokeAreas();

      // Create Canvas and hand it over to worker, thus "converting" it to an
      // OffscreenCanvas.
      const canvas = document.createElement("canvas");
      const offscreenCanvas = canvas.transferControlToOffscreen();

      // Serialize data before passing it to worker.
      const data = [{ id: p.id, drawing: p.drawing }];

      exportWorker?.postMessage(
        {
          command: "get-areas",
          params: { data, canvas: offscreenCanvas },
        },
        [offscreenCanvas],
      );
    }

    participant = p;
    personaSides = ps;
    strokes = [];
    avgValence = 0;
    avgIntensity = 0;
    areasTable = getAreasTable(participant);
  }

  function getStrokes(
    participant: Participant,
    side: PersonaSideKeys,
  ): Stroke[] {
    const personaDrawing = participant.drawing[side];
    if (personaDrawing === undefined) {
      throw `Could not get ${side} drawing of participant ${participant.id}.`;
    }

    return personaDrawing.strokes;
  }

  function onParticipantChange({ detail: value }: { detail: string }): void {
    setParticipant(value);
  }

  async function loadWorkers() {
    // The query suffix `?worker` is required for Vite.js.
    const ExportWorker = await import("$lib/workers/export.worker?worker");

    exportWorker = new ExportWorker.default();
    exportWorker.onmessage = (message: any) => {
      if (message.data.event === "areas-done") {
        const areas: Array<{
          id: string;
          areas: DrawingArea;
          totalDrawingArea: number;
        }> = message.data.params;

        participant.areas = areas[0].areas;
        participant.totalDrawingArea = areas[0].totalDrawingArea;

        let st: Stroke[] = [];

        personaSides.forEach((personaSide) => {
          st = st.concat(getStrokes(participant, personaSide));
        });

        const avgVal = getAverages(participant, "valence");
        const avgInt = getAverages(participant, "intensity");

        strokes = st;
        avgValence = avgVal;
        avgIntensity = avgInt;
        areasTable = getAreasTable(participant);
      }
    };
  }

  onMount(async () => {
    await loadWorkers();
    setParticipant(Object.keys(survey.participants)[0]);
  });
</script>

{#if participant}
  {#key participant}
    <Workspace>
      <svelte:fragment slot="panels">
        <WorkspacePanel caption="Looking Glass">
          <div class="flex w-full h-full">
            {#each personaSides as personaSide}
              {#if personaSide.includes("Front")}
                <PersonaCanvas
                  {personaSide}
                  on:ready={onPersonaCanvasReady}
                  bind:this={personaCanvasFront}
                />
              {:else}
                <PersonaCanvas
                  {personaSide}
                  on:ready={onPersonaCanvasReady}
                  bind:this={personaCanvasBack}
                />
              {/if}
            {/each}
          </div>
        </WorkspacePanel>
      </svelte:fragment>

      <svelte:fragment slot="settings">
        <WorkspacePanel tabs={["Details"]} highlightTab={false}>
          <ul class="p-2">
            <li>
              <SelectField
                name="Participant"
                options={Object.keys(survey.participants)}
                selected={participant.id}
                on:change={onParticipantChange}
              />
            </li>
            <li>
              <LabelField
                name="Drawing area"
                label={`${participant.totalDrawingArea} pixels`}
              />
            </li>
            <li>
              <LabelField name="Avg valence" label={avgValence.toString()} />
            </li>
            <li>
              <LabelField
                name="Avg intensity"
                label={avgIntensity.toString()}
              />
            </li>
            <li>
              <Table class="block h-64 overflow-auto" {...areasTable} />
            </li>
          </ul>
        </WorkspacePanel>
      </svelte:fragment>
    </Workspace>
  {/key}
{/if}
