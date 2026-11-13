/**
 * Advantage Highlight: in the d20 roll dialog, the button dnd5e picked (Advantage, Normal or
 * Disadvantage) stays highlighted even after you click into another field, and a line above the
 * buttons says why: "Advantage: Reckless Attack" or "Disadvantage: Poisoned, Heavy Armor".
 *
 * dnd5e only keeps a count of advantage and disadvantage sources, not their names, so the sources
 * are worked out again here from the same places dnd5e looks: active effects, conditions, equipped
 * armour, character flags, effect rules and the actor's own roll settings.
 */

import { isOn } from "./settings.mjs";

/** Effect change types (v14 strings and the older numeric modes) that touch a roll mode. */
const CHANGE_TYPES = { 1: "multiply", 2: "add", 3: "downgrade", 4: "upgrade", 5: "override" };

/** Register the hook. Called during init. */
export function registerAdvantageReasons() {
  Hooks.on("renderD20RollConfigurationDialog", (app, element) => {
    if ( !isOn("advantageHighlight") ) return;
    try {
      decorate(app, element);
    } catch(err) {
      console.warn("DnD5e QoL | Could not show advantage reasons.", err);
    }
  });
}

/**
 * Highlight the chosen button and add the reasons line.
 * @param {D20RollConfigurationDialog} app
 * @param {HTMLElement} element
 */
function decorate(app, element) {
  const nav = element.querySelector(".dialog-buttons");
  if ( !nav ) return;
  element.querySelector(".dst-adv-reason")?.remove();

  const buttons = Array.from(nav.querySelectorAll("button[data-action]"));
  const chosen = buttons.find(b => b.hasAttribute("autofocus"))
    ?? buttons.find(b => b.dataset.action === "normal");
  if ( !chosen ) return;
  const mode = chosen.dataset.action;
  for ( const button of buttons ) {
    button.classList.toggle("dst-adv-default", button === chosen);
    button.classList.remove("dst-adv-advantage", "dst-adv-normal", "dst-adv-disadvantage");
  }
  chosen.classList.add(`dst-adv-${mode}`);

  const reasons = findReasons(app.config ?? {});
  const text = describe(mode, reasons);
  if ( !text ) return;
  const line = document.createElement("p");
  line.className = `dst-adv-reason dst-adv-${mode}`;
  const icon = { advantage: "fa-circle-up", disadvantage: "fa-circle-down" }[mode] ?? "fa-circle-half-stroke";
  line.innerHTML = `<i class="fa-solid ${icon}" inert></i> `;
  line.append(text);
  nav.before(line);
}

/**
 * Turn the reasons into a sentence for the chosen mode.
 * @param {string} mode  "advantage", "normal" or "disadvantage".
 * @param {Reasons} reasons
 * @returns {string|null}
 */
function describe(mode, { advantage, disadvantage, notes }) {
  const list = arr => [...new Set(arr)].join(", ");
  const extra = notes.length ? ` (${list(notes)})` : "";
  const adv = game.i18n.localize("DND5E.Advantage");
  const dis = game.i18n.localize("DND5E.Disadvantage");
  if ( mode === "advantage" ) {
    return `${adv}: ${advantage.length ? list(advantage) : "source not identified"}${extra}`;
  }
  if ( mode === "disadvantage" ) {
    return `${dis}: ${disadvantage.length ? list(disadvantage) : "source not identified"}${extra}`;
  }
  // Normal: only worth a line if something was cancelled out or blocked.
  if ( advantage.length && disadvantage.length ) {
    return `Cancel out. ${adv}: ${list(advantage)}. ${dis}: ${list(disadvantage)}${extra}`;
  }
  if ( advantage.length ) return `${adv} blocked: ${list(advantage)}${extra}`;
  if ( disadvantage.length ) return `${dis} blocked: ${list(disadvantage)}${extra}`;
  if ( notes.length ) return list(notes);
  return null;
}

