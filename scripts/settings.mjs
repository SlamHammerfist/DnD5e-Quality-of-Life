/**
 * Settings for DnD5e QoL.
 *
 * World settings (GM only) are shared by everyone in the world. Personal settings use the
 * "user" scope so they follow each person to any computer they log in from.
 */

import { MODULE } from "./constants.mjs";
import { applyColorBlind } from "./colorblind.mjs";

/** Re-render every open actor sheet and container sheet so a changed setting shows straight away. */
export function refreshSheets() {
  for ( const app of foundry.applications.instances.values() ) {
    const doc = app.document;
    if ( !doc || !app.rendered ) continue;
    if ( (doc.documentName === "Actor") || (doc.type === "container") ) app.render();
  }
}

/** Re-render every open compendium browser. */
function refreshBrowsers() {
  for ( const app of foundry.applications.instances.values() ) {
    if ( app.constructor.name === "CompendiumBrowser" && app.rendered ) app.render();
  }
}

/**
 * Is a feature switched on? Always false while the master switch is off.
 * @param {string} key  Setting key.
 * @returns {boolean}
 */
export function isOn(key) {
  if ( !game.settings.get(MODULE, "enabled") ) return false;
  return !!game.settings.get(MODULE, key);
}

/**
 * The settings, in the order they are shown. scope "world" = GM only and shared,
 * scope "user" = a personal choice for each player.
 */
