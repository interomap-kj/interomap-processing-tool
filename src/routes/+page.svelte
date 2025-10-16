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
  import { onMount } from "svelte";
  import Papa from "papaparse";

  import { PostprocessTool } from "$lib/constants";
  import { Participant, type DrawingArea } from "$lib/models/Participant";
  import { Survey } from "$lib/models/Survey";

  import Menu from "$lib/components/Menu.svelte";
  import MenuItem from "$lib/components/MenuItem.svelte";
  import MenuSeparator from "$lib/components/MenuSeparator.svelte";
  import LookingGlass from "$lib/components/LookingGlass.svelte";
  import DensityMap from "$lib/components/DensityMap.svelte";
  import ValenceMap from "$lib/components/ValenceMap.svelte";
  import EmptyWorkspace from "$lib/components/EmptyWorkspace.svelte";

  let main: HTMLElement;
  let fileInput: HTMLInputElement;
  let isProjectOpen: boolean = false;
  let isLoading: boolean = false;
  let toolsMenu: Menu;
  let projectMenu: Menu;
  let selectedTool: PostprocessTool = PostprocessTool.LookingGlass;
  let survey = new Survey();
  let activeTool: LookingGlass | DensityMap | ValenceMap | undefined =
    undefined;
  let progressMessage: string = "Loading";
  let exportWorker: Worker | undefined = undefined;
  let qualtricsVar: string | null;

  function onLoadSurveyDataClick(): void {
    fileInput.click();
  }

  function onCloseProjectClick(): void {
    if (activeTool) {
      activeTool.$destroy();
      activeTool = undefined;
    }

    isProjectOpen = false;
    isLoading = false;
    qualtricsVar = null;
  }

  function onFileInputChange(): void {
    if (fileInput.files && fileInput.files.length > 0) {
      onCloseProjectClick(); // if a project is already loaded

      qualtricsVar = prompt("Specify the Qualtrics variable you wish to load:");
      if (qualtricsVar == null || qualtricsVar === "") {
        alert("Error: You did not specify the Qualtrics variable.");
        onCloseProjectClick();
        throw "No Qualtrics variable specified. Aborting.";
      }

      isLoading = true;

      parseFile(fileInput.files[0]);
    }
  }

  function parseFile(file: File): void {
    progressMessage = "Reading file...";
    Papa.parse(file, {
      worker: true,
      header: true,
      step: onRowParsed,
      complete: onFileParsingComplete,
    });
  }

  function onRowParsed(row: any): void {
    const data = row.data;
    if (qualtricsVar && qualtricsVar in data && "ResponseId" in data) {
      try {
        const drawing = deserializeDrawing(data[qualtricsVar]);
        const isValidOutput = Object.keys(drawing).every((key: string) =>
          ["FemaleFront", "FemaleBack", "MaleFront", "MaleBack"].includes(key),
        );

        if (isValidOutput) {
          const id = data["ResponseId"];
          const participant = new Participant({ id, drawing });
          // participant.computeStrokeAreas();
          survey.addParticipant(participant);
        }
      } catch (error) {
        return;
      }
    }
  }

  function onFileParsingComplete(): void {
    if (Object.keys(survey.participants).length === 0) {
      const msg = `Sorry, we could not parse any InteroMap data from your file.
      Maybe the Qualtrics variable is incorrect?`;

      alert(msg);
      onCloseProjectClick();
      throw msg;
    }

    activeTool = mountTool(PostprocessTool.LookingGlass);
  }

  function deserializeDrawing(outputStr: string): Drawing {
    return JSON.parse(outputStr);
  }

  function onToolMenuClick(tool: PostprocessTool): void {
    if (tool !== selectedTool) {
      activeTool = mountTool(tool);
    }

    toolsMenu.close();
  }

  function mountLookingGlass(survey: Survey): LookingGlass {
    const instance = new LookingGlass({
      target: main,
      props: { survey },
    });

    return instance;
  }

  function mountDensityMap(survey: Survey): LookingGlass {
    const instance = new DensityMap({
      target: main,
      props: { survey },
    });

    return instance;
  }

  function mountValenceMap(survey: Survey): ValenceMap {
    const instance = new ValenceMap({
      target: main,
      props: { survey },
    });

    return instance;
  }

  function mountTool(
    tool: PostprocessTool,
  ): LookingGlass | DensityMap | ValenceMap {
    let instance: LookingGlass | DensityMap | ValenceMap;

    if (activeTool) {
      activeTool.$destroy();
    }

    switch (tool) {
      case PostprocessTool.LookingGlass:
        instance = mountLookingGlass(survey);
        break;
      case PostprocessTool.DensityMap:
        instance = mountDensityMap(survey);
        break;
      case PostprocessTool.ValenceMap:
        instance = mountValenceMap(survey);
        break;
      default:
        throw `Unknown tool: ${tool}.`;
    }

    selectedTool = tool;
    isLoading = false;
    isProjectOpen = true;

    return instance;
  }

  function onExportImages(): void {
    const images = activeTool?.getImages();

    images?.forEach((image) => {
      download(image.name, image.dataUrl);
    });

    projectMenu.close();
  }

  function getAreas() {
    // Create Canvas and hand it over to worker, thus "converting" it to an
    // OffscreenCanvas.
    const canvas = document.createElement("canvas");
    const offscreenCanvas = canvas.transferControlToOffscreen();

    // Serialize data before passing it to worker.
    const data = Object.values(survey.participants).map((participant) => {
      return { id: participant.id, drawing: participant.drawing };
    });

    exportWorker?.postMessage(
      {
        command: "get-areas",
        params: { data, canvas: offscreenCanvas },
      },
      [offscreenCanvas],
    );
  }

  // This function exports the data to a CSV file.
  // Strokes are compacted by valence + intensity combination.
  function getStrokesCsv(
    participantData: Array<{ id: string; areas: DrawingArea }>,
  ): string {
    const header = [
      "Participant ID",
      "Stroke Valence",
      "Stroke Intensity",
      "Area (pixels)",
    ];
    const rows = [header];

    for (const participant of participantData) {
      for (const key in participant.areas) {
        // Reminder: key is `valence:intensity`

        const [valence, intensity] = key.split(":");

        rows.push([
          participant.id,
          valence,
          intensity,
          participant.areas[key].toString(),
        ]);
      }
    }

    const csv = Papa.unparse(rows);

    return "data:text/csv;base64," + btoa(csv);
  }

  function download(fileName: string, dataUrl: string): void {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.target = "_blank";
    link.download = fileName;
    link.click();
  }

  function onExportStrokesClick(): void {
    getAreas();
    projectMenu.close();

    isLoading = true;
    progressMessage = "Exporting stroke areas...";
  }

  async function onExportPixelMaps() {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: `pixel-maps-${qualtricsVar}.zip`,
    });

    isLoading = true;
    progressMessage = "Exporting pixel maps...";

    // Create Canvas and hand it over to worker, thus "converting" it to an
    // OffscreenCanvas.
    const canvas = document.createElement("canvas");
    const offscreenCanvas = canvas.transferControlToOffscreen();

    exportWorker?.postMessage(
      {
        command: "get-pixelmaps-zip",
        params: { survey, fileHandle, canvas: offscreenCanvas },
      },
      [offscreenCanvas],
    );

    projectMenu.close();
  }

  // Ref: https://medium.com/geekculture/sveltekit-web-worker-8cfc0c86abf6
  // Ref: https://github.com/sveltejs/kit/discussions/9123
  async function loadWorkers() {
    // The query suffix `?worker` is required for Vite.js.
    const ExportWorker = await import("$lib/workers/export.worker?worker");

    exportWorker = new ExportWorker.default();
    exportWorker.onmessage = (message: any) => {
      if (
        message.data.event === "pixelmaps-zip-progress" ||
        message.data.event === "areas-progress"
      ) {
        const {
          current,
          total,
          msg,
        }: { current: number; total: number; msg: string } =
          message.data.params;
        progressMessage = `(${Math.round((100 * current) / total)}%) ${msg}`;
      } else if (message.data.event === "pixelmaps-done") {
        isLoading = false;
      } else if (message.data.event === "areas-done") {
        const areas: Array<{ id: string; areas: DrawingArea }> =
          message.data.params;

        const data = getStrokesCsv(areas);
        download("InteroMap-Strokes.csv", data);

        isLoading = false;
      }
    };
  }

  onMount(() => {
    loadWorkers();
  });
