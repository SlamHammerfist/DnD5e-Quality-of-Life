# Changelog

## 2.6.0

- GM Change Target After Roll setting (on by default): a crosshairs button on attack, damage and
  healing chat cards replaces the card's targets with your current targets. Attack cards re-check
  hit or miss against the new targets' AC, and the damage tray's Targeted mode applies to them.

## 2.5.0

- Label Roll Bonuses now works on every roll, including damage, healing and recharge rolls, not
  just d20 rolls; a greataxe hit reads `1d12 + 4[Str]`. Labels can never change a roll's damage
  type.
- Damage chat cards list each labelled flat bonus on its own row in the roll breakdown, the same
  way attack rolls show `STR +4` and `PROF +3`.
- Bonuses from active effects are named after the effect again instead of just "Bonus" (broken
  since dnd5e 6.0). Effects on the item being rolled are included too.

## 2.4.0

- GM Sort Monsters by CR setting (on by default): monster results in the compendium browser are
  ordered by Challenge Rating (no CR last), then by name, with a header above each CR.
- Sort Spells by Level headers now match the dnd5e chat card header (red bar, gold border).
- Label Roll Bonuses no longer breaks a situational bonus that already has its own label, such as
  `1d4[Bless]` typed in or added by Roll Messages; the bonus was being dropped from the roll.

## 2.3.0

- GM Auto Kill NPCs setting (on by default): an NPC that drops to 0 hit points is marked dead
  (token overlay) and defeated in combat; healing it above 0 hit points removes both.

## 2.2.0

- Personal Scroll Tooltips Without Locking setting (on by default): the mouse wheel scrolls a
  long tooltip while it is showing, instead of the sheet underneath, so it no longer has to be
  locked with a middle-click first.
- Module title is now "D&D 5e Quality of Life".

## 2.1.0

- Personal Advantage Highlight setting: the d20 roll dialog keeps the Advantage, Normal or
  Disadvantage button highlighted and shows why (e.g. "Disadvantage: Poisoned, Chain Mail"),
  including when advantage and disadvantage cancel out or a mode is forced or blocked.
- Module links now point to the renamed GitHub repository, DnD5e-Quality-of-Life.

## 2.0.0

Rebuilt from scratch for Foundry VTT v14 and D&D 5e 6.0.

- Enable Module master switch.
- GM settings: Hide Prices (Players), Hide Chat Enrichment Menu (Players), Label Roll Bonuses,
  NPC Coin Drops, Remove Electrum, Roll Table Alphabetical Sort, Find Familiar Browser,
  Sort Spells by Level.
- Personal settings: Chat Card Button Labels (with Configure Labels), Container Item Rolls,
  Disable Item Tooltips, Enable Journal Tab, Header Collapse, Item Name Expands.
- Personal Color Blind Mode: red-green safe blue/orange colours for rolls, health bars and damage.
- Journal notes are private to each user and saved on their user account.
