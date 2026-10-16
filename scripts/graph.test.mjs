import test from 'node:test';
import assert from 'node:assert/strict';
import { graphValue, graphIntersections } from '../src/lib/graph.js';
const defaults = { type: 'quad', a: 1, h: 0, k: 0, base: 2 };
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-8, `${a} != ${b}`);
test('quadratic direction, vertex, double root and missing intersection', () => {
  const p = { ...defaults, a: -2, h: 3, k: 4 };
  near(graphValue(p,4),2);
  assert.deepEqual(graphIntersections(p,4).xs,[3]);
  assert.equal(graphIntersections(p,5).kind,'none');
  assert.deepEqual(graphIntersections(p,2).xs,[2,4]);
});
test('translated exponential and logarithmic inverse returns original x', () => {
  for (const type of ['exp','log']) for(const base of [.5,2,3]) for(const a of [-2,.5,3]) {
    const p = { ...defaults,type,base,a,h:1,k:-3 };
    for (const x of [1.2,2,4]) near(graphIntersections(p,graphValue(p,x)).xs[0],x);
  }
});
test('asymptote is excluded and logarithmic boundary remains excluded', () => {
  const exp = { ...defaults,type:'exp',a:-2,k:3 };
  assert.equal(graphIntersections(exp,3).kind,'none');
  assert.equal(graphIntersections(exp,4).kind,'none');
  const log = { ...defaults,type:'log',h:2,a:0,k:7 };
  assert.ok(Number.isNaN(graphValue(log,2)));
  near(graphValue(log,3),7);
});
test('zero scale gives a constant with all or no inverse solutions', () => {
  for(const type of ['quad','exp','log']) {
    const p = {...defaults,type,a:0,k:2};
    assert.equal(graphIntersections(p,2).kind,'all');
    assert.equal(graphIntersections(p,0).kind,'none');
  }
});
test('log inverse overflow and underflow are reported instead of invalid boundary points', () => {
  const p = {...defaults,type:'log'};
  assert.equal(graphIntersections(p,2000).kind,'precision');
  assert.equal(graphIntersections(p,-2000).kind,'precision');
});
