/**
 * Find Familiar Browser: when Find Familiar (or the Druid's Wild Companion) asks which creature to
 * summon, the compendium browser opens with the 2024 Monster Manual source already ticked. That
 * lists each familiar once and leaves out the summon-only stat blocks. Other books can still be ticked.
 */

import { isOn } from "./settings.mjs";

/** Source book of the 2024 Monster Manual, as written in that module's settings. */
const MM_2024 = "MM 2024";

/** Module that provides the 2024 Monster Manual. */
const MM_MODULE = "dnd-monster-manual";

/** Items this applies to, matched by identifier or name. */
const IDENTIFIERS = new Set(["find-familiar", "wild-companion"]);
const NAMES = /find familiar|wild companion/i;

/** Wrap the summon activity's creature picker. Called during init. */
export function registerFamiliarBrowser() {
  const SummonActivity = CONFIG.DND5E.activityTypes?.summon?.documentClass;
  const original = SummonActivity?.prototype?.queryActor;
  if ( !original ) {
    console.warn("DnD5e QoL | Could not find the summon activity; Find Familiar Browser is off.");
    return;
  }

  SummonActivity.prototype.queryActor = async function(profile) {
    if ( !isOn("familiarBrowser") || !isFamiliarSummon(this) || !game.modules.get(MM_MODULE)?.active ) {
      return original.call(this, profile);
    }
    console.log(`DnD5e QoL | Find Familiar Browser: opening with the 2024 Monster Manual ticked for ${this.item.name}.`);
    return queryFamiliar(this, profile);
  };
}

/**
 * Is this summon from Find Familiar or Wild Companion?
 * @param {Activity} activity
 * @returns {boolean}
 */
function isFamiliarSummon(activity) {
  const item = activity.item;
  if ( !item ) return false;
  // Wild Companion casts Find Familiar, so the cast spell may carry either name.
  const ids = [item.system.identifier, activity.cachedSpell?.system?.identifier];
  if ( ids.some(id => IDENTIFIERS.has(id)) ) return true;
  return NAMES.test(item.name?.trim() ?? "");
}

/**
 * Open the compendium browser the same way dnd5e does, but with the 2024 Monster Manual ticked.
 * @param {Activity} activity
 * @param {object} profile          The summon profile (CR limit and creature types).
 * @returns {Promise<string|null>}  UUID of the chosen creature, or null if cancelled.
 */
async function queryFamiliar(activity, profile) {
  const rollData = activity.getRollData({ deterministic: true });
  const maxCR = dnd5e.utils.simplifyBonus(profile.cr, rollData);
  const locked = {
    documentClass: "Actor",
    types: new Set(["npc"]),
    additional: { cr: { max: maxCR } }
  };
  if ( profile.types?.size ) {
    locked.additional.type = Object.fromEntries(Array.from(profile.types).map(t => [t, 1]));
  }

  // Same as dnd5e's own picker, but we keep hold of the window so we can tick the source box.
  const Browser = dnd5e.applications.CompendiumBrowser;
  const slug = dnd5e.utils.formatIdentifier(MM_2024);
  return new Promise(resolve => {
    const browser = new Browser({ filters: { locked }, selection: { min: 1, max: 1 } });
    browser.addEventListener("close", () => {
      resolve(browser.selected?.size ? browser.selected.first() : null);
    }, { once: true });
    tickSourceWhenReady(browser, slug);
    browser.render({ force: true });
  });
}

/**
 * The source list is drawn after the results load, so wait for the Monster Manual box to appear,
 * then tick it the same way a click would (which also filters the results).
 * @param {CompendiumBrowser} browser
 * @param {string} slug  Source identifier, e.g. "mm-2024".
 */
function tickSourceWhenReady(browser, slug) {
  const selector = `filter-state[name="additional.source.${slug}"]`;
  let done = false;
  const tryTick = () => {
    if ( done ) return;
    const box = browser.element?.querySelector(selector);
    if ( !box ) return;
    done = true;
    observer?.disconnect();
    box.value = 1;
  };
  let observer;
  const hookId = Hooks.on("renderCompendiumBrowser", app => {
    if ( app !== browser ) return;
    Hooks.off("renderCompendiumBrowser", hookId);
    observer = new MutationObserver(tryTick);
    observer.observe(app.element, { childList: true, subtree: true });
    tryTick();
  });
  browser.addEventListener("close", () => {
    Hooks.off("renderCompendiumBrowser", hookId);
    observer?.disconnect();
  }, { once: true });
}
