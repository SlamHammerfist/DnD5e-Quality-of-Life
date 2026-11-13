/**
 * Auto Kill NPCs: when an NPC's hit points drop to 0, mark it dead (the defeated status as a token
 * overlay) and, if it is in combat, mark its combatant defeated. Healing it back above 0 brings it
 * back. Handled by the active GM only, so it happens once no matter who dealt the damage.
 */

import { isOn } from "./settings.mjs";

/** Register the hook. Called during init. */
export function registerAutoDefeat() {
  Hooks.on("updateActor", (actor, changes) => {
    if ( !game.user.isActiveGM || !isOn("autoKillNpcs") ) return;
    if ( actor.type !== "npc" ) return;
    if ( !foundry.utils.hasProperty(changes, "system.attributes.hp.value") ) return;
    setDefeated(actor).catch(err => console.warn("DnD5e QoL | Could not update NPC defeated state.", err));
  });
}

/**
 * Match the actor's dead status and combat defeated state to its current hit points.
 * @param {Actor5e} actor
 */
async function setDefeated(actor) {
  const hp = actor.system.attributes?.hp;
  if ( !hp || !(hp.max > 0) ) return;
  const dead = hp.value <= 0;
  const statusId = CONFIG.specialStatusEffects.DEFEATED ?? "dead";
  if ( actor.statuses.has(statusId) !== dead ) {
    await actor.toggleStatusEffect(statusId, { active: dead, overlay: true });
  }

  // Mark the matching combatants in every combat, so the tracker skips or restores them.
  const tokenIds = new Set(actor.getActiveTokens(false, true).map(t => t.id));
  for ( const combat of game.combats ) {
    const updates = combat.combatants
      .filter(c => (c.defeated !== dead) && ((c.actor === actor) || tokenIds.has(c.tokenId)))
      .map(c => ({ _id: c.id, defeated: dead }));
    if ( updates.length ) await combat.updateEmbeddedDocuments("Combatant", updates);
  }
}
