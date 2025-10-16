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
  import { getContext } from 'svelte'

  export let isActive: boolean = false

  const { enableIcon } = getContext<MenuContext>('menu')
</script>

<li
  class="w-full"
  on:click
>
  <button
    class="flex items-center w-full py-1 pr-2 {enableIcon ? 'pl-1' : 'pl-2'} text-xs text-neutral-100 text-left"
    class:hover:bg-blue-500={!isActive}
  >
    {#if enableIcon}
      <span class="w-[16px] mr-1">
        <slot name="icon" {isActive} />
      </span>
    {/if}
    <slot />
  </button>
</li>
