/**
 * Hide Prices (Players): removes the price column from every item list (character, NPC and
 * container sheets) for players. The GM still sees prices. A CSS rule backs this up for any
 * price cell drawn some other way (see .dst-hide-prices in the stylesheet).
 */

import { isOn } from "./settings.mjs";

/** Drop the price column when dnd5e builds its item list columns. Called during init. */
export function registerHidePrices() {
  const Inventory = dnd5e.applications.components?.InventoryElement;
  const original = Inventory?.mapColumns;
  if ( !original ) return;
  Inventory.mapColumns = function(cols) {
    const columns = original.call(this, cols);
    if ( game.user?.isGM || !isOn("hidePrices") ) return columns;
    return columns.filter(c => c?.id !== "price");
  };
}
