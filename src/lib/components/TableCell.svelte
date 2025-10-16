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
  export let value: any
  export let formatter: ((val: any) => string) | undefined = undefined

  let valueHtml: string

  if (formatter) {
    valueHtml = formatter(value)
  } else if (typeof value === 'string') {
    valueHtml = value
  } else if (value.toString) {
    valueHtml = value.toString()
  } else {
    throw('Error: Cannot format value.')
  }
</script>

<td class="py-1 px-2 border-l border-neutral-800 text-neutral-100 text-xs">
  {@html valueHtml}
</td>

