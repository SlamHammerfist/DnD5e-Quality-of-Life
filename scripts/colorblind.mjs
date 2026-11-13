/**
 * Color Blind Mode: a personal setting that swaps dnd5e's red/green colours for a red-green
 * colour-blind-safe blue/orange (Okabe-Ito palette). Blue = good (hit, success, healing, full health),
 * orange = bad (miss, failure, damage, low health).
 *
 * Sheets, chat cards and damage colours are handled by CSS (.dst-colorblind in the stylesheet).
 * Token health bars and floating damage/healing numbers are drawn on the canvas, so they are
 * handled here.
 */

import { isOn } from "./settings.mjs";

/** Canvas colours used while colour blind mode is on. */
const SAFE_HP_COLORS = { damage: 0xE66100, healing: 0x3A8FD8 };

/** End points of the token health bar: empty (orange) to full (blue), as RGB 0-1. */
const BAR_EMPTY = [0.90, 0.38, 0.00];
const BAR_FULL = [0.23, 0.56, 0.85];

/** dnd5e's own canvas colours, kept so they can be put back. */
let originalHPColors;

/** Wrap dnd5e's health bar colour. Called during init. */
export function registerColorBlind() {
  const Actor5e = dnd5e.documents.Actor5e;
  const original = Actor5e.getHPColor;
  Actor5e.getHPColor = function(current, max) {
    if ( !isOn("colorBlind") ) return original.call(this, current, max);
    const pct = max > 0 ? Math.clamp(current, 0, max) / max : 0;
    const rgb = BAR_EMPTY.map((empty, i) => empty + ((BAR_FULL[i] - empty) * pct));
    return Color.fromRGB(rgb);
  };
}

/** Switch colour blind mode on or off for this user. Called on ready and when the setting changes. */
export function applyColorBlind() {
  const on = isOn("colorBlind");
  document.body.classList.toggle("dst-colorblind", on);

  const colors = CONFIG.DND5E.tokenHPColors;
  originalHPColors ??= { damage: colors.damage, healing: colors.healing };
  Object.assign(colors, on ? SAFE_HP_COLORS : originalHPColors);

  // Redraw token health bars.
  for ( const token of canvas?.tokens?.placeables ?? [] ) {
    token.renderFlags?.set({ refreshBars: true });
  }
}
