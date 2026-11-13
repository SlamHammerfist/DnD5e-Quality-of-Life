/**
 * Sort Spells by Level: when the compendium browser lists only spells, results are ordered by
 * level (cantrips first) and then by name, with a header above each level.
 */

import { CSS } from "./constants.mjs";
import { isOn } from "./settings.mjs";

/** Spell level of each result the browser has fetched, by UUID. */
const levels = new Map();

/** Wrap the browser's fetch and watch its results list. Called during init. */
export function registerSpellSort() {
  const Browser = dnd5e.applications.CompendiumBrowser;
  const original = Browser.fetch;

  Browser.fetch = async function(documentClass, options={}) {
    const types = options.types;
    const spellsOnly = isOn("spellLevelSort") && (documentClass?.metadata?.name === "Item")
      && (types?.size === 1) && types.has("spell");
    if ( !spellsOnly ) return original.call(this, documentClass, options);

    const indexFields = new Set(options.indexFields ?? []);
    indexFields.add("system.level");
    const results = await original.call(this, documentClass, { ...options, indexFields, sort: byLevelThenName });
    for ( const r of results ) levels.set(r.uuid, Number(foundry.utils.getProperty(r, "system.level") ?? 0));
    return results;
  };

  Hooks.on("renderCompendiumBrowser", app => watchResults(app));
}

/** Sort by spell level, then name. */
function byLevelThenName(a, b) {
  const la = Number(foundry.utils.getProperty(a, "system.level") ?? 0);
  const lb = Number(foundry.utils.getProperty(b, "system.level") ?? 0);
  return (la - lb) || String(a.name).localeCompare(String(b.name), game.i18n.lang);
}

/**
 * Keep level headers in the results list as batches of results load in.
 * @param {CompendiumBrowser} app
 */
function watchResults(app) {
  if ( app._dstSpellObserver ) return;
  const observer = new MutationObserver(() => addHeaders(app, observer));
  app._dstSpellObserver = observer;
  observer.observe(app.element, { childList: true, subtree: true });
  addHeaders(app, observer);
}

/**
 * Put a header before the first spell of each level, and remove any that no longer belong.
 * @param {CompendiumBrowser} app
 * @param {MutationObserver} observer
 */
function addHeaders(app, observer) {
  const list = app.element?.querySelector('[data-application-part="results"] .item-list');
  if ( !list ) return;
  observer.disconnect();
  try {
    list.querySelectorAll(`:scope > .${CSS}-level-header`).forEach(h => h.remove());
    const types = app.currentFilters?.types;
    const spellsOnly = isOn("spellLevelSort") && (types?.size === 1) && types.has("spell");
    if ( spellsOnly ) {
      let last = null;
      for ( const li of list.querySelectorAll(":scope > li[data-uuid]") ) {
        const level = levels.get(li.dataset.uuid);
        if ( (level === undefined) || (level === last) ) continue;
        last = level;
        li.before(header(level));
      }
    }
  } finally {
    observer.observe(app.element, { childList: true, subtree: true });
  }
}

/**
 * A level header row.
 * @param {number} level
 * @returns {HTMLLIElement}
 */
function header(level) {
  const li = document.createElement("li");
  li.className = `${CSS}-level-header`;
  const label = CONFIG.DND5E.spellLevels?.[level] ?? `Level ${level}`;
  li.innerHTML = `<h4>${game.i18n.localize(label)}</h4>`;
  return li;
}
