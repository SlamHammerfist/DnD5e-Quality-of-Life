/**
 * Container Item Rolls: lets you use consumables (potions, scrolls, ammunition...) straight from a
 * container sheet by clicking their name, the same as on the character sheet. Only for containers
 * carried by an actor you own.
 */

import { isOn } from "./settings.mjs";

/** Make consumables in containers clickable. Called during init. */
export function registerContainerRolls() {
  const ContainerSheet = dnd5e.applications.item?.ContainerSheet;
  const original = ContainerSheet?.prototype?._prepareContentsContext;
  if ( !original ) return;

  ContainerSheet.prototype._prepareContentsContext = async function(context, options) {
    context = await original.call(this, context, options);
    if ( !isOn("containerRolls") || !this.item.actor || !this.item.isOwner ) return context;
    for ( const item of context.items ?? [] ) {
      if ( item.type !== "consumable" ) continue;
      const ctx = context.itemContext[item.id] ??= {};
      ctx.clickAction ??= "use";
    }
    return context;
  };
}
