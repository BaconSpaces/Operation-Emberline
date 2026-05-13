---
name: testing-operation-emberline
description: Test Operation Emberline game features end-to-end via local dev server. Use when verifying UI, camera, movement, or admin panel changes.
---

# Testing Operation Emberline

## Local Dev Setup

1. `cd` into the repo and run `npm install` if needed
2. Start dev server: `npx vite --port 5176` (port may auto-increment if in use)
3. Open the game in Chrome at the assigned localhost URL

## Game Flow

- The game starts on a title screen with a **Deploy** button
- Clicking Deploy starts the match (sets `state.status = "running"`)
- After Deploy, the game timer counts down and bots spawn
- The camera uses a **fallback aim** system when pointer lock is unavailable (common in testing environments)
- `canUseFallbackLook()` gates mouse aim on: `state.status === 'running' && state.player.alive && !state.admin.open`

## Key Testing Patterns

### Camera & Movement
- Camera tracking can be verified by moving the mouse and observing the 3D view changing
- WASD movement requires the browser to have keyboard focus — click somewhere on the page first (Deploy button counts)
- Use `hold_key` action (not `key`) for sustained movement since the game reads continuous key-down state
- The green ramp near spawn is a good visual landmark for verifying position changes

### Admin Panel
- Admin panel opens/closes with the **backtick** (`` ` ``) key (xdotool key name: `grave`)
- `isAdmin` defaults to `true` in `src/core/config.js`
- Admin panel has tabs: Player, Weapons, Bots, Match, Debug
- Player tab has: God mode, No-clip, Speed, Gravity, Teleport, Heal, Give ammo

### Weapons Testing
- Gun Game mode prevents manual weapon switching — use Admin > Weapons tab to equip specific weapons
- The Longwatch M32 has high recoil, useful for camera roll testing
- Ammo count in the HUD changes when shots are fired (good for verifying click/fire works)

## Environment Notes

- Pointer lock typically fails in the testing environment, so fallback aim is used
- xdotool key events may not always map correctly to browser KeyboardEvent codes — use console-based verification as backup
- To instrument the camera for measurement, add `window.__testCamera = camera` after `scene.add(camera)` in `src/main.js` (remove before committing)
- The `npm run build` command runs Vite build — use it for pre-PR verification

## Build Verification

```bash
npm run build
```

Expect a chunk size warning for the main JS bundle (>500 KB) — this is normal and not an error.
