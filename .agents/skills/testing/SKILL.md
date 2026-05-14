---
name: operation-emberline-testing
description: How to test Operation Emberline FPS game features end-to-end using the dev server, browser UI, and console instrumentation.
---

## Environment Setup

1. Run `npm install` in repo root
2. Start dev server: `npx vite --port 5180` (or let Vite auto-select)
3. Open `http://localhost:<port>` in Chrome
4. The game uses Three.js + vanilla JS with Vite HMR

## Testing the Lobby UI

- Lobby auto-shows on page load (no login needed)
- Three tabs: Play, Locker, Battle Pass — click each to verify rendering
- Play tab: 4 mode cards (Gun Game, Free-for-All, Team Skirmish, Wave Survival)
- Locker tab: filter buttons (All, Emblem, Camo, Attachment, Charm, Banner, Card, Title)
- Battle Pass tab: scrollable tier list with progress bar

## Testing Input Controls (ADS/Shoot)

Browser pointer lock may not work in automated testing. Use console instrumentation:

```js
// Prevent context menu interference
document.addEventListener('contextmenu', e => e.preventDefault());

const canvas = document.querySelector('canvas');
const crosshair = document.querySelector('.crosshair');

// Test ADS: right-click mousedown should add 'ads' class to crosshair
canvas.dispatchEvent(new MouseEvent('mousedown', { button: 2, bubbles: true }));
// Check: crosshair.className should contain 'ads'

// Release ADS: right-click mouseup
canvas.dispatchEvent(new MouseEvent('mouseup', { button: 2, bubbles: true }));
// Check: crosshair.className should NOT contain 'ads'

// Left-click should NOT trigger ADS
canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
// Check: crosshair.className should NOT contain 'ads'
```

For verifying shoot: check ammo count in weapon HUD section before/after left-click.

## Testing Match Flow

- Click Deploy on Play tab to start a match
- Use Pause button (top-right) → End match to end
- Lobby should reappear after ~1.2 seconds
- Admin console: press backtick (`) key or click Admin button

## Key DOM Selectors

- Crosshair: `.crosshair` (gains `ads` class during ADS)
- Lobby nav tabs: buttons inside `.lobby-nav`
- Locker filter buttons: buttons with `data-filter` attribute
- Canvas: `document.querySelector('canvas')`
- Weapon ammo: look in `<section>` elements containing weapon name

## Known Quirks

- Right-click in browser shows context menu unless prevented via `contextmenu` event
- Fallback aim mode activates on right-click only (button === 2)
- State is not exposed globally; use DOM observation for testing
- `requestAnimationFrame` callbacks may not resolve in the same console execution — store results in `window.__testResults` and retrieve in a follow-up call
