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
  /* BEGIN: VIEW MODEL */
  export let sidebarWidth: string = "18rem";
  /* END: VIEW MODEL */

  let main: HTMLElement;
  let aside: HTMLElement;
</script>

<section class="w-full h-full flex items-stretch">
  <main
    class="flex-grow grid grid-cols-1 gap-[2px] bg-neutral-600"
    bind:this={main}
  >
    <slot name="panels" />
  </main>

  {#if $$slots.settings}
    <aside
      class="flex flex-col h-full bg-neutral-600 border-l border-neutral-900"
      style="width: {sidebarWidth};"
      bind:this={aside}
    >
      <slot name="settings" />
    </aside>
  {/if}
</section>
