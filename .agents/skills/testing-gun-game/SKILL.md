---
name: testing-gun-game
description: Test Operation Emberline Gun Game features end-to-end. Use when verifying weapon progression, demotion mechanics, or win conditions.
---

# Testing Gun Game Features

## Environment Setup

1. Start the dev server:
   ```bash
   cd /home/ubuntu/Operation-Emberline && npx vite --host 0.0.0.0
   ```
   The server may auto-select a port (5173-5179+). Note the actual port from the output.

2. Open Chrome and navigate to `localhost:<port>`.

3. Verify the HUD shows "Gun 1/15" (or the expected weapon count) in the top bar.

## Console Instrumentation

To fast-forward weapon progression and simulate events, temporarily add to `src/main.js` after `player.setCurrentWeapon(weapons.currentWeapon);`:
```js
window.__state = state;
window.__weapons = weapons;
```

**Remember to remove this after testing.**

### Useful Console Commands

- **Fast-forward to weapon N** (0-indexed):
  ```js
  window.__state.gunGame.weaponIndex = N;
  window.__weapons.switchTo(N);
  window.__weapons.refillCurrentWeapon();
  ```

- **Advance one weapon tier** (simulates a kill):
  ```js
  window.__weapons.advanceGunGame(); // returns true if ladder complete
  ```

- **Simulate melee death** (triggers demotion):
  ```js
  window.__state.events.emit("player-died", { delay: 2.25, cause: "melee" });
  ```

- **Simulate suicide** (triggers demotion):
  ```js
  window.__state.events.emit("player-died", { delay: 2.25, cause: "suicide" });
  ```

- **Simulate normal combat death** (should NOT trigger demotion):
  ```js
  window.__state.events.emit("player-died", { delay: 2.25, cause: "combat" });
  ```

- **Simulate knife kill for win condition**:
  ```js
  window.__state.events.emit("player-kill", {
    weapon: window.__weapons.currentWeapon,
    victim: { name: "TestBot" },
    source: { type: "player", name: "You" }
  });
  ```

- **Enable God Mode**:
  ```js
  window.__state.player.godMode = true;
  ```

## Key Test Scenarios

### 1. Knife Finale
- Fast-forward to penultimate weapon (index 13 for 15-weapon ladder)
- Advance once more → verify HUD shows final weapon as "Combat Knife" with "MELEE" role
- Simulate knife kill → verify match ends with "Gun Game cleared"

### 2. Melee Demotion
- Advance to Gun 3+ so demotion is visible
- Emit melee death → verify HUD decrements by 1
- Verify "Demoted! Back to [weapon name]" system message appears

### 3. Suicide Penalty
- Advance to Gun 3+ 
- Emit suicide death → verify HUD decrements by 1
- Verify "Demoted!" message appears
- Alternative: actually walk off map edge (y < -12 triggers suicide)

### 4. Negative Test
- Emit combat death → verify weapon tier does NOT change
- Verify NO "Demoted!" message appears

### 5. Floor Check
- Set to Gun 1/15 (index 0), emit melee/suicide death
- Verify weapon stays at Gun 1/15 (no underflow)

## UI Elements to Check

- **Top HUD bar**: Shows "Gun Game" mode, timer, and "Gun X/Y" counter
- **Weapon display** (bottom right): Shows weapon category, name, ammo
- **System messages** (bottom center): Shows advancement/demotion messages
- **Admin panel**: Toggle with backtick (`` ` ``) key. Tabs: Player, Weapons, Bots, Match, Debug
- **Deploy button**: Starts a new match

## Admin Panel

The admin panel (backtick key) provides:
- **Player tab**: God mode, no-clip, speed, teleport locations
- **Weapons tab**: Weapon selection dropdown, tuning sliders, Equip/Unlock/Fill buttons
- **Bots tab**: Difficulty selection, spawn/remove bots
- **Match tab**: Mode selection, timer, restart/end match

Note: The admin weapon dropdown changes the active weapon visually but does NOT update `gunGame.weaponIndex`. Use console commands for proper Gun Game testing.

## Devin Secrets Needed

None — this is a static frontend project with no external API dependencies.
