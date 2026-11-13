/**
 * Scroll Tooltips Without Locking
 * While a long tooltip is showing, the mouse wheel scrolls the tooltip instead of the sheet
 * underneath, so it can be read without locking it first (middle-click).
 *
 * The hover tooltip ignores the mouse (pointer-events: none), so wheel events land on whatever
 * is under it. They are caught on the window before anything else sees them.
 */

import { isOn } from "./settings.mjs";

/** Register the wheel listener. Called during init. */
export function registerTooltipScroll() {
  window.addEventListener("wheel", onWheel, { capture: true, passive: false });
}

/**
 * The part of the hover tooltip that can scroll, if it has more content than fits.
 * @returns {HTMLElement|null}
 */
function scrollableTooltipPart() {
  const tooltip = game.tooltip?.tooltip ?? document.getElementById("tooltip");
  if ( !tooltip?.classList.contains("active") ) return null;
  const candidates = [...tooltip.querySelectorAll(".description"), tooltip];
  return candidates.find(el => el.scrollHeight > el.clientHeight + 1) ?? null;
}

/**
 * Scroll the hover tooltip with the mouse wheel.
 * @param {WheelEvent} event
 */
function onWheel(event) {
  if ( event.ctrlKey || event.shiftKey ) return;
  if ( !isOn("scrollTooltips") ) return;
  // A locked tooltip under the mouse scrolls on its own.
  if ( event.target instanceof Element && event.target.closest(".locked-tooltip") ) return;
  const part = scrollableTooltipPart();
  if ( !part ) return;

  let delta = event.deltaY;
  if ( event.deltaMode === WheelEvent.DOM_DELTA_LINE ) delta *= 16;
  else if ( event.deltaMode === WheelEvent.DOM_DELTA_PAGE ) delta *= part.clientHeight;

  event.preventDefault();
  event.stopPropagation();
  part.scrollTop += delta;

  // dnd5e fades the bottom of long descriptions; drop the fade once the end is reached.
  const atEnd = part.scrollTop + part.clientHeight >= part.scrollHeight - 1;
  if ( part.classList.contains("description") ) part.classList.toggle("overflowing", !atEnd);
}
