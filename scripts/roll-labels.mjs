/**
 * Label Roll Bonuses: tags each bonus in a roll with where it came from, so an attack reads
 * "1d20 + 4[Str] + 2[Prof]" and its damage "1d12 + 4[Str]". Foundry keeps these tags in the formula
 * and dnd5e shows them in the expanded roll breakdown. Runs on the computer of whoever makes the roll.
 *
 * On damage rolls dnd5e reads a term's label as its damage type only when the label is a damage or
 * healing type key (e.g. "[fire]"); anything else falls back to the roll's own type. Labels that
 * would collide with a type key get " Bonus" added so they can never change the damage type.
 */

import { isOn } from "./settings.mjs";

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

  // Damage chat cards add all flat bonuses into one "+4". Split the labelled ones out into their own
  // rows, the way dnd5e's d20 breakdown lists "STR +4" and "PROF +3".
  patchDamageBreakdown();
  // dnd5e registers its own partial asynchronously during init, so put ours back afterwards.
  Hooks.once("setup", registerBreakdownPartial);
  Hooks.once("ready", registerBreakdownPartial);
}

/**
 * This module's copy of dnd5e's "dnd5e.damage-breakdown" partial (templates/chat/parts/damage-breakdown.hbs),
 * identical except for the labelled bonus rows after each damage part. Kept inline so it can be registered
 * synchronously before any chat message renders.
 */
const DAMAGE_BREAKDOWN = `<div class="dice-tooltip-collapser">
  <div class="dice-tooltip">
    {{#each parts}}
    <section class="tooltip-part">
      <div class="dice">
        {{#if icon}}
        <span class="part-method" data-tooltip aria-label="{{ localize method }}">{{{ icon }}}</span>
        {{/if}}
        <ol class="dice-rolls">
          {{#each dice}}<li class="roll {{ classes }}">{{{ result }}}</li>{{/each}}
          {{#if constant}}<li class="constant">{{ dnd5e-formatModifier constant }}</li>{{/if}}
        </ol>
        <div class="total">
          {{#if config}}<img src="{{ config.icon }}" alt="{{ config.label }}">{{/if}}
          <span class="label">{{ label }}</span>
          <span class="value">{{ total }}</span>
        </div>
      </div>
    </section>
    {{#each qolConstants}}
    <section class="tooltip-part constant-term">
      <div class="dice">
        <span class="flavor">{{ flavor }}</span>
        <div class="total"><span class="value">{{ dnd5e-formatModifier total }}</span></div>
      </div>
    </section>
    {{/each}}
    {{/each}}
  </div>
</div>`;

/** Register the damage breakdown partial. Without labels it renders exactly like dnd5e's own. */
function registerBreakdownPartial() {
  try {
    Handlebars.registerPartial("dnd5e.damage-breakdown", Handlebars.compile(DAMAGE_BREAKDOWN));
  } catch(err) {
    console.warn("DnD5e QoL | Could not register the damage breakdown.", err);
  }
}

/** Make damage rolls report their labelled flat bonuses for the breakdown partial. */
function patchDamageBreakdown() {
  const DamageRoll = CONFIG.Dice.DamageRoll;
  const original = DamageRoll?.prototype?.aggregateTerms;
  if ( !original ) return;
  DamageRoll.prototype.aggregateTerms = function(...args) {
    const aggregate = original.apply(this, args);
    try {
      if ( isOn("labelRollBonuses") ) splitLabelledConstants(this, aggregate);
    } catch(err) {
      console.warn("DnD5e QoL | Could not label damage bonuses.", err);
    }
    return aggregate;
  };
}

/**
 * Move each labelled number out of a damage breakdown's combined constant into its own row.
 * @param {Roll} roll
 * @param {object} aggregate  The breakdown from dnd5e's aggregateTerms.
 */
