/**
 * Enable Journal Tab: adds a "Journal" tab to character and NPC sheets with a notes editor.
 * Notes are personal: each user's notes are saved on their own user account (one page per actor),
 * so players can keep notes even on sheets they can only view, and nobody else sees them.
 */

import { MODULE } from "./constants.mjs";
import { isOn } from "./settings.mjs";

const TAB_ID = "dstJournal";

/** Add the tab to the dnd5e character and NPC sheets. Called during init. */
export function registerJournalTab() {
  const sheets = dnd5e.applications.actor ?? {};
  for ( const Sheet of [sheets.CharacterActorSheet, sheets.NPCActorSheet] ) {
    if ( Sheet ) addTab(Sheet);
  }
  Hooks.on("renderActorSheetV2", activateEditor);
}

/**
 * Add the journal tab, its part, and its context to one sheet class.
 * @param {typeof ApplicationV2} Sheet
 */
function addTab(Sheet) {
  if ( Sheet.TABS.some(t => t.tab === TAB_ID) ) return;

  // Tab button, placed after Biography. Hidden whenever the setting is off for this user.
  const tab = { tab: TAB_ID, label: "Journal", icon: "fa-solid fa-book-open", condition: () => isOn("journalTab") };
  const after = Sheet.TABS.findIndex(t => t.tab === "biography");
  Sheet.TABS.splice(after < 0 ? Sheet.TABS.length : after + 1, 0, tab);

  // Tab body, placed with the other tab bodies.
  const part = {
    container: { classes: ["tab-body"], id: "tabs" },
    template: `modules/${MODULE}/templates/journal-tab.hbs`,
    scrollable: [""]
  };
  const parts = {};
  for ( const [key, value] of Object.entries(Sheet.PARTS) ) {
    parts[key] = value;
    if ( key === "biography" ) parts[TAB_ID] = part;
  }
  parts[TAB_ID] ??= part;
  Sheet.PARTS = parts;

}

/**
 * Put the notes editor into the Journal tab. It is built here, after the sheet has finished
 * drawing, so it is only ever created once per draw and the sheet doesn't lock it.
 * Notes save when the editor's save button or Ctrl+S is used, or when the sheet redraws or closes.
 * @param {ApplicationV2} app
 * @param {HTMLElement} element
 */
function activateEditor(app, element) {
  const body = element.querySelector(".dst-journal-body");
  if ( !body || body.querySelector("prose-mirror") || !app.actor ) return;
  const editor = foundry.applications.elements.HTMLProseMirrorElement.create({
    value: readNotes(app.actor),
    toggled: false,
    documentUUID: app.actor.uuid
  });
  editor.classList.add("dst-journal-editor");
  editor.addEventListener("change", event => {
    // Keep this from submitting the actor sheet; the notes live on the user, not the actor.
    event.stopPropagation();
    writeNotes(app.actor, editor.value ?? "");
  });
  body.append(editor);
}

/**
 * Where a given actor's notes are kept on the user.
 * @param {Actor} actor
 * @returns {string}
 */
function notesKey(actor) {
  return `journal.${actor.uuid.replaceAll(".", "_")}`;
}

/** The current user's notes for an actor. */
function readNotes(actor) {
  return game.user.getFlag(MODULE, notesKey(actor)) ?? "";
}

/** Save the current user's notes for an actor. */
async function writeNotes(actor, html) {
  if ( html === readNotes(actor) ) return;
  await game.user.setFlag(MODULE, notesKey(actor), html);
}
