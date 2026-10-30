// Generuje awatary DiceBear do public/avatars/<styl>/<n>.svg (uruchamia automat „Awatary – generuj”).
import fs from "fs";
import { createAvatar } from "@dicebear/core";
import { adventurer } from "@dicebear/collection";
const BG = ["b6ff3b", "c084fc", "7dd3fc", "ff8fc7", "ffe066", "5eead4", "fdba74", "a5b4fc"];
const STYLES = { adventurer };
const N = 32;
for (const [name, style] of Object.entries(STYLES)) {
  fs.mkdirSync(`public/avatars/${name}`, { recursive: true });
  for (let i = 0; i < N; i++) {
    const svg = createAvatar(style, { seed: `squad-${name}-${i}`, backgroundColor: [BG[i % BG.length]], backgroundType: ["solid"], size: 256 }).toString();
    fs.writeFileSync(`public/avatars/${name}/${i}.svg`, svg);
  }
  console.log(name, N);
}
