/**
 * NPC Coin Drops: when an unlinked NPC token is dropped on the canvas, give it coins rolled from
 * the DMG's individual treasure tables for its Challenge Rating. Handled by the active GM only,
 * so it happens once no matter who dropped the token.
 */

import { isOn } from "./settings.mjs";

/**
 * DMG individual treasure. Each band lists d100 rows: up to the roll number, the coins rolled.
 * Coins are [formula, multiplier].
 */
const TREASURE = [
  { maxCR: 4, rows: [
    { upTo: 30, coins: { cp: ["5d6", 1] } },
    { upTo: 60, coins: { sp: ["4d6", 1] } },
    { upTo: 70, coins: { ep: ["3d6", 1] } },
    { upTo: 95, coins: { gp: ["3d6", 1] } },
    { upTo: 100, coins: { pp: ["1d6", 1] } }
  ] },
  { maxCR: 10, rows: [
    { upTo: 30, coins: { cp: ["4d6", 100], ep: ["1d6", 10] } },
    { upTo: 60, coins: { sp: ["6d6", 10], gp: ["2d6", 10] } },
    { upTo: 70, coins: { ep: ["3d6", 10], gp: ["2d6", 10] } },
    { upTo: 95, coins: { gp: ["4d6", 10] } },
    { upTo: 100, coins: { gp: ["2d6", 10], pp: ["3d6", 1] } }
  ] },
  { maxCR: 16, rows: [
    { upTo: 20, coins: { sp: ["4d6", 100], gp: ["1d6", 100] } },
    { upTo: 35, coins: { ep: ["1d6", 100], gp: ["1d6", 100] } },
    { upTo: 75, coins: { gp: ["2d6", 100], pp: ["1d6", 10] } },
    { upTo: 100, coins: { gp: ["2d6", 100], pp: ["2d6", 10] } }
  ] },
  { maxCR: Infinity, rows: [
    { upTo: 15, coins: { ep: ["2d6", 1000], gp: ["8d6", 100] } },
    { upTo: 55, coins: { gp: ["1d6", 1000], pp: ["1d6", 100] } },
    { upTo: 100, coins: { gp: ["1d6", 1000], pp: ["2d6", 100] } }
  ] }
];

/** Register the hook. Called during init. */
export function registerCoinDrops() {
  Hooks.on("createToken", (token, options) => {
    if ( !game.user.isActiveGM || !isOn("npcCoinDrops") ) return;
    if ( token.actorLink || (token.actor?.type !== "npc") ) return;
    // Don't add coins again when tokens are copied, pasted, or restored by undo.
    if ( options.isUndo || options.dstNoCoins ) return;
    giveCoins(token).catch(err => console.warn("DnD5e QoL | Could not give NPC coins.", err));
  });
}

/**
 * Roll coins for a token and add them to whatever it already carries.
 * @param {TokenDocument} token
 */
async function giveCoins(token) {
  const actor = token.actor;
  const cr = Number(actor.system.details?.cr ?? 0);
  const band = TREASURE.find(b => cr <= b.maxCR);
  const d100 = (await new Roll("1d100").evaluate()).total;
  const row = band.rows.find(r => d100 <= r.upTo);

  const gained = {};
  for ( const [denom, [formula, mult]] of Object.entries(row.coins) ) {
    const roll = await new Roll(formula).evaluate();
    gained[denom] = (gained[denom] ?? 0) + (roll.total * mult);
  }

  // No electrum in this world: pay it out as silver instead (1 ep = 5 sp).
  if ( isOn("removeElectrum") && gained.ep ) {
    gained.sp = (gained.sp ?? 0) + (gained.ep * 5);
    delete gained.ep;
  }

  const current = actor.system.currency ?? {};
  const update = {};
  for ( const [denom, amount] of Object.entries(gained) ) {
    update[`system.currency.${denom}`] = (Number(current[denom]) || 0) + amount;
  }
  await actor.update(update);
}
