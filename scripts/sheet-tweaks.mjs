/**
 * Small personal tweaks applied to actor and container sheets each time they draw:
 *   Disable Item Tooltips  remove dnd5e's hover tooltips from items
 *   Header Collapse        collapse/expand toggles on item section headers (remembered per sheet)
 *   Item Name Expands      clicking an item's name opens its details instead of using it
 */

import { CSS, MODULE } from "./constants.mjs";
import { isOn } from "./settings.mjs";

/** Register the render hooks. Called during init. */
export function registerSheetTweaks() {
  Hooks.on("renderActorSheetV2", onRenderSheet);
  Hooks.on("renderContainerSheet", onRenderSheet);
}

/**
 * Apply every tweak to a freshly drawn sheet.
 * @param {ApplicationV2} app
 * @param {HTMLElement} element
 */
function onRenderSheet(app, element) {
  if ( !game.settings.get(MODULE, "enabled") ) return;
  if ( isOn("disableItemTooltips") && (app.document?.documentName === "Actor") ) removeTooltips(element);
  applyHeaderCollapse(app, element);
  listenForNameClicks(app, element);
}

/* -------------------------------------------- */
/*  Disable Item Tooltips                       */
/* -------------------------------------------- */

/**
 * Strip the item hover tooltips dnd5e adds.
 * @param {HTMLElement} element
 */
function removeTooltips(element) {
  for ( const el of element.querySelectorAll(".item-tooltip") ) {
    delete el.dataset.tooltipHtml;
    delete el.dataset.tooltipClass;
    delete el.dataset.tooltipDirection;
  }
}

/* -------------------------------------------- */
/*  Header Collapse                             */
/* -------------------------------------------- */

/**
 * Add a collapse toggle to each item section header, restoring saved states.
 * @param {ApplicationV2} app
 * @param {HTMLElement} element
 */
function applyHeaderCollapse(app, element) {
  const on = isOn("headerCollapse");
  const saved = game.settings.get(MODULE, "collapsedSections") ?? {};
  for ( const section of element.querySelectorAll(".items-section") ) {
    const header = section.querySelector(":scope > .items-header");
    if ( !header ) continue;
    let button = header.querySelector(`:scope > .${CSS}-collapse`);
    if ( !on ) {
      button?.remove();
      section.classList.remove(`${CSS}-collapsed`);
      continue;
    }
    const key = sectionKey(app, section);
    if ( !key ) continue;
    if ( !button ) {
      button = document.createElement("button");
      button.type = "button";
      button.className = `${CSS}-collapse unbutton always-interactive`;
      button.innerHTML = '<i class="fa-solid fa-chevron-down" inert></i>';
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        toggleSection(section, key);
      });
      button.addEventListener("pointerdown", event => event.stopPropagation());
      header.prepend(button);
    }
    setCollapsed(section, button, !!saved[key]);
  }
}

/**
 * A key that identifies a section on a particular sheet, e.g. "Actor.abc:inventory:Weapons".
 * @param {ApplicationV2} app
 * @param {HTMLElement} section
 * @returns {string|null}
 */
function sectionKey(app, section) {
  const uuid = app.document?.uuid;
  const title = section.querySelector(":scope > .items-header .item-name")?.textContent.trim();
  if ( !uuid || !title ) return null;
  const tab = section.closest("[data-tab]")?.dataset.tab ?? "";
  return `${uuid}:${tab}:${title}`;
}

/**
 * Flip a section and remember it.
 * @param {HTMLElement} section
 * @param {string} key
 */
async function toggleSection(section, key) {
  const collapsed = !section.classList.contains(`${CSS}-collapsed`);
  setCollapsed(section, section.querySelector(`.${CSS}-collapse`), collapsed);
  const saved = foundry.utils.deepClone(game.settings.get(MODULE, "collapsedSections") ?? {});
  if ( collapsed ) saved[key] = true;
  else delete saved[key];
  await game.settings.set(MODULE, "collapsedSections", saved);
}

/** Show a section as collapsed or open. */
function setCollapsed(section, button, collapsed) {
  section.classList.toggle(`${CSS}-collapsed`, collapsed);
  if ( !button ) return;
  button.setAttribute("aria-label", collapsed ? "Expand Section" : "Collapse Section");
  button.dataset.tooltip = "";
  button.setAttribute("aria-expanded", String(!collapsed));
}

/* -------------------------------------------- */
/*  Item Name Expands                           */
/* -------------------------------------------- */

/**
 * Listen (once per sheet) for clicks on item names and turn them into expand/collapse.
 * The item's image still uses the item as normal.
 * @param {ApplicationV2} app
 * @param {HTMLElement} element
 */
function listenForNameClicks(app, element) {
  if ( element.dataset.dstNameClicks ) return;
  element.dataset.dstNameClicks = "true";
  element.addEventListener("click", event => {
    if ( !isOn("itemNameExpands") ) return;
    const name = event.target.closest(".item-row .item-name .name");
    if ( !name ) return;
    const row = name.closest(".item-row");
    const toggle = row?.querySelector('[data-action="toggleExpand"]');
    if ( !toggle ) return;
    event.preventDefault();
    event.stopPropagation();
    toggle.click();
  }, { capture: true });
}
