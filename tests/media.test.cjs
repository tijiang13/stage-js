const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function setup() {
  class Media extends EventTarget {
    constructor(auto) { super(); this.auto = auto; this.paused = true; }
    hasAttribute(name) { return name === 'data-autoplay' && this.auto; }
    play() { this.paused = false; this.dispatchEvent(new Event('play')); return Promise.resolve(); }
    pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  }
  const auto = new Media(true), manual = new Media(false);
  const slides = [{ contains: item => item === auto }, { contains: item => item === manual }];
  const document = new EventTarget(); document.hidden = false;
  const reduced = new EventTarget(); reduced.matches = false;
  let observe;
  class IntersectionObserver { constructor(callback) { observe = callback; } observe() {} }
  const window = {};
  vm.runInNewContext(readFileSync(`${__dirname}/../stage-js/media.js`, 'utf8'), { window, document, IntersectionObserver, Event });
  const manager = window.StageComponents.createMedia({ querySelectorAll: () => [auto, manual] }, reduced);
  const visible = (item, ratio = 1) => observe([{ target: item, isIntersecting: ratio > 0, intersectionRatio: ratio }]);
  visible(auto); visible(manual); manager.activate(slides[0]);
  return { auto, manual, slides, manager, visible, document, reduced };
}

test('overlapping overlays only resume when the final hold is released', () => {
  const { auto, manager } = setup();
  assert.equal(auto.paused, false);
  const releaseOverview = manager.suspend(), releaseViewer = manager.suspend();
  assert.equal(auto.paused, true);
  releaseOverview(); assert.equal(auto.paused, true);
  releaseViewer(); assert.equal(auto.paused, false);
  releaseViewer(); assert.equal(auto.paused, false);
});

test('a user pause survives an overview round trip', () => {
  const { auto, manager } = setup();
  auto.pause(); manager.suspend()();
  assert.equal(auto.paused, true);
});

test('changing slides while enlarged never resumes the hidden source', () => {
  const { auto, manual, manager, slides } = setup();
  const release = manager.suspend();
  manager.activate(slides[1]);
  manager.setIntent(auto, true); release();
  assert.equal(auto.paused, true); assert.equal(manual.paused, true);
});

test('viewer pause intent survives release', () => {
  const { auto, manager } = setup();
  const release = manager.suspend(); manager.setIntent(auto, false); release();
  assert.equal(auto.paused, true);
});

test('manual clips require another explicit play after leaving their slide', () => {
  const { manual, manager, slides } = setup();
  manager.activate(slides[1]); manual.play(); assert.equal(manual.paused, false);
  manager.activate(slides[0]); assert.equal(manual.paused, true);
  manager.activate(slides[1]); assert.equal(manual.paused, true);
});

test('visibility and reduced motion constrain automatic playback', () => {
  const { auto, manager, visible, document, reduced } = setup();
  visible(auto, .2); assert.equal(auto.paused, true);
  visible(auto); assert.equal(auto.paused, false);
  document.hidden = true; document.dispatchEvent(new Event('visibilitychange')); assert.equal(auto.paused, true);
  document.hidden = false; document.dispatchEvent(new Event('visibilitychange')); assert.equal(auto.paused, false);
  reduced.matches = true; reduced.dispatchEvent(new Event('change')); assert.equal(auto.paused, true);
  manager.suspend()(); assert.equal(auto.paused, true);
});

test('unavailable examples pause immediately and preserve their playback choice', () => {
  const { auto, manager } = setup();
  manager.setAvailable(auto, false);
  assert.equal(auto.paused, true);
  assert.equal(manager.getIntent(auto), true);
  manager.suspend()();
  assert.equal(auto.paused, true);
  manager.setAvailable(auto, true);
  assert.equal(auto.paused, false);
});

test('a hidden example cannot start until both availability and overlay holds allow it', () => {
  const { auto, manager } = setup();
  const release = manager.suspend();
  manager.setAvailable(auto, false);
  manager.setIntent(auto, true);
  release();
  assert.equal(auto.paused, true);
  manager.setIntent(auto, false);
  manager.setAvailable(auto, true);
  assert.equal(auto.paused, true);
});

test('an explicit intent update is observable even when the source is already suspended', () => {
  const { auto, manager } = setup();
  const release = manager.suspend();
  let updates = 0;
  auto.addEventListener('stage:mediaintent', () => updates++);
  manager.setIntent(auto, false);
  assert.equal(updates, 1);
  assert.equal(manager.getIntent(auto), false);
  release();
  assert.equal(auto.paused, true);
});
