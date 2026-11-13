/**
 * Shared constants for DnD5e QoL.
 */

export const MODULE = "dnd5e-qol";

/** Short prefix for CSS classes added by this module. */
export const CSS = "dst";

/**
 * Chat card buttons that can show a text label, keyed by the button's action.
 * Order here is the order shown in the Configure Labels dialog.
 */
export const BUTTON_ACTIONS = {
  rollAttack: "Attack",
  rollDamage: "Damage",
  rollHealing: "Healing",
  rollSave: "Saving Throw",
  rollCheck: "Ability Check",
  rollFormula: "Roll Formula",
  placeTemplate: "Place Template",
  placeSummons: "Summon",
  planTeleport: "Teleport",
  transformActor: "Transform",
  consumeResource: "Consume Resource",
  refundResource: "Refund Resource",
  resistSave: "Legendary Resistance",
  breakConcentration: "Break Concentration",
  claimGold: "Claim Gold",
  resolve: "Resolve Bastion Attack",
  pay: "Pay Facility Costs"
};