/**
 * @typedef {object} Reasons
 * @property {string[]} advantage     Names of things granting advantage.
 * @property {string[]} disadvantage  Names of things imposing disadvantage.
 * @property {string[]} notes         Forced or blocked modes, e.g. "Foresight: can't have disadvantage".
 */

/**
 * Work out every source of advantage and disadvantage for the roll being configured.
 * @param {object} config  The dialog's roll process config.
 * @returns {Reasons}
 */
function findReasons(config) {
  const reasons = { advantage: [], disadvantage: [], notes: [] };
  const roll = describeRoll(config);
  if ( !roll?.actor ) return reasons;
  const { actor, keyPaths } = roll;

  // Active effects that change one of the roll's modes.
  for ( const effect of actor.appliedEffects ?? [] ) {
    if ( !effect || effect.disabled || effect.isSuppressed ) continue;
    for ( const change of effect.system?.changes ?? effect.changes ?? [] ) {
      let key = change.key ?? "";
      let value = change.value;
      let type = typeof change.type === "string" ? change.type : CHANGE_TYPES[change.mode];
      if ( key === "flags.dnd5e.initiativeAdv" ) [key, value, type] = ["system.attributes.init.roll.mode", 1, "add"];
      if ( !keyPaths.some(kp => key === `system.${kp}.mode`) ) continue;
      addChange(reasons, effect.name, type, Number(value));
    }
  }

  // Modes saved on the actor itself (the roll settings on the sheet).
  for ( const kp of keyPaths ) {
    const src = foundry.utils.getProperty(actor.system._source ?? {}, `${kp}.mode`);
    if ( src === 1 ) reasons.advantage.push("Actor roll setting");
    else if ( src === -1 ) reasons.disadvantage.push("Actor roll setting");
  }

  addSystemReasons(reasons, roll);
  addRuleReasons(reasons, roll);
  return reasons;
}

/**
 * Record one advantage mode change.
 * @param {Reasons} reasons
 * @param {string} name   Where it comes from.
 * @param {string} type   Change type.
 * @param {number} value  -1, 0 or 1.
 */
function addChange(reasons, name, type, value) {
  if ( type === "add" ) {
    if ( value === 1 ) reasons.advantage.push(name);
    else if ( value === -1 ) reasons.disadvantage.push(name);
  }
  else if ( type === "override" ) {
    if ( value === 1 ) reasons.notes.push(`${name}: always advantage`);
    else if ( value === -1 ) reasons.notes.push(`${name}: always disadvantage`);
    else if ( value === 0 ) reasons.notes.push(`${name}: always normal`);
  }
  else if ( type === "upgrade" ) {
    reasons.notes.push(`${name}: can't have disadvantage`);
    if ( value === 1 ) reasons.advantage.push(name);
  }
  else if ( type === "downgrade" ) {
    reasons.notes.push(`${name}: can't have advantage`);
    if ( value === -1 ) reasons.disadvantage.push(name);
  }
}

/**
 * Sources dnd5e adds in code rather than through effects: conditions, armour and feats.
 * @param {Reasons} reasons
 * @param {RollInfo} roll
 */
