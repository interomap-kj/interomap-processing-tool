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

  export let name: string;
  export let value: string = "#0000FF"; // must be hex color code

  const dispatch = createEventDispatcher();

  function onInput(e: Event): void {
    if (e.target) {
      const target = e.target as HTMLInputElement;
      dispatch("change", target.value);
    }
  }
</script>

<div class="flex items-center">
  <label class="pr-2 text-xs text-neutral-400 text-right">
    {name}:
  </label>

  <input
    type="color"
    {name}
    id={name}
    class="emboss py-1 px-2 bg-neutral-700 border border-neutral-800 text-xs text-neutral-200"
    on:input={onInput}
    bind:value
  />
</div>
