/**
 * Chat Card Button Labels: the "Configure Labels" dialog that picks which chat card buttons
 * show a text label. The labels themselves are drawn by CSS (see applyButtonLabels in settings.mjs).
 */

import { BUTTON_ACTIONS, MODULE } from "./constants.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ButtonLabelsConfig extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: "dst-button-labels-config",
    classes: ["dst-button-labels-config"],
    tag: "form",
    window: {
      title: "Chat Card Button Labels",
      icon: "fa-solid fa-tags",
      contentClasses: ["standard-form"]
    },
    position: { width: 400 },
    form: {
      handler: ButtonLabelsConfig.#onSubmit,
      closeOnSubmit: true
    },
    actions: {
      all: ButtonLabelsConfig.#onAll,
      none: ButtonLabelsConfig.#onNone
    }
  };

  static PARTS = {
    form: { template: `modules/${MODULE}/templates/button-labels.hbs` },
    footer: { template: "templates/generic/form-footer.hbs" }
  };

  /** @override */
  async _prepareContext() {
    const chosen = game.settings.get(MODULE, "buttonLabelActions") ?? {};
    return {
      actions: Object.entries(BUTTON_ACTIONS).map(([key, label]) => ({
        key, label, checked: chosen[key] !== false
      })),
      buttons: [{ type: "submit", icon: "fa-solid fa-floppy-disk", label: "Save Changes" }]
    };
  }

  /** Tick every box. */
  static #onAll() {
    this.element.querySelectorAll("input[type=checkbox]").forEach(i => i.checked = true);
  }

  /** Untick every box. */
  static #onNone() {
    this.element.querySelectorAll("input[type=checkbox]").forEach(i => i.checked = false);
  }

  /** Save the ticked buttons. */
  static async #onSubmit(event, form, formData) {
    const data = formData.object;
    const value = Object.fromEntries(Object.keys(BUTTON_ACTIONS).map(k => [k, !!data[k]]));
    await game.settings.set(MODULE, "buttonLabelActions", value);
  }
}
