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
  import { setContext } from 'svelte'
  import { fade } from 'svelte/transition'

  export let title: string
  export let isOpen: boolean = false
  export let enableIcon: boolean = false

  export function close(): void {
    isOpen = false
  }

  let container: HTMLDivElement

  setContext<MenuContext>('menu', { enableIcon })

  function onMenuClick(): void {
    isOpen = !isOpen
  }

  function onWindowClick(e: MouseEvent): void {
    if (e.target instanceof Node && container.contains(e.target) === false) {
      isOpen = false
    }
  }
</script>

<svelte:window on:click={onWindowClick} />

<div
  class="relative flex items-center h-full"
  bind:this={container}
>
  <button
    class="h-full px-3 text-neutral-100 text-xs"
    class:bg-neutral-700={isOpen}
    on:click={onMenuClick}
  >
    {title}
  </button>

  {#if isOpen}
    <ul
      class="absolute top-full left-0 w-48 p-1 bg-neutral-700 shadow"
      out:fade={{ duration: 100 }}
    >
      <slot />
    </ul>
  {/if}
</div>
