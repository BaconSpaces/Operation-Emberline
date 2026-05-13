# Operation Emberline

Operation Emberline is an original browser-based tactical FPS prototype built with Three.js and Vite. It uses procedural placeholder geometry, generated audio cues, raycast weapons, AI bots, collision volumes, a HUD, game modes, and a development admin menu.

No Call of Duty names, logos, maps, weapon models, sounds, UI, characters, or copied layouts are used.

## Run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Controls

- Mouse: look
- Move mouse over the game: fallback aim if pointer lock is blocked
- Left mouse: fire
- Right mouse: aim down sights (ADS)
- F: backup fire key
- WASD: move
- Shift: sprint
- Space: jump
- C or Ctrl: crouch
- R: reload
- 1-0: switch weapons outside Gun Game
- Tab: scoreboard
- Escape: release pointer lock / pause
- `~`: admin menu

## Weapons

- Sparrow PDW: compact SMG
- VX-9 Carbine: automatic assault rifle
- Hushbreaker SG: close-range shotgun
- Kestrel B3: fast burst rifle
- Bulwark LMG: heavy suppressive weapon
- Longwatch M32: precision sniper rifle
- Arcbolt DMR: marksman rifle
- Sidewinder X2: tactical sidearm
- Viper MP7: rapid-fire machine pistol
- Thunderclap .50: anti-material rifle with extreme damage
- Stormfront AR: low-recoil tactical rifle
- Razorback PDW: lightweight high-mobility SMG
- Ironjaw SG: fully automatic shotgun
- Nightfall SR: suppressed marksman rifle

Each weapon has configurable damage, fire delay, reload time, magazine size, reserve ammo, recoil, spread, range, ADS zoom, ADS spread multiplier, raycast hit detection, muzzle flash, impact effects, and tracer effects.

## Aim System

- Right-click to aim down sights (ADS) for tighter spread, reduced recoil, and magnified view
- Dynamic spread increases while firing and recovers when idle
- Moving increases spread; crouching reduces it
- Each weapon has unique ADS characteristics (zoom level, spread reduction, movement penalty)

## Game Modes

- Gun Game: start with the Sparrow PDW, earn a kill to advance to the next weapon, and clear the full weapon ladder to win.
- Free-for-All: fight hostile rogue bots.
- Team Skirmish: Aegis allies fight Wraith enemies alongside the player.
- Wave Survival: clear escalating enemy waves.

## Progression

Kills award XP, level the player account, and advance the battle pass. Battle pass tiers unlock prototype rewards such as camos, banners, charms, badges, and titles. Progress is stored in the current browser session state.

## Admin Menu

The admin menu is enabled through `GAME_CONFIG.isAdmin` in `src/core/config.js`.

It includes:

- God mode and no-clip
- Heal and give ammo
- Weapon switching and live weapon tuning
- Bot spawning, removal, and difficulty selection
- Match timer and mode changes
- Restart/end match
- Teleport locations
- Gravity and player speed sliders
- Debug collision boxes and FPS display

This is a client-side development console, not production-grade security. For a networked or public game, move admin authorization and privileged actions to a server.

## Project Structure

```text
src/
  core/
    config.js
    Input.js
    math.js
    state.js
  systems/
    AudioSystem.js
    BotManager.js
    Effects.js
    PlayerController.js
    WeaponSystem.js
    World.js
  ui/
    AdminMenu.js
    HUD.js
  main.js
  styles.css
```

## Expansion Notes

- Multiplayer: add an authoritative server, server-side reconciliation, snapshot interpolation, anti-cheat checks, and server-owned admin commands.
- Maps: replace placeholder geometry with optimized GLTF assets and baked lightmaps.
- Bots: add navmesh pathfinding, squad tactics, grenades, suppression, and better cover scoring.
- Weapons: add animation clips, attachments, projectile variants, and advanced recoil patterns.
- Performance: batch static geometry, use instancing for repeated props, and add asset streaming for larger environments.
