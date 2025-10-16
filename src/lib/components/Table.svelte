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
  import { createEventDispatcher, type ComponentProps } from 'svelte'

  import TableRow from './TableRow.svelte'

  export let name: string
  export let columns: string[]
  export let rows: ComponentProps<TableRow>[]
  export let showColumns: boolean = true

  const dispatch = createEventDispatcher()

  function onRowHover(rowIdx: number): void {
    dispatch('rowHover', rowIdx)
  }

  function onRowLeave(rowIdx: number): void {
    dispatch('rowLeave', rowIdx)
  }
</script>

<style lang="postcss">
  .table-shadow {
    box-shadow:
      inset 0 0 1px 1px theme(colors.neutral.800),
      0 1px 0 0 rgba(255,255,255,0.1);
  }

  .small-caps {
    font-variant: small-caps;
  }
</style>

<label class="w-1/3 pr-2 text-xs text-neutral-400 text-right">
  {name}
</label>

<table class="{$$props.class} table-shadow w-fit my-1 bg-neutral-700 border border-neutral-800">
  {#if showColumns}
    <thead>
      <tr class="sticky top-0 bg-gradient-to-t from-neutral-600 to-neutral-500 border-b border-neutral-800">
        {#each columns as col}
          <th class="px-2 border-l border-neutral-800 text-neutral-300 text-[0.6875rem] font-medium lowercase small-caps">{col}</th>
        {/each}
      </tr>
    </thead>
  {/if}

  <tbody>
    {#key rows}
      {#each rows as row, idx}
        <TableRow
          {...row}
          on:mouseenter={() => onRowHover(idx)}
          on:mouseleave={() => onRowLeave(idx)}
        />
      {/each}
    {/key}
  </tbody>
</table>