</script>

<section class="app-layout w-screen h-screen">
  <header
    class="emboss z-20 flex items-center bg-neutral-600 border-b border-neutral-800"
  >
    {#if isLoading === false}
      <Menu title="Project" bind:this={projectMenu}>
        <MenuItem on:click={onLoadSurveyDataClick}>Load Survey Data</MenuItem>
        {#if isProjectOpen}
          <MenuItem on:click={onExportImages}>Export images</MenuItem>
          <MenuItem on:click={onExportStrokesClick}>Export strokes</MenuItem>
          <MenuItem on:click={onExportPixelMaps}>Export pixel maps</MenuItem>

          <MenuSeparator />

          <MenuItem on:click={onCloseProjectClick}>Close project</MenuItem>
        {/if}
      </Menu>
    {/if}

    {#if isProjectOpen}
      <Menu title="Tools" enableIcon={true} bind:this={toolsMenu}>
        <MenuItem
          isActive={selectedTool === PostprocessTool.LookingGlass}
          on:click={() => onToolMenuClick(PostprocessTool.LookingGlass)}
        >
          <svg
            slot="icon"
            let:isActive
            xmlns="http://www.w3.org/2000/svg"
            class:hidden={!isActive}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M5 12l5 5l10 -10" />
          </svg>
          {PostprocessTool.LookingGlass}
        </MenuItem>
        <MenuItem
          isActive={selectedTool === PostprocessTool.DensityMap}
          on:click={() => onToolMenuClick(PostprocessTool.DensityMap)}
        >
          <svg
            slot="icon"
            let:isActive
            xmlns="http://www.w3.org/2000/svg"
            class:hidden={!isActive}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M5 12l5 5l10 -10" />
          </svg>
          {PostprocessTool.DensityMap}
        </MenuItem>
        <MenuItem
          isActive={selectedTool === PostprocessTool.ValenceMap}
          on:click={() => onToolMenuClick(PostprocessTool.ValenceMap)}
        >
          <svg
            slot="icon"
            let:isActive
            xmlns="http://www.w3.org/2000/svg"
            class:hidden={!isActive}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M5 12l5 5l10 -10" />
          </svg>
          {PostprocessTool.ValenceMap}
        </MenuItem>
      </Menu>
    {/if}

    <span class="flex-grow" />

    <h1
      class="flex items-center h-full px-2 bg-gradient-to-t from-orange-600 to-orange-500 text-neutral-100 font-bold text-xs lowercase tracking-wider"
      style="font-variant: small-caps;"
    >
      InteroMap
    </h1>
  </header>

  <main class="relative row-start-2 row-end-4" bind:this={main}>
    {#if isLoading}
      <div
        class="z-20 absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 flex items-center justify-center py-2 px-4 bg-neutral-800 text-neutral-400"
      >
        <svg
          class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
        {progressMessage}
      </div>
    {/if}

    {#if activeTool === undefined}
      <EmptyWorkspace on:click={onLoadSurveyDataClick} />
    {/if}
  </main>
</section>

<input
  type="file"
  class="hidden"
  accept=".csv"
  bind:this={fileInput}
  on:change={onFileInputChange}
/>

<style lang="postcss">
  :global(.emboss) {
    box-shadow: 0 1px 0 0 rgba(255, 255, 255, 0.1);
  }

  .app-layout {
    display: grid;
    grid-template-rows: 2rem auto;
    grid-template-columns: auto;
  }
</style>
