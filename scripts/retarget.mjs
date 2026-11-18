/**
 * Change Target After Roll: adds a crosshairs button to the targets row of attack, damage and
 * healing chat cards. Clicking it replaces the targets stored on that card with the tokens you
 * have targeted right now, so a roll made against the wrong token (or no token) can be fixed
 * without rolling again. Attack cards re-check hit or miss against the new targets' AC, and the
 * damage tray's "Targeted" mode applies to the new targets.
 *
 * Only shown to people who can edit the message (its author and the GM).
 */

import { isOn } from "./settings.mjs";

/** Message types whose stored targets can be changed. */
const TYPES = new Set(["attack", "damage", "healing"]);

/** Register the hook. Called during init. */
export function registerRetarget() {
  Hooks.on("dnd5e.renderChatMessage", (message, html) => {
    if ( !isOn("retargetRolls") || !TYPES.has(message.type) || !message.isOwner ) return;
    if ( !message.isContentVisible ) return;
    try {
      if ( message.type === "attack" ) addToAttackCard(message, html);
      // The damage tray builds its target row once it is placed on the page, so wait for that.
      else setTimeout(() => addToTrays(message, html), 0);
    } catch(err) {
      console.warn("DnD5e QoL | Could not add the change target button.", err);
    }
  });
}

/** Attack cards: add the button to the targets row, adding the row if the attack had no targets. */
function addToAttackCard(message, html) {
  const content = html.querySelector(".message-content");
  if ( !content ) return;
  let row = [...content.querySelectorAll(":scope > .icon-row")].find(r => r.querySelector("ul.targets"));
  if ( !row ) {
    row = document.createElement("section");
    row.classList.add("icon-row");
    row.innerHTML = `
      <i class="fa-fw fa-solid fa-bullseye" aria-label="Targets"></i>
      <ul class="unlist targets pills">
        <li class="none pill target transparent">${game.i18n.localize("DND5E.Tokens.NoTargets")}</li>
      </ul>`;
    const card = content.querySelector(":scope > .chat-card");
    if ( card ) card.after(row);
    else content.prepend(row);
  }
  row.append(makeButton(message));
}

/** Damage and healing cards: add the button to the target row inside the apply tray. */
function addToTrays(message, html) {
  for ( const recorded of html.querySelectorAll("recorded-targets") ) {
    const row = recorded.querySelector(":scope > .icon-row");
    if ( !row || row.querySelector(".dst-retarget") ) continue;
    row.append(makeButton(message));
  }
}

/** Build the button. */
function makeButton(message) {
  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("icon", "dst-retarget");
  button.dataset.tooltip = "Change Targets to Your Current Targets";
  button.ariaLabel = "Change Targets";
  button.innerHTML = '<i class="fa-solid fa-crosshairs" inert></i>';
  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    retarget(message);
  });
  return button;
}

/** Replace the message's stored targets with the user's current targets. */
async function retarget(message) {
  const TargetsField = dnd5e.dataModels.chatMessage.fields.TargetsField;
  const targets = TargetsField.getDescriptors();
  if ( !targets.length ) {
    ui.notifications.warn("Target one or more tokens first, then click the button again.");
    return;
  }
  // Show the new targets in the damage tray, rather than whatever tokens are selected.
  message._targetState = { checked: new Map(), mode: "targeted" };
  await message.update({ "system.targets": targets });
}