const SETTINGS = {
  enabled: {
    name: "Enable Module",
    hint: "Master switch for every feature in this module. When off, all of the settings below are ignored for everyone in the world.",
    scope: "world",
    default: true,
    onChange: () => foundry.utils.debouncedReload()
  },
  hidePrices: {
    name: "Hide Prices (Players)",
    hint: "Completely hides item prices on all actor sheets (Character, NPC, Container) for players.",
    scope: "world",
    default: true,
    onChange: () => { applyBodyClasses(); refreshSheets(); }
  },
  hideChatMenu: {
    name: "Hide Chat Enrichment Menu (Players)",
    hint: "Removes the ProseMirror formatting and enrichment menu from the chat sidebar for players.",
    scope: "world",
    default: true,
    onChange: () => applyBodyClasses()
  },
  labelRollBonuses: {
    name: "Label Roll Bonuses",
    hint: "Labels each bonus in a roll with its source (ability, proficiency, the item, or the name of the active effect granting it), so an attack reads \"1d20 + 4 [Str] + 2 [Prof]\" and its damage \"1d12 + 4 [Str]\". Applies to every roll type, including damage and healing. The labels show in the roll dialog and also appear in the expanded roll breakdown. Applies to whoever makes the roll.",
    scope: "world",
    default: true
  },
  npcCoinDrops: {
    name: "NPC Coin Drops",
    hint: "Gives unlinked NPC tokens a random amount of coins based on their Challenge Rating when they are dropped on the canvas, using the DMG individual treasure tables.",
    scope: "world",
    default: true
  },
  autoKillNpcs: {
    name: "Auto Kill NPCs",
    hint: "When an NPC drops to 0 hit points it is marked dead (shown over its token) and marked defeated in combat. Healing it above 0 hit points removes both.",
    scope: "world",
    default: true
  },
  removeElectrum: {
    name: "Remove Electrum",
    hint: "Hides electrum currency from character sheets.",
    scope: "world",
    default: true,
    onChange: () => applyBodyClasses()
  },
  tableSort: {
    name: "Roll Table Alphabetical Sort",
    hint: "Adds a button to roll table sheets that sorts every result alphabetically and rebuilds the roll ranges from each result's weight. A leading \"The\" is ignored when sorting.",
    scope: "world",
    default: true
  },
  familiarBrowser: {
    name: "Find Familiar Browser",
    hint: "When Find Familiar or the Druid's Wild Companion is used, the compendium browser opens with the 2024 Monster Manual source ticked, so each familiar is listed once and the summon-only stat blocks (Beast of the Land, Bestial Spirit, ...) are left out. Other books can still be ticked.",
    scope: "world",
    default: true
  },
  spellLevelSort: {
    name: "Sort Spells by Level",
    hint: "Spell results in the compendium browser are grouped by level (cantrips first, then 1st, 2nd, and so on) and listed alphabetically within each level, with a header above each level.",
    scope: "world",
    default: true,
    onChange: () => refreshBrowsers()
  },
  monsterCrSort: {
    name: "Sort Monsters by CR",
    hint: "Monster results in the compendium browser are grouped by Challenge Rating (lowest first, monsters with no CR last) and listed alphabetically within each CR, with a header above each CR.",
    scope: "world",
    default: true,
    onChange: () => refreshBrowsers()
  },
  retargetRolls: {
    name: "Change Target After Roll",
    hint: "Click the bullseye icon on an attack chat card's targets row to swap the card's targets for the tokens you have targeted now, without rolling again; with nothing targeted it clears them. Hit or miss is re-checked against the new targets, and damage from that attack (already rolled or rolled later) applies to them too. Works for the person who rolled and the GM.",
    scope: "world",
    default: true
  },
  advantageHighlight: {
    name: "Advantage Highlight",
    hint: "In the d20 roll dialog, the Advantage, Normal or Disadvantage button that applies stays highlighted (green, gold or red; blue and orange in Color Blind Mode) even when you click into another field, and a line above the buttons names the reason, e.g. \"Disadvantage: Poisoned, Chain Mail\".",
    scope: "user",
    default: true
  },
  colorBlind: {
    name: "Color Blind Mode",
    hint: "Swaps red and green for colour-blind-safe blue and orange: hits, misses, crits and fumbles, successes and failures, health bars on sheets and tokens, and damage and healing colours. Blue means good, orange means bad.",
    scope: "user",
    default: false,
    onChange: () => applyColorBlind()
  },
  containerRolls: {
    name: "Container Item Rolls",
    hint: "Enables rolling consumable items directly from container sheets.",
    scope: "user",
    default: true,
    onChange: () => refreshSheets()
  },
  disableItemTooltips: {
    name: "Disable Item Tooltips",
    hint: "Removes the DnD5e hover tooltips from items on character sheets.",
    scope: "user",
    default: false,
    onChange: () => refreshSheets()
  },
  journalTab: {
    name: "Enable Journal Tab",
    hint: "Adds a personal notes tab to actor sheets.",
    scope: "user",
    default: true,
    onChange: () => refreshSheets()
  },
  headerCollapse: {
    name: "Header Collapse",
    hint: "Adds collapse/expand toggles to item section headers.",
    scope: "user",
    default: true,
    onChange: () => refreshSheets()
  },
  itemNameExpands: {
    name: "Item Name Expands",
    hint: "Clicking an item name expands or collapses its details directly on the sheet.",
    scope: "user",
    default: false
  },
  scrollTooltips: {
    name: "Scroll Tooltips Without Locking",
    hint: "While a long tooltip is showing (such as an item or spell description), the mouse wheel scrolls the tooltip instead of the sheet underneath, so you don't have to lock it with a middle-click first.",
    scope: "user",
    default: true
  }
};

/** Register settings. Called during init. */
export function registerSettings() {
  for ( const [key, data] of Object.entries(SETTINGS) ) {
    game.settings.register(MODULE, key, { ...data, config: true, type: Boolean });
  }

  // Item sections you have collapsed, so they stay collapsed. Personal.
  game.settings.register(MODULE, "collapsedSections", {
    scope: "user",
    config: false,
    type: Object,
    default: {}
  });

}

/* -------------------------------------------- */
/*  Page-wide switches                          */
/* -------------------------------------------- */

/** Add or remove the page-wide CSS classes that drive the CSS-only features. */
export function applyBodyClasses() {
  const player = !game.user.isGM;
  const body = document.body.classList;
  body.toggle("dst-hide-prices", player && isOn("hidePrices"));
  body.toggle("dst-hide-chat-menu", player && isOn("hideChatMenu"));
  body.toggle("dst-no-electrum", isOn("removeElectrum"));
}
