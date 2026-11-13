/**
 * DnD5e QoL
 * Quality of life tweaks for D&D 5e. Every feature has its own setting, and the
 * "Enable Module" master switch turns them all off at once.
 *
 * This file only starts things up. Each feature lives in its own file:
 *   constants.mjs         shared constants (module id, chat button list)
 *   settings.mjs          settings, the master switch, page-wide CSS switches, button label CSS
 *   button-labels.mjs     the Configure Labels dialog
 *   roll-labels.mjs       Label Roll Bonuses
 *   coin-drops.mjs        NPC Coin Drops
 *   table-sort.mjs        Roll Table Alphabetical Sort
 *   familiar-browser.mjs  Find Familiar Browser
 *   spell-sort.mjs        Sort Spells by Level
 *   hide-prices.mjs       Hide Prices (Players)
 *   container-rolls.mjs   Container Item Rolls
 *   journal-tab.mjs       Enable Journal Tab
 *   sheet-tweaks.mjs      Disable Item Tooltips, Header Collapse, Item Name Expands
 *   advantage-reasons.mjs Advantage Highlight
 *   tooltip-scroll.mjs    Scroll Tooltips Without Locking
 * Hide Chat Enrichment Menu and Remove Electrum are CSS only (see the stylesheet).
 */

import { applyBodyClasses, applyButtonLabels, registerSettings } from "./settings.mjs";
import { registerRollLabels } from "./roll-labels.mjs";
import { registerCoinDrops } from "./coin-drops.mjs";
import { registerTableSort } from "./table-sort.mjs";
import { registerFamiliarBrowser } from "./familiar-browser.mjs";
import { registerSpellSort } from "./spell-sort.mjs";
import { registerHidePrices } from "./hide-prices.mjs";
import { registerContainerRolls } from "./container-rolls.mjs";
import { registerJournalTab } from "./journal-tab.mjs";
import { registerSheetTweaks } from "./sheet-tweaks.mjs";
import { applyColorBlind, registerColorBlind } from "./colorblind.mjs";
import { registerAdvantageReasons } from "./advantage-reasons.mjs";
import { registerTooltipScroll } from "./tooltip-scroll.mjs";

/** Run one feature's setup without letting a failure stop the others. */
function safely(name, fn) {
  try {
    fn();
  } catch(err) {
    console.error(`DnD5e QoL | ${name} failed to start.`, err);
  }
}

Hooks.once("init", () => {
  registerSettings();
  safely("Label Roll Bonuses", registerRollLabels);
  safely("NPC Coin Drops", registerCoinDrops);
  safely("Roll Table Alphabetical Sort", registerTableSort);
  safely("Find Familiar Browser", registerFamiliarBrowser);
  safely("Sort Spells by Level", registerSpellSort);
  safely("Hide Prices", registerHidePrices);
  safely("Container Item Rolls", registerContainerRolls);
  safely("Journal Tab", registerJournalTab);
  safely("Sheet Tweaks", registerSheetTweaks);
  safely("Color Blind Mode", registerColorBlind);
  safely("Advantage Highlight", registerAdvantageReasons);
  safely("Scroll Tooltips", registerTooltipScroll);
});

Hooks.once("ready", () => {
  applyBodyClasses();
  applyButtonLabels();
  safely("Color Blind Mode", applyColorBlind);
});
