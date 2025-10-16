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
  export let options: string[];
  export let selected: string | undefined = undefined;

  const dispatch = createEventDispatcher();

  function onSelectChange(e: Event): void {
    if (e.target) {
      const select = e.target as HTMLSelectElement;
      dispatch("change", select.value);
    }
  }
</script>

<label class="w-1/3 pr-2 text-xs text-neutral-400 text-right">
  {name}:
</label>

<select
  {name}
  id={name}
  class="emboss py-1 px-2 bg-neutral-700 border border-neutral-800 text-xs text-neutral-200"
  on:change={onSelectChange}
>
  {#each options as option}
    <option value={option} selected={selected === option}>{option}</option>
  {/each}
</select>
