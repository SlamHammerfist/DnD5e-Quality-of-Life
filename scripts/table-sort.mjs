/**
 * Roll Table Alphabetical Sort: a header button on roll table sheets that puts every result in
 * alphabetical order and rebuilds the roll ranges from each result's weight.
 * A leading "The" is ignored when sorting.
 */

import { isOn } from "./settings.mjs";

/** Register the hook. Called during init. */
export function registerTableSort() {
  // A button right in the window's title bar, next to the close button.
  Hooks.on("renderRollTableSheet", app => {
    const header = app.window?.header ?? app.element?.querySelector(".window-header");
    if ( !header ) return;
    let button = header.querySelector(".dst-sort-table");
    if ( !isOn("tableSort") || !app.document?.isOwner ) {
      button?.remove();
      return;
    }
    if ( button ) return;
    button = document.createElement("button");
    button.type = "button";
    button.className = "header-control icon fa-solid fa-arrow-down-a-z dst-sort-table";
    button.dataset.tooltip = "";
    button.setAttribute("aria-label", "Sort Alphabetically");
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      confirmSort(app.document);
    });
    const anchor = header.querySelector('[data-action="toggleControls"], [data-action="close"]');
    if ( anchor ) anchor.before(button);
    else header.append(button);
  });
}

/**
 * Ask first, then sort.
 * @param {RollTable} table
 */
async function confirmSort(table) {
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: "Sort Alphabetically", icon: "fa-solid fa-arrow-down-a-z" },
    content: `<p>Sort every result in <strong>${foundry.utils.escapeHTML(table.name)}</strong> alphabetically and
      rebuild the roll ranges from each result's weight?</p>`
  });
  if ( ok ) await sortTable(table);
}

/**
 * Sort a table's results by name and rebuild their ranges in that order.
 * @param {RollTable} table
 */
export async function sortTable(table) {
  const results = table.results.contents.slice();
  if ( !results.length ) return;
  results.sort((a, b) => sortKey(a).localeCompare(sortKey(b), game.i18n.lang, { numeric: true }));

  let next = 1;
  const updates = results.map(result => {
    const weight = Math.max(1, Number(result.weight) || 1);
    const range = [next, next + weight - 1];
    next += weight;
    return { _id: result.id, range, weight };
  });

  await table.updateEmbeddedDocuments("TableResult", updates);
  await table.update({ formula: `1d${next - 1}` });
  ui.notifications.info(`Sorted ${results.length} results in ${table.name}.`);
}

/**
 * The text a result is sorted by: its name (or plain description), without a leading "The".
 * @param {TableResult} result
 * @returns {string}
 */
function sortKey(result) {
  let text = result.name || result.description || "";
  text = text.replace(/<[^>]*>/g, "").trim();
  return text.replace(/^the\s+/i, "").toLowerCase();
}
