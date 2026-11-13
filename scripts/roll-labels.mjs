/**
 * Label Roll Bonuses: tags each bonus in a d20 roll with where it came from, so an attack reads
 * "1d20 + 4[Str] + 2[Prof]". Foundry keeps these tags in the formula and dnd5e shows them in the
 * expanded roll breakdown. Runs on the computer of whoever makes the roll.
 */

import { isOn } from "./settings.mjs";

/** Roll types this applies to (d20 rolls only, so damage types are never disturbed). */
const D20_HOOKS = ["d20Test", "attack", "deathSave", "concentration"];

/** Fixed labels for the bonus parts dnd5e builds. */
const FIXED_LABELS = {
  prof: "Prof",
  extraBonus: "Bonus",
  activityBonus: "Bonus",
  weaponMagic: "Magic",
  ammoMagic: "Ammo",
  ammoBonus: "Ammo",
  magicalBonus: "Magic",
  toHit: "To Hit",
  situational: "Situational",
  cover: "Cover",
  alert: "Alert"
};

/** Parts that are a mix of bonuses from active effects and other sources. */
const EFFECT_BONUS_PARTS = new Set(["ruleBonus", "deathBonus", "concentrationBonus"]);

/** Register the hook. Called during init. */
export function registerRollLabels() {
  Hooks.on("dnd5e.postBuildRollConfig", (process, config) => {
    if ( !isOn("labelRollBonuses") ) return;
    const hookNames = process?.hookNames ?? [];
    if ( !D20_HOOKS.some(h => hookNames.includes(h)) ) return;
    try {
      labelParts(process, config);
    } catch(err) {
      console.warn("DnD5e QoL | Could not label roll bonuses.", err);
    }
  });

  // Roll formulas must be written "2[Str]", but show them as "2 [Str]" for readability,
  // both in chat and in the roll dialog's formula preview.
  Hooks.on("dnd5e.renderChatMessage", (message, html) => spaceLabels(html));
  Hooks.on("renderChatMessageHTML", (message, html) => spaceLabels(html));
  Hooks.on("renderRollConfigurationDialog", (app, element) => spaceLabels(element));
}

/**
 * Put a space before each [label] in the formulas shown inside an element.
 * @param {HTMLElement} root
 */
function spaceLabels(root) {
  if ( !root?.querySelectorAll || !isOn("labelRollBonuses") ) return;
  for ( const el of root.querySelectorAll(".dice-formula, .formula") ) {
    if ( el.children.length ) continue;
    const spaced = el.textContent.replace(/([^\s[])\[/g, "$1 [");
    if ( spaced !== el.textContent ) el.textContent = spaced;
  }
}

/**
 * Replace each plain "@key" part with the same part plus a [label].
 * @param {object} process  The overall roll process config (subject, ability...).
 * @param {object} config   This roll's config (parts and data).
 */
function labelParts(process, config) {
  if ( !Array.isArray(config.parts) ) return;
  const actor = getActor(process.subject);
  const parts = [];
  for ( const part of config.parts ) {
    const match = typeof part === "string" ? part.trim().match(/^@([\w.]+)$/) : null;
    if ( !match ) {
      parts.push(part);
      continue;
    }
    const key = match[1];

    // Bonuses from effects: split into pieces and name each after the effect it came from.
    if ( EFFECT_BONUS_PARTS.has(key) ) {
      const value = foundry.utils.getProperty(config.data ?? {}, key);
      parts.push(...labelEffectBonus(value, actor) ?? [part]);
      continue;
    }

    const label = labelFor(key, process, config);
    parts.push(label ? `${part}[${clean(label)}]` : part);
  }
  config.parts = parts;
}

/**
 * The label for a single "@key" part, or null to leave it alone.
 * @param {string} key
 * @param {object} process
 * @param {object} config
 * @returns {string|null}
 */
function labelFor(key, process, config) {
  if ( key === "mod" ) {
    const ability = process.ability ?? config.data?.abilityId ?? config.data?.roll?.ability;
    const abbr = CONFIG.DND5E.abilities[ability]?.abbreviation;
    return abbr ? abbr.capitalize() : "Mod";
  }
  if ( key === "bonus" ) {
    // On attacks this is the item's own attack bonus.
    return process.subject?.item?.name ?? "Bonus";
  }
  if ( key.startsWith("reductions.") ) {
    const status = key.split(".")[1];
    const label = CONFIG.DND5E.conditionTypes?.[status]?.label ?? status.capitalize();
    return game.i18n.localize(label);
  }
  return FIXED_LABELS[key] ?? null;
}

/**
 * Split a combined bonus into its pieces and name each one after the active effect that adds it.
 * Pieces that don't come from a known effect are labelled "Bonus".
 * @param {string|number} value  The combined bonus formula.
 * @param {Actor} actor
 * @returns {string[]|null}      New parts, or null to leave the part alone.
 */
function labelEffectBonus(value, actor) {
  if ( (value === undefined) || (value === null) || (value === "") ) return null;
  const pieces = splitTerms(String(value));
  if ( !pieces.length ) return null;
  const sources = effectBonusSources(actor);
  return pieces.map(piece => {
    const label = sources.get(normalise(piece)) ?? "Bonus";
    // Anything more than a single term gets brackets so the label covers all of it.
    const body = /^[+-]?[^+\-*/\s()]+$/.test(piece) ? piece : `(${piece})`;
    return `${body}[${clean(label)}]`;
  });
}

/**
 * Map each bonus value added by the actor's active effects to the effect's name.
 * @param {Actor} actor
 * @returns {Map<string, string>}
 */
function effectBonusSources(actor) {
  const map = new Map();
  if ( !actor ) return map;
  const effects = actor.appliedEffects ?? Array.from(actor.allApplicableEffects?.() ?? []);
  for ( const effect of effects ) {
    if ( !effect || effect.disabled || effect.isSuppressed ) continue;
    const changes = effect.system?.changes ?? effect.changes ?? [];
    for ( const change of changes ) {
      if ( !/bonus/i.test(change.key ?? "") ) continue;
      for ( const piece of splitTerms(String(change.value ?? "")) ) {
        const key = normalise(piece);
        if ( key && !map.has(key) ) map.set(key, effect.name);
      }
    }
  }
  return map;
}

/**
 * Split a formula on top-level "+" signs. "1d4 + (2 + @prof)" -> ["1d4", "(2 + @prof)"].
 * @param {string} formula
 * @returns {string[]}
 */
function splitTerms(formula) {
  const out = [];
  let depth = 0;
  let current = "";
  for ( const ch of formula ) {
    if ( (ch === "(") || (ch === "[") || (ch === "{") ) depth++;
    else if ( (ch === ")") || (ch === "]") || (ch === "}") ) depth--;
    if ( (ch === "+") && (depth === 0) ) {
      if ( current.trim() ) out.push(current.trim());
      current = "";
    }
    else current += ch;
  }
  if ( current.trim() ) out.push(current.trim());
  return out;
}

/** Compare formulas ignoring spaces and case. */
function normalise(formula) {
  return formula.replace(/\s+/g, "").toLowerCase();
}

/** Strip characters that would break a roll label. */
function clean(label) {
  return String(label).replace(/[[\]{}()]/g, "").trim();
}

/**
 * The actor behind a roll's subject (an actor, an activity or an item).
 * @param {object} subject
 * @returns {Actor|null}
 */
function getActor(subject) {
  if ( !subject ) return null;
  if ( subject instanceof Actor ) return subject;
  return subject.actor ?? subject.item?.actor ?? null;
}