function addSystemReasons(reasons, roll) {
  const { actor, kind, ability, skill } = roll;
  const physical = CONFIG.DND5E.abilities[ability]?.type === "physical";
  const condition = key => conditionNames(actor, key);
  const isLegacy = dnd5e.settings?.rulesVersion === "legacy";
  const flags = actor.flags?.dnd5e ?? {};
  const flagName = key => game.i18n.localize(CONFIG.DND5E.characterFlags?.[key]?.name ?? key);

  if ( ["check", "skill", "tool", "initiative"].includes(kind) ) {
    reasons.disadvantage.push(...condition("abilityCheckDisadvantage"));
    if ( physical ) reasons.disadvantage.push(...condition("physicalCheckDisadvantage"));
  }

  if ( (kind === "save") && ability ) {
    reasons.disadvantage.push(...condition("abilitySaveDisadvantage"));
    if ( physical ) reasons.disadvantage.push(...condition("physicalSaveDisadvantage"));
    if ( ability === "dex" ) {
      reasons.advantage.push(...condition("dexteritySaveAdvantage"));
      reasons.disadvantage.push(...condition("dexteritySaveDisadvantage"));
    }
  }

  if ( kind === "skill" ) {
    if ( skill === "ste" ) {
      const armor = actor.system.attributes?.ac?.equippedArmor;
      if ( armor?.system.properties?.has("stealthDisadvantage") ) reasons.disadvantage.push(armor.name);
    }
    const athlete = CONFIG.DND5E.characterFlags?.remarkableAthlete?.skills ?? [];
    if ( flags.remarkableAthlete && !isLegacy && athlete.includes(skill) ) {
      reasons.advantage.push(flagName("remarkableAthlete"));
    }
    const relevant = actor.system.skills?.[skill];
    const tool = actor.system.tools?.[roll.tool];
    if ( relevant?.prof?.hasProficiency && tool?.prof?.hasProficiency ) reasons.advantage.push("Skill and tool proficiency");
  }

  if ( kind === "tool" ) {
    const relevant = actor.system.tools?.[roll.tool];
    const other = actor.system.skills?.[skill];
    if ( relevant?.prof?.hasProficiency && other?.prof?.hasProficiency ) reasons.advantage.push("Skill and tool proficiency");
  }

  if ( kind === "initiative" ) {
    if ( flags.remarkableAthlete && !isLegacy ) reasons.advantage.push(flagName("remarkableAthlete"));
    reasons.advantage.push(...condition("initiativeAdvantage"));
    reasons.disadvantage.push(...condition("initiativeDisadvantage"));
    // An Advantage on Initiative flag set directly on the actor rather than by an effect.
    if ( flags.initiativeAdv && !reasons.advantage.length ) reasons.advantage.push(flagName("initiativeAdv"));
  }
}

/**
 * Advantage rules added by effects (the "Advantage" rule type in dnd5e 6).
 * @param {Reasons} reasons
 * @param {RollInfo} roll
 */
function addRuleReasons(reasons, roll) {
  const AppliedRules = dnd5e.documents?.AppliedRules;
  if ( !AppliedRules || !roll.category ) return;
  let rules;
  try {
    rules = AppliedRules.collect(`${roll.category}:advantage`, roll.actor, roll.item).filterWith(roll.rollData);
  } catch(err) {
    return;
  }
  for ( const rule of rules ) {
    const name = rule.effect?.name ?? rule.label ?? "Rule";
    switch ( String(rule.value).trim() ) {
      case "1": case "+1": reasons.advantage.push(name); break;
      case "-1": reasons.disadvantage.push(name); break;
      case "=1": case "=+1": reasons.notes.push(`${name}: always advantage`); break;
      case "=-1": reasons.notes.push(`${name}: always disadvantage`); break;
      case ">=0": reasons.notes.push(`${name}: can't have disadvantage`); break;
      case "<=0": reasons.notes.push(`${name}: can't have advantage`); break;
    }
  }
}

/**
 * Names of the conditions on the actor that give a dnd5e condition effect, e.g. "Poisoned".
 * @param {Actor5e} actor
 * @param {string} key  Key in CONFIG.DND5E.conditionEffects.
 * @returns {string[]}
 */
function conditionNames(actor, key) {
  if ( !actor.hasConditionEffect?.(key) ) return [];
  const names = [];
  for ( const prop of CONFIG.DND5E.conditionEffects?.[key] ?? [] ) {
    const [status, level] = prop.split("-");
    if ( !actor.statuses?.has(status) ) continue;
    if ( level && !(Number(level) <= (actor.system.conditions?.[status] ?? 0)) ) continue;
    const label = CONFIG.DND5E.conditionTypes?.[status]?.name ?? CONFIG.DND5E.conditionTypes?.[status]?.label
      ?? CONFIG.statusEffects.find(s => s.id === status)?.name ?? status.capitalize();
    let name = game.i18n.localize(label);
    if ( level ) name += ` ${actor.system.conditions[status]}`;
    names.push(name);
  }
  return names;
}

