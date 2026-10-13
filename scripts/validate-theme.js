import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('packages/web/src/web/hooks/useDarkMode.ts', 'utf8')
  .replace(/^import .*;\n/, '').replace('export function', 'function');

function themeScenario(systemDark, saved = null, storageBlocked = false) {
  let state;
  let manualRef;
  let listener;
  const writes = [];
  const classes = new Set();
  const media = {
    matches: systemDark,
    addEventListener: (_, callback) => { listener = callback; },
    removeEventListener: () => {},
  };
  const context = {
    window: {
      localStorage: {
        getItem: () => { if (storageBlocked) throw new Error('blocked'); return saved; },
        setItem: (key, value) => { if (storageBlocked) throw new Error('blocked'); writes.push([key, value]); },
      },
      matchMedia: () => media,
    },
    document: { documentElement: { classList: {
      toggle: (name, active) => active ? classes.add(name) : classes.delete(name),
    } } },
    useRef: initial => manualRef ||= { current: initial },
    useState: initializer => {
      if (state === undefined) state = initializer();
      return [state, next => { state = next; }];
    },
    useEffect: callback => callback(),
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  const render = () => vm.runInContext('useDarkMode()', context);
  const initial = render();
  return {
    initial, render, writes, classes,
    systemChange: dark => { media.matches = dark; listener(); },
    get state() { return state; },
  };
}

for (const dark of [false, true]) {
  const theme = themeScenario(dark);
  assert.equal(theme.initial.dark, dark, 'First visit follows system theme');
  assert.equal(theme.writes.length, 0, 'System default is not saved as a manual choice');
  theme.systemChange(!dark);
  assert.equal(theme.state, !dark, 'System changes are followed before a manual choice');
  theme.render().toggle();
  assert.equal(theme.state, dark, 'Toggle selects the opposite of the active theme');
  assert.equal(theme.writes[0][1], dark ? 'dark' : 'light');
  theme.systemChange(!dark);
  assert.equal(theme.state, dark, 'Manual choice overrides later system changes');
}
assert.equal(themeScenario(true, 'light').initial.dark, false);
assert.equal(themeScenario(false, 'dark').initial.dark, true);
assert.equal(themeScenario(true, 'invalid').initial.dark, true);
const blocked = themeScenario(true, null, true);
assert.equal(blocked.initial.dark, true, 'Blocked storage still permits system defaults');
blocked.initial.toggle();
assert.equal(blocked.state, false, 'Blocked storage still permits toggling');
console.log('Theme initialization, system changes, saved preferences, toggling, and blocked storage passed.');
