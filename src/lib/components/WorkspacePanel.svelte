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
  import { createEventDispatcher } from "svelte";

  /* BEGIN: VIEW MODEL */
  export let tabs: string[] | undefined = undefined;
  export let activeTab: string | undefined = undefined;
  export let caption: string | undefined = undefined;
  export let highlightTab: boolean = true;
  /* END: VIEW MODEL */

  const dispatch = createEventDispatcher();

  function onTabClick(tab: string): void {
    dispatch("tabClick", tab);
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="panel-container">
  <div class="panel-tabs w-full h-5">
    {#if tabs !== undefined}
      {#key activeTab}
        {#each tabs as tab}
          <button
            class="panel-tab"
            class:active={activeTab === tab}
            class:highlight={highlightTab}
            on:click={() => onTabClick(tab)}
          >
            {tab}
          </button>
        {/each}
      {/key}
    {/if}
  </div>

  <div class="panel relative flex-grow w-full h-full">
    {#if caption}
      <span
        class="z-10 absolute top-4 right-4 py-1 px-2 bg-neutral-900 shadow bg-opacity-50 text-neutral-100 text-xs"
      >
        {caption}
      </span>
    {/if}

    <slot />
  </div>
</div>

<style lang="postcss">
  .panel-container {
    display: flex;
    flex-direction: column;
  }

  .panel-tabs {
    display: flex;
    background-color: theme(colors.neutral.700);
  }

  .panel-tab {
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 theme(padding.2);
    border-right: 1px solid theme(colors.neutral.800);
    box-shadow: 1px 0 0 0 rgba(255, 255, 255, 0.1);
    color: theme(colors.neutral.400);
    font-size: theme(fontSize.xs);
    font-weight: theme(fontWeight.medium);
    line-height: 0;
  }

  .panel-tab.active.highlight {
    background: linear-gradient(theme(colors.blue.500), theme(colors.blue.600));
    color: theme(colors.neutral.100);
  }

  .panel-tab.active {
    background: theme(colors.neutral.600);
    color: theme(colors.neutral.100);
  }
</style>