/**
 * @typedef {object} RollInfo
 * @property {Actor5e} actor
 * @property {Item5e} [item]
 * @property {string} kind        attack, check, skill, tool, save, initiative, death, concentration.
 * @property {string} [category]  Rules category: attack, check or save.
 * @property {string} [ability]
 * @property {string} [skill]
 * @property {string} [tool]
 * @property {string[]} keyPaths  Roll fields on actor.system that dnd5e combines for this roll.
 * @property {object} rollData
 */

/**
 * Work out what kind of roll the dialog is for and which actor fields feed its advantage.
 * Mirrors the field lists dnd5e uses when it builds each roll.
 * @param {object} config
 * @returns {RollInfo|null}
 */
function describeRoll(config) {
  const hooks = (config.hookNames ?? []).map(h => String(h).toLowerCase());
  const subject = config.subject;
  const actor = subject instanceof Actor ? subject : (subject?.actor ?? subject?.item?.actor ?? null);
  if ( !actor?.system ) return null;
  const ability = config.ability;
  const rollData = () => {
    const data = actor.getRollData?.({ roll: true }) ?? {};
    data.roll = { ...(data.roll ?? {}), ability };
    return data;
  };

  if ( hooks.includes("attack") ) {
    const actionType = subject.getActionType?.(config.attackMode) ?? subject.actionType;
    return {
      actor, item: subject.item, kind: "attack", category: "attack", ability,
      keyPaths: [`abilities.${ability}.attack.roll`, "rolls.attack", `rolls.attack.${actionType}`],
      rollData: subject.getRollData?.({ roll: { ability, attackMode: config.attackMode } }) ?? rollData()
    };
  }
  // Death and concentration saves are saving throws with one extra field of their own.
  const extra = hooks.includes("deathsave") ? "attributes.death.roll"
    : hooks.includes("concentration") ? "attributes.concentration.roll" : null;
  if ( extra ) {
    const data = rollData();
    data.roll.type = config.saveType ?? "ability";
    const keyPaths = [extra, "rolls.ability.save"];
    if ( ability ) keyPaths.push(`abilities.${ability}.save.roll`);
    return { actor, kind: "save", category: "save", ability, keyPaths, rollData: data };
  }
  if ( hooks.includes("initiativedialog") || hooks.includes("initiative") ) {
    const abl = actor.system.attributes?.init?.ability || CONFIG.DND5E.defaultAbilities?.initiative || "dex";
    const data = rollData();
    Object.assign(data.roll, { ability: abl, type: "initiative" });
    return {
      actor, kind: "initiative", category: "check", ability: abl,
      keyPaths: [`abilities.${abl}.check.roll`, "attributes.init.roll", "rolls.ability.check"], rollData: data
    };
  }
  if ( hooks.includes("skill") || hooks.includes("tool") ) {
    const type = hooks.includes("skill") ? "skill" : "tool";
    const id = type === "skill" ? config.skill : config.tool;
    const data = rollData();
    Object.assign(data.roll, { type, [type]: id });
    return {
      actor, kind: type, category: "check", ability, skill: config.skill, tool: config.tool,
      keyPaths: [`abilities.${ability}.check.roll`, "rolls.ability.check", `rolls.ability.${type}`, `${type}s.${id}.roll`],
      rollData: data
    };
  }
  if ( hooks.includes("abilitycheck") || hooks.includes("savingthrow") ) {
    const type = hooks.includes("savingthrow") ? "save" : "check";
    const data = rollData();
    data.roll.type = config[`${type}Type`] ?? "ability";
    return {
      actor, kind: type, category: type, ability,
      keyPaths: [`abilities.${ability}.${type}.roll`, `rolls.ability.${type}`], rollData: data
    };
  }
  return null;
}
