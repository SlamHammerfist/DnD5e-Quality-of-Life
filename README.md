# DnD5e QoL

Quality of life tweaks for the D&D 5e system on Foundry VTT v14. Every feature has its own
on/off switch in **Configure Settings → DnD5e QoL**, and **Enable Module** turns them all off at once.

## GM settings (shared by everyone)

| Setting | What it does |
| --- | --- |
| Enable Module | Master switch. When off, every setting below is ignored for everyone. |
| Hide Prices (Players) | Hides item prices on character, NPC and container sheets for players. |
| Hide Chat Enrichment Menu (Players) | Removes the formatting menu above the chat box for players. |
| Label Roll Bonuses | Tags each bonus in a d20 roll with its source, e.g. `1d20 + 4[Str] + 2[Prof] + 1d4[Bless]`. Shows in the roll breakdown too. |
| NPC Coin Drops | Unlinked NPC tokens get coins from the DMG individual treasure tables when placed, based on CR. |
| Auto Kill NPCs | NPCs at 0 HP get the dead overlay and are marked defeated in combat. Healing above 0 removes both. |
| Remove Electrum | Hides electrum on sheets. NPC Coin Drops pays electrum as silver instead. |
| Roll Table Alphabetical Sort | Adds a sort button to roll table sheets. Results go A–Z (ignoring a leading "The") and ranges are rebuilt from weights. |
| Find Familiar Browser | Find Familiar and Wild Companion open the compendium browser with the 2024 Monster Manual ticked. |
| Sort Spells by Level | Spell results in the compendium browser are grouped by level with a header for each. |

## Personal settings (each player chooses)

| Setting | What it does |
| --- | --- |
| Advantage Highlight | In the d20 roll dialog, the Advantage / Normal / Disadvantage button that applies stays highlighted, with a line naming the reason (effects, conditions, stealthy-armour penalty, feats, effect rules). Shows when advantage and disadvantage cancel out too. |
| Chat Card Button Labels | Shows text next to the icons on chat card buttons. **Configure Labels** picks which buttons. |
| Color Blind Mode | Red-green colour-blind-safe colours: blue for good (hits, successes, healing, full health), orange for bad (misses, failures, damage, low health). Covers chat cards, sheets and token health bars. |
| Container Item Rolls | Click a consumable's name in a container to use it. |
| Disable Item Tooltips | Turns off the item hover tooltips on actor sheets. |
| Enable Journal Tab | Adds a Journal tab to character and NPC sheets for your own private notes. |
| Header Collapse | Adds a toggle to each item section header. Collapsed sections stay collapsed. |
| Item Name Expands | Clicking an item's name opens its details instead of using it. Click the picture to use it. |
| Scroll Tooltips Without Locking | The mouse wheel scrolls a long tooltip (item and spell descriptions) while it is showing, so you don't have to lock it with a middle-click first. |

## Requirements

- Foundry VTT v14
- D&D 5e system 6.0 or later
- Find Familiar Browser needs the 2024 Monster Manual module (`dnd-monster-manual`).
