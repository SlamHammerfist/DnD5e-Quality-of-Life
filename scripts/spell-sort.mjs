/**
 * Grouped compendium browser results:
 *  - Sort Spells by Level: when the browser lists only spells, results are ordered by level
 *    (cantrips first) and then by name, with a header above each level.
 *  - Sort Monsters by CR: when the browser lists only NPCs, results are ordered by Challenge
 *    Rating (lowest first, no CR last) and then by name, with a header above each CR.
 */

import { CSS } from "./constants.mjs";
import { isOn } from "./settings.mjs";

/**
 * @typedef {object} GroupMode
 * @property {string} setting       Setting key that switches this grouping on.
 * @property {string} documentName  Document class the browser must be listing.
 * @property {string} type          The single type the browser must be filtered to.
 * @property {string} field         Key path of the value results are grouped by.
 * @property {function(*): number} value   Read a sortable number from the raw field value.
 * @property {function(number): string} label  Header text for a group.
 */

/** @type {GroupMode[]} */
const MODES = [
  {
    setting: "spellLevelSort",
    documentName: "Item",
    type: "spell",
    field: "system.level",
    value: v => Number(v ?? 0),
    label: level => game.i18n.localize(CONFIG.DND5E.spellLevels?.[level] ?? `Level ${level}`)
  },
  {
    setting: "monsterCrSort",
    documentName: "Actor",
    type: "npc",
    field: "system.details.cr",
    // No CR sorts after every real CR.
    value: v => ((v === null) || (v === undefined) || (v === "") || isNaN(Number(v))) ? Infinity : Number(v),
    label: cr => {
      if ( cr === Infinity ) return `${game.i18n.localize("DND5E.AbbreviationCR")} —`;
      return `${game.i18n.localize("DND5E.AbbreviationCR")} ${dnd5e.utils.formatCR(cr)}`;
    }
  }
];

/**
 * The grouping that applies to a browser filtered to these types, if any.
 * @param {string} documentName
 * @param {Set<string>} types
 * @returns {GroupMode|undefined}
 */
function modeFor(documentName, types) {
  if ( types?.size !== 1 ) return;
  return MODES.find(m => (m.documentName === documentName) && types.has(m.type) && isOn(m.setting));
}

/** Group value of each result the browser has fetched, by UUID. */
const groups = new Map();

/** Wrap the browser's fetch and watch its results list. Called during init. */
export function registerSpellSort() {
  const Browser = dnd5e.applications.CompendiumBrowser;
  const original = Browser.fetch;

  Browser.fetch = async function(documentClass, options={}) {
    const mode = modeFor(documentClass?.metadata?.name, options.types);
    if ( !mode ) return original.call(this, documentClass, options);

    const read = r => mode.value(foundry.utils.getProperty(r, mode.field));
    // Infinity - Infinity is NaN, which is falsy, so two no-CR results fall through to name.
    const sort = (a, b) => (read(a) - read(b))
      || String(a.name).localeCompare(String(b.name), game.i18n.lang);
    const indexFields = new Set(options.indexFields ?? []);
    indexFields.add(mode.field);
    const results = await original.call(this, documentClass, { ...options, indexFields, sort });
    for ( const r of results ) groups.set(r.uuid, read(r));
    return results;
  };

  Hooks.on("renderCompendiumBrowser", app => watchResults(app));
}

/**
 * Keep group headers in the results list as batches of results load in.
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
 * Put a header before the first result of each group, and remove any that no longer belong.
 * @param {CompendiumBrowser} app
 * @param {MutationObserver} observer
 */
function addHeaders(app, observer) {
  const list = app.element?.querySelector('[data-application-part="results"] .item-list');
  if ( !list ) return;
  observer.disconnect();
  try {
    list.querySelectorAll(`:scope > .${CSS}-level-header`).forEach(h => h.remove());
    const filters = app.currentFilters;
    const mode = modeFor(filters?.documentClass, filters?.types);
    if ( mode ) {
      let last = null;
      for ( const li of list.querySelectorAll(":scope > li[data-uuid]") ) {
        const group = groups.get(li.dataset.uuid);
        if ( (group === undefined) || (group === last) ) continue;
        last = group;
        li.before(header(mode.label(group)));
      }
    }
  } finally {
    observer.observe(app.element, { childList: true, subtree: true });
  }
}

/**
 * A group header row.
 * @param {string} label
 * @returns {HTMLLIElement}
 */
function header(label) {
  const li = document.createElement("li");
  li.className = `${CSS}-level-header`;
  const h4 = document.createElement("h4");
  h4.textContent = label;
  li.append(h4);
  return li;
}
