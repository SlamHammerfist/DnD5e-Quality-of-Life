/**
 * Change Target After Roll: click the bullseye icon on an attack chat card's targets row to replace
 * the card's targets with the tokens you have targeted right now, so an attack made against the
 * wrong token (or no token) can be fixed without rolling again. Hit or miss is re-checked against
 * the new targets' AC. Clicking it with nothing targeted clears the card's targets.
 *
 * The new targets are also copied to the item use card the attack came from (so damage rolled from
 * it afterwards uses them) and to any damage or healing cards already rolled from that same use (so
 * their apply tray's "Targeted" mode applies to the new targets).
 *
 * It isn't done automatically when you target a token, because targeting the next enemy before your
 * next attack would then rewrite the previous attack.
 *
 * Only works for people who can edit the message (its author and the GM).
 */

import { isOn } from "./settings.mjs";

/** Cards rolled from the same use that follow the attack's new targets. */
const FOLLOWERS = new Set(["damage", "healing"]);

/** Register the hook. Called during init. */
export function registerRetarget() {
  Hooks.on("dnd5e.renderChatMessage", (message, html) => {
    if ( !isOn("retargetRolls") || (message.type !== "attack") || !message.isOwner ) return;
    if ( !message.isContentVisible ) return;
    try {
      addToAttackCard(message, html);
    } catch(err) {
      console.warn("DnD5e QoL | Could not set up changing targets.", err);
    }
  });
}

/** Make the bullseye icon on the targets row clickable, adding the row if the attack had no targets. */
function addToAttackCard(message, html) {
  const content = html.querySelector(".message-content");
  if ( !content ) return;
  let row = [...content.querySelectorAll(":scope > .icon-row")].find(r => r.querySelector("ul.targets"));
  if ( !row ) {
    row = document.createElement("section");
    row.classList.add("icon-row");
    row.innerHTML = `
      <i class="fa-fw fa-solid fa-bullseye"></i>
      <ul class="unlist targets pills">
        <li class="none pill target transparent">${game.i18n.localize("DND5E.Tokens.NoTargets")}</li>
      </ul>`;
    const card = content.querySelector(":scope > .chat-card");
    if ( card ) card.after(row);
    else content.prepend(row);
  }
  const icon = row.querySelector(":scope > i.fa-bullseye");
  if ( !icon ) return;
  icon.classList.add("dst-retarget");
  icon.role = "button";
  icon.tabIndex = 0;
  icon.ariaLabel = "Change Targets";
  icon.dataset.tooltip = "Change to Your Current Targets";
  const run = event => {
    event.preventDefault();
    event.stopPropagation();
    retarget(message);
  };
  icon.addEventListener("click", run);
  icon.addEventListener("keydown", event => {
    if ( (event.key === "Enter") || (event.key === " ") ) run(event);
  });
}

/** Replace (or clear, with nothing targeted) the attack's stored targets, and those of its use card and damage cards, with the user's current targets. */
async function retarget(message) {
  const TargetsField = dnd5e.dataModels.chatMessage.fields.TargetsField;
  // With nothing targeted this clears the targets.
  const targets = TargetsField.getDescriptors();

  const messages = [message];
  const originId = idOf(message.system.origin);
  if ( originId ) {
    const origin = game.messages.get(originId);
    if ( origin?.system?.targets ) messages.push(origin);
    for ( const other of game.messages ) {
      if ( FOLLOWERS.has(other.type) && (idOf(other.system.origin) === originId) ) messages.push(other);
    }
  }

  for ( const msg of messages ) {
    if ( !msg.isOwner ) continue;
    // Show the new targets in damage trays, rather than whatever tokens are selected.
    msg._targetState = { checked: new Map(), mode: "targeted" };
    await msg.update({ "system.targets": targets });
  }
}

/** The id of a stored origin message, whether it is held as the message or as its id. */
function idOf(origin) {
  return (typeof origin === "string") ? origin : origin?.id;
}
