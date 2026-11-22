// Sunny Side Up: a README mini-game for github.com/waseemkhalo.
// A visitor opens an issue titled "sunnyside: left|middle|right"; the workflow runs this script,
// which resolves the launch, redraws game/board.svg, bumps the README cache-buster and writes
// game/result.md for the issue comment.
//
//   node game/play.mjs            resolve a launch (env TITLE, PLAYER)
//   node game/play.mjs render     just redraw the board from game/state.json
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(DIR, "..");
const STATE = join(DIR, "state.json");
const LANES = ["LEFT", "MIDDLE", "RIGHT"];
const LX = [330, 500, 670];
const C = { night: "#1d1230", night2: "#312044", lav: "#B9A0FF", cream: "#fbf6ff", yolk: "#FFD23F", coral: "#FF9383", out: "#140b22" };

// Sunny Side frames from the EggVerse sprite atlas (arcade/assets/source-games/game_2/egg.json):
// [x, y, w, h, offsetX, offsetY] inside a 64x64 source box.
const F = {
  idle0: [73, 58, 19, 25, 23, 24], idle1: [94, 85, 19, 24, 23, 25],
  brk4: [29, 1, 28, 26, 16, 23],
};
const SHEET = "data:image/png;base64," + readFileSync(join(DIR, "sunny-side.png")).toString("base64");

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function frame(n, x, y, s) {
  const [fx, fy, fw, fh, ox, oy] = F[n];
  return `<svg x="${x}" y="${y}" width="${64 * s}" height="${64 * s}" viewBox="0 0 64 64"><svg x="${ox}" y="${oy}" width="${fw}" height="${fh}" viewBox="${fx} ${fy} ${fw} ${fh}"><use href="#sheet"/></svg></svg>`;
}

