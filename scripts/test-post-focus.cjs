const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'experiences.js'), 'utf8');
function scene(focus, page = 'post') {
  const body = {}, supplement = {};
  const document = {activeElement: body, addEventListener() {}};
  const next = {disabled: true, focus() {document.activeElement = this;}};
  const skip = {remove() {if (document.activeElement === this) document.activeElement = body;}};
  document.activeElement = {skip, supplement, body}[focus];
  const main = {
    querySelectorAll() {return [];},
    querySelector(selector) {
      if (selector === '[data-exp="skip-post-motion"]') return skip;
      if (selector === '[data-action="journey-next"]') return next;
      return null;
    }
  };
  const context = {document, main, state: {page}, OrbitPhoto: require('../experience-core.js')};
  vm.createContext(context);
  vm.runInContext(source, context);
  context.finishPostMotion();
  return {document, next, skip, supplement, body};
}
let checks = 0;
function test(name, run) {run(); checks++; console.log('PASS ' + name);}
test('finishing a focused skip moves focus to the next action', () => {
  const s = scene('skip');
  assert.equal(s.next.disabled, false);
  assert.equal(s.document.activeElement, s.next);
});
test('finishing an animation preserves supplement focus', () => {
  const s = scene('supplement');
  assert.equal(s.next.disabled, false);
  assert.equal(s.document.activeElement, s.supplement);
});
test('finishing an animation does not steal focus from the page', () => {
  const s = scene('body');
  assert.equal(s.document.activeElement, s.body);
});
test('a completion on another page does not alter its focus', () => {
  const s = scene('skip', 'mission');
  assert.equal(s.next.disabled, true);
  assert.equal(s.document.activeElement, s.skip);
});
console.log(`${checks} post-focus scenarios passed`);
