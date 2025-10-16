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
  import type { ComponentProps } from 'svelte'

  import TableCell from './TableCell.svelte'

  export let cells: ComponentProps<TableCell>[]
</script>

<tr class="hover:bg-neutral-600 border-b last:border-b-0 border-neutral-800" on:mouseenter on:mouseleave>
  {#each cells as cell}
    <TableCell {...cell} />
  {/each}
</tr>

