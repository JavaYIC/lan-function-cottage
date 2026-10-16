import assert from 'node:assert/strict';
import katex from 'katex';
import { questions } from '../src/data/questions.js';
import { topics } from '../src/data/topics.js';

assert.equal(topics.length, 8);
assert.equal(questions.length, 72);
assert.equal(questions.filter(q => q.diagnostic).length, 12);
assert.equal(new Set(questions.map(q => q.id)).size, questions.length);
const topicIds = new Set(topics.map(t => t.id));
for (const t of topics) {
  assert.equal(questions.filter(q => q.topicId === t.id).length, 9, t.id);
  for (const level of [1,2,3]) assert.equal(questions.filter(q=>q.topicId===t.id && q.level===level).length,3,`${t.id} level ${level}`);
  for (const id of t.prerequisites) assert(topicIds.has(id), `Unknown prerequisite ${id}`);
}
for (const q of questions) {
  assert(topicIds.has(q.topicId));
  assert.equal(q.options.length, 4, q.id);
  assert.equal(new Set(q.options).size, 4, `Duplicate options: ${q.id}`);
  assert(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, q.id);
  assert.equal(q.hints.length, 3, q.id);
  assert(q.explanation.length > 0, q.id);
  assert.equal(q.source.kind, 'original', q.id);
}
let formulas = 0;
function visit(value) {
  if (typeof value === 'string') {
    assert(!/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(value), 'Unexpected control character');
    for (const match of value.matchAll(/\$([^$]+)\$/g)) {
      katex.renderToString(match[1], { throwOnError: true, strict: 'error', trust: false });
      formulas++;
    }
  } else if (Array.isArray(value)) value.forEach(visit);
  else if (value && typeof value === 'object') Object.values(value).forEach(visit);
}
visit(topics); visit(questions);
console.log(`Content check passed: ${topics.length} topics, ${questions.length} original questions, 12 diagnostic questions, ${formulas} formulas.`);