function splitLabelledConstants(roll, aggregate) {
  if ( (aggregate.constant === null) || (aggregate.constant === undefined) ) return;
  const { NumericTerm, OperatorTerm } = foundry.dice.terms;
  const rows = [];
  let sign = 1;
  for ( const term of roll.terms ) {
    if ( term instanceof OperatorTerm ) {
      if ( term.operator === "-" ) sign *= -1;
      else if ( term.operator !== "+" ) return;
      continue;
    }
    if ( (term instanceof NumericTerm) && term.flavor ) rows.push({ flavor: term.flavor, total: term.total * sign });
    sign = 1;
  }
  if ( !rows.length ) return;
  aggregate.qolConstants = rows;
  aggregate.constant -= rows.reduce((sum, r) => sum + r.total, 0);
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
  const item = getItem(process.subject);
  const rawBonuses = damageBonusLabels(process, actor);
  const parts = [];
  for ( const [index, part] of config.parts.entries() ) {
    const match = typeof part === "string" ? part.trim().match(/^@([\w.]+)$/) : null;
    if ( !match ) {
      // Damage bonuses dnd5e adds as plain formulas (the actor's global damage bonus and the item's
      // own damage bonus). The first part is always the base damage, so it is never touched.
      const raw = (index > 0) && (typeof part === "string") && !part.includes("[")
        ? rawBonuses.get(normalise(part)) : null;
      if ( raw === "effects" ) parts.push(...labelEffectBonus(part, actor, item) ?? [part]);
      else if ( raw ) parts.push(`${wrap(part)}[${clean(raw)}]`);
      else parts.push(part);
      continue;
    }
    const key = match[1];

    // A situational bonus that already has its own labels, e.g. "1d4[Bless]", is left alone:
    // adding "[Situational]" after it would make "1d4[Bless][Situational]", which can't be rolled.
    if ( (key === "situational") && /\[/.test(String(config.data?.situational ?? "")) ) {
      parts.push(part);
      continue;
    }

    // Bonuses from effects: split into pieces and name each after the effect it came from.
    if ( EFFECT_BONUS_PARTS.has(key) ) {
      const value = foundry.utils.getProperty(config.data ?? {}, key);
      parts.push(...labelEffectBonus(value, actor, item) ?? [part]);
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
    const ability = process.ability ?? config.data?.abilityId ?? config.data?.roll?.ability
      ?? (typeof process.subject?.ability === "string" ? process.subject.ability : null);
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
 * @param {Item} [item]          The item being rolled, whose own effects can add bonuses too.
 * @returns {string[]|null}      New parts, or null to leave the part alone.
 */
function labelEffectBonus(value, actor, item) {
  if ( (value === undefined) || (value === null) || (value === "") ) return null;
  const pieces = splitTerms(String(value));
  if ( !pieces.length ) return null;
  const sources = effectBonusSources(actor, item);
  return pieces.map(piece => {
    const label = sources.get(normalise(piece)) ?? "Bonus";
    return `${wrap(piece)}[${clean(label)}]`;
  });
}

/** Anything more than a single term gets brackets so a label covers all of it. */
function wrap(piece) {
  return /^[+-]?[^+\-*/\s()]+$/.test(piece) ? piece : `(${piece})`;
}

/**
 * For a damage roll, map the plain-formula bonuses dnd5e adds to a label: the item's own damage
 * bonus gets the item's name, the actor's global damage bonus is "effects" (split by active effect).
 * @param {object} process
 * @param {Actor} actor
 * @returns {Map<string, string>}
 */
function damageBonusLabels(process, actor) {
  const map = new Map();
  const activity = process.subject;
  const item = activity?.item;
  if ( !item || !(process.hookNames ?? []).includes("damage") ) return map;
  const itemBonus = item.system?.damage?.bonus;
  if ( itemBonus ) map.set(normalise(String(itemBonus)), item.name);
  const actionType = activity.getActionType?.(process.attackMode);
  const actorBonus = actionType && foundry.utils.getProperty(actor ?? {}, `system.rolls.damage.${actionType}.bonus`);
  if ( actorBonus && !map.has(normalise(String(actorBonus))) ) map.set(normalise(String(actorBonus)), "effects");
  return map;
}

/**
 * Map each bonus value added by active effects (on the actor or the rolled item) to the effect's name.
 * @param {Actor} actor
 * @param {Item} [item]
 * @returns {Map<string, string>}
 */
function effectBonusSources(actor, item) {
  const map = new Map();
  const add = (value, name) => {
    if ( !name ) return;
    for ( const piece of splitTerms(String(value ?? "")) ) {
      const key = normalise(piece);
      if ( key && !map.has(key) ) map.set(key, name);
    }
  };

  // dnd5e 6+ rule changes: bonuses are stored by target ("attack", "damage", "d20"...) with the type
  // "bonus", and each change keeps a reference to the effect it came from.
  for ( const doc of [actor, item] ) {
    const rules = doc?.appliedRules;
    if ( !(rules instanceof Map) ) continue;
    for ( const types of rules.values() ) {
      for ( const change of types?.get?.("bonus") ?? [] ) add(change.value, change.effect?.name);
    }
  }

  // Older style changes that write straight to a bonus field, e.g. "system.bonuses.mwak.attack".
  const effects = actor?.appliedEffects ?? Array.from(actor?.allApplicableEffects?.() ?? []);
  for ( const effect of effects ) {
    if ( !effect || effect.disabled || effect.isSuppressed ) continue;
    const changes = effect.system?.changes ?? effect.changes ?? [];
    for ( const change of changes ) {
      if ( /bonus/i.test(change.key ?? "") ) add(change.value, effect.name);
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

/**
 * Strip characters that would break a roll label, and keep it from being read as a damage type.
 * @param {string} label
 * @returns {string}
 */
function clean(label) {
  const text = String(label).replace(/[[\]{}()]/g, "").trim();
  const key = text.toLowerCase();
  const isType = (key in (CONFIG.DND5E.damageTypes ?? {})) || (key in (CONFIG.DND5E.healingTypes ?? {}));
  return isType ? `${text} Bonus` : text;
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

/**
 * The item behind a roll's subject (an activity or an item), if any.
 * @param {object} subject
 * @returns {Item|null}
 */
function getItem(subject) {
  if ( !subject ) return null;
  if ( subject instanceof Item ) return subject;
  return subject.item ?? null;
}