function render(S) {
  const W = 840, H = 336, SC = 3;
  const last = S.last[0];
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" role="img" aria-label="Sunny Side Up: streak ${S.streak}, pan in the ${LANES[S.pan].toLowerCase()} lane">
<defs><image id="sheet" href="${SHEET}" width="115" height="125" image-rendering="optimizeSpeed" style="image-rendering:pixelated"/></defs>
<style>
text{font-family:'Courier New',Courier,monospace;font-weight:700}
.i0{animation:i0 1.2s step-end infinite}.i1{opacity:0;animation:i1 1.2s step-end infinite}
@keyframes i0{0%{opacity:1}50%{opacity:0}}@keyframes i1{0%{opacity:0}50%{opacity:1}}
.blink{animation:blink 1.1s step-end infinite}@keyframes blink{50%{opacity:.25}}
@media (prefers-reduced-motion:reduce){.i0,.i1,.blink{animation:none}}
</style>
<rect width="${W}" height="${H}" rx="14" fill="${C.night}"/><rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="10" fill="none" stroke="${C.night2}" stroke-width="4"/>`;
  for (const [x, y] of [[60, 40], [150, 95], [700, 30], [520, 70], [330, 40], [770, 150], [230, 120], [610, 120], [420, 130]])
    s += `<rect x="${x}" y="${y}" width="3" height="3" fill="${C.lav}" opacity=".5"/>`;
  s += `<text x="40" y="52" font-size="22" fill="${C.yolk}">SUNNY SIDE UP</text>`;
  s += `<text x="${W - 40}" y="52" font-size="16" fill="${C.lav}" text-anchor="end">STREAK ${S.streak} · BEST ${S.best}</text>`;
  const wl = S.wind < 0 ? "◀ WIND LEFT" : S.wind > 0 ? "WIND RIGHT ▶" : "NO WIND";
  s += `<text x="${W / 2}" y="92" font-size="16" fill="${C.cream}" text-anchor="middle">${wl}</text>`;
  if (S.wind) for (let i = 0; i < 3; i++) {
    const x = W / 2 - 30 + i * 24;
    s += `<polygon points="${S.wind > 0 ? `${x},104 ${x + 12},110 ${x},116` : `${x + 12},104 ${x},110 ${x + 12},116`}" fill="${C.lav}" opacity="${0.4 + i * 0.2}"/>`;
  }
  if (S.last.length) s += `<text x="${W - 40}" y="84" font-size="13" fill="${C.cream}" text-anchor="end">LAST LAUNCHES</text>`;
  S.last.slice(0, 3).forEach((r, i) => {
    s += `<text x="${W - 40}" y="${104 + i * 18}" font-size="12" fill="${C.lav}" text-anchor="end">@${esc(r.u)} ${r.l} <tspan fill="${r.ok ? C.yolk : C.coral}">${r.ok ? "SUNNY SIDE UP" : "CRACKED"}</tspan></text>`;
  });
  if (last) s += `<text x="${W / 2}" y="160" font-size="18" fill="${last.ok ? C.yolk : C.coral}" text-anchor="middle">@${esc(last.u)} ${last.ok ? "MADE IT SUNNY SIDE UP!" : "CRACKED IT!"}</text>`;
  LX.forEach((x, i) => {
    s += `<rect x="${x - 70}" y="256" width="140" height="6" fill="${C.night2}"/><text x="${x}" y="290" font-size="14" fill="${C.lav}" text-anchor="middle">${LANES[i]}</text>`;
  });
  // launcher with Sunny Side idling on it
  s += `<rect x="58" y="246" width="70" height="10" fill="#4a3566" stroke="${C.out}" stroke-width="3"/><polyline points="72,246 102,240 72,234 102,228 72,222" fill="none" stroke="#c9c9d6" stroke-width="4"/><rect x="54" y="214" width="78" height="9" fill="#a8743f" stroke="${C.out}" stroke-width="3"/>`;
  s += `<g class="i0">${frame("idle0", 93 - 32 * SC, 214 - 49 * SC, SC)}</g><g class="i1">${frame("idle1", 93 - 32 * SC, 214 - 49 * SC, SC)}</g>`;
  // frying pan
  const px = LX[S.pan];
  s += `<rect x="${px - 50}" y="238" width="100" height="16" rx="5" fill="#2e2e3e" stroke="${C.out}" stroke-width="3"/><rect x="${px - 44}" y="241" width="88" height="3" fill="#4a4a5e"/><rect x="${px + 50}" y="243" width="44" height="8" fill="#7a5230" stroke="${C.out}" stroke-width="2"/>`;
  // last cracked egg stays on the board where it landed
  if (last && !last.ok && last.land >= 0 && last.land <= 2 && last.land !== S.pan) s += frame("brk4", LX[last.land] - 32 * 2, 256 - 49 * 2, 2);
  s += `<text class="blink" x="${W / 2}" y="${H - 14}" font-size="13" fill="${C.cream}" text-anchor="middle">▼ PICK A LANE BELOW · PLAY 30 PARTY GAMES AT EGGVERSE.CO</text>`;
  return s + "</svg>\n";
}

function write(S) {
  writeFileSync(STATE, JSON.stringify(S, null, 2) + "\n");
  writeFileSync(join(DIR, "board.svg"), render(S));
  const readme = join(ROOT, "README.md");
  const md = readFileSync(readme, "utf8").replace(/game\/board\.svg\?v=\d+/, `game/board.svg?v=${S.round}`);
  writeFileSync(readme, md);
}

const S = JSON.parse(readFileSync(STATE, "utf8"));
if (process.argv[2] === "render") {
  write(S);
} else {
  const title = process.env.TITLE || "";
  const player = (process.env.PLAYER || "someone").replace(/[^A-Za-z0-9-]/g, "");
  const m = /^\s*sunnyside:\s*(left|middle|right)\s*$/i.exec(title);
  if (!m) {
    writeFileSync(join(DIR, "result.md"), `Couldn't read a lane from "${esc(title)}". Use one of the Launch links on the [profile](https://github.com/waseemkhalo) to play.`);
    process.exit(0);
  }
  const aim = LANES.indexOf(m[1].toUpperCase());
  const gust = Math.random() < 0.25 ? (S.wind || (Math.random() < 0.5 ? -1 : 1)) : 0;
  const land = aim + S.wind + gust;
  const ok = land === S.pan;
  const where = land < 0 || land > 2 ? "off the board" : LANES[land].toLowerCase();
  const before = S.streak;
  S.streak = ok ? S.streak + 1 : 0;
  S.best = Math.max(S.best, S.streak);
  S.round += 1;
  S.last = [{ u: player, l: LANES[aim], ok, land }, ...S.last].slice(0, 3);
  const pan = S.pan;
  let p; do { p = Math.floor(Math.random() * 3); } while (p === S.pan && Math.random() < 0.6);
  S.pan = p;
  S.wind = [-1, 0, 0, 1][Math.floor(Math.random() * 4)];
  write(S);
  const lines = [
    ok ? `🍳 **Sunny Side Up!** @${player} landed it in the pan.` : `🥚 **Cracked!** Sunny Side landed ${where}, and the pan was ${LANES[pan].toLowerCase()}.`,
    "",
    `You aimed ${LANES[aim].toLowerCase()}${gust ? `, and a gust pushed it one more lane ${gust < 0 ? "left" : "right"}` : ""}.`,
    ok ? `Community streak: ${before} → **${S.streak}** (best ${S.best}).` : `The community streak of ${before} resets to 0.`,
    "",
    `[See the board](https://github.com/waseemkhalo) · [Play 30 party games at eggverse.co](https://eggverse.co)`,
  ];
  writeFileSync(join(DIR, "result.md"), lines.join("\n") + "\n");
  console.log(lines[0]);
}
