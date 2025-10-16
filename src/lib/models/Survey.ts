/*
 * Copyright (C) 2024 Joey Khalil - All Rights Reserved
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

import type { Participant } from "./Participant";

type ParticipantsByPersona = {
  [persona in PersonaKeys]: Participant[];
};

class Survey {
  participants: Record<string, Participant> = {};
  personas: ParticipantsByPersona = {
    Female: [],
    Male: [],
  };
  drawingsPerSide: Partial<Record<PersonaSideKeys, Drawing[]>> = {};

  addParticipant(p: Participant): void {
    this.participants[p.id] = p;
    this.personas[p.persona].push(p);
    this.classifyDrawing(p.drawing);
  }

  classifyDrawing(drawing: Drawing): void {
    for (const key of Object.keys(drawing)) {
      const side = key as PersonaSideKeys;
      const d = this.drawingsPerSide[side] ?? [];
      d.push(drawing);
      this.drawingsPerSide[side] = d;
    }
  }
}

export { Survey };
