import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY, emptyProgress, getReviewItems, mergeProgress, topicStatus, upsertAttempt, validateProgress } from '../src/lib/progress.js';
import { questions } from '../src/data/questions.js';
import { topics } from '../src/data/topics.js';

const base = { id:'a', qid:'q1', topicId:'domain', level:1, selected:1, correct:true, confidence:'sure', hintCount:0, skipped:false, mode:'practice', sessionId:'s', at:1000 };
const domainQuestions=questions.filter(q=>q.topicId==='domain');
const pass=(q,i=0)=>({...base,id:`pass-${q.id}-${i}`,qid:q.id,level:q.level,selected:q.answer,at:1000+i});
test('repeating one question never substitutes for nine distinct questions',()=>{
  const q=domainQuestions[0];
  const status=topicStatus('domain',Array.from({length:9},(_,i)=>pass(q,i)));
  assert.equal(status.completed,1);assert.equal(status.mastered,false);
});
test('one missing hard question prevents mastery; the ninth independent answer lights it immediately',()=>{
  const pending=domainQuestions.find(q=>q.level===3);
  const attempts=domainQuestions.filter(q=>q.id!==pending.id).map(pass);
  assert.equal(topicStatus('domain',attempts).mastered,false);
  const complete=topicStatus('domain',[...attempts,pass(pending,20)]);
  assert.equal(complete.key,'mastered');assert.equal(complete.completed,9);
  assert(complete.levels.every(level=>level.completed===3 && level.mastered));
});
test('all simple and medium questions cannot light the hard tier',()=>{
  const status=topicStatus('domain',domainQuestions.filter(q=>q.level!==3).map(pass));
  assert.equal(status.completed,6);assert.equal(status.levels[2].completed,0);assert.equal(status.mastered,false);
});
test('hinted, skipped or uncertain answers require another independent attempt',()=>{
  for(const override of [{hintCount:1},{skipped:true,correct:false},{confidence:'unsure'}]){
    const attempts=domainQuestions.map(pass);attempts[0]={...attempts[0],...override};
    assert.equal(topicStatus('domain',attempts).mastered,false);
    assert.equal(topicStatus('domain',[...attempts,pass(domainQuestions[0],30)]).mastered,true);
  }
});
test('a later incorrect answer removes the mastery mark until corrected',()=>{
  const attempts=domainQuestions.map(pass),q=domainQuestions[0];
  const wrong={...pass(q,30),correct:false,selected:(q.answer+1)%4};
  assert.equal(topicStatus('domain',[...attempts,wrong]).mastered,false);
  assert.equal(topicStatus('domain',[...attempts,wrong,pass(q,40)]).mastered,true);
});
test('old question IDs still contribute, and progress survives backup roundtrip',()=>{
  const attempts=domainQuestions.map(pass);
  const roundtrip=validateProgress(JSON.parse(JSON.stringify({...emptyProgress(),attempts})),questions,topics);
  assert.equal(topicStatus('domain',roundtrip.attempts).mastered,true);
  assert.equal(topicStatus('domain',domainQuestions.filter(q=>Number(q.id.split('-').at(-1))<=5).map(pass)).completed,5);
});
test('mistakes schedule another day after an independent correction', () => {
  const wrong = {...base,correct:false,selected:0};
  const corrected = {...base,id:'b',at:2000};
  assert.equal(getReviewItems([wrong],1500)[0].due,true);
  assert.equal(getReviewItems([wrong,corrected],3000)[0].due,false);
  assert.equal(getReviewItems([wrong,corrected,{...base,id:'c',at:DAY+3000}],DAY+4000)[0].complete,true);
});
test('editing error reason upserts without double scoring', () => {
  const list = upsertAttempt([base],{...base,errorTag:'漏条件'});
  assert.equal(list.length,1); assert.equal(list[0].errorTag,'漏条件');
});
test('a new mistake reopens a previously completed review', () => {
  const list = [{...base,correct:false,selected:0},{...base,id:'b',at:2000},{...base,id:'c',at:DAY+3000},{...base,id:'d',at:DAY+4000,correct:false,selected:0}];
  const item = getReviewItems(list,DAY+5000)[0];
  assert.equal(item.complete,false); assert.equal(item.due,true); assert.equal(item.problem.id,'d');
});
test('backup recomputes correctness and rejects unknown questions', () => {
  const q = questions[0];
  const input = {...emptyProgress(),attempts:[{...base,qid:q.id,topicId:'invalid',selected:q.answer,correct:false}]};
  const valid = validateProgress(input,questions,topics);
  assert.equal(valid.attempts[0].correct,true);
  assert.equal(valid.attempts[0].topicId,q.topicId);
  assert.throws(()=>validateProgress({...input,attempts:[{...base,qid:'unknown'}]},questions,topics));
});
test('backup cannot freeze an unsubmitted question or jump over missing answers', () => {
  const q = questions[0];
  const data = {...emptyProgress(),session:{id:'s',mode:'practice',qids:[q.id],index:0,draft:{submitted:true}}};
  assert.equal(validateProgress(data,questions,topics).session.draft.submitted,false);
  data.session.index=1;
  assert.equal(validateProgress(data,questions,topics).session,null);
});
test('backup merge retains local annotations and can restore incoming paused session', () => {
  const local = {...emptyProgress(),attempts:[{...base,errorTag:'漏条件'}],session:{id:'old',mode:'practice',index:1,qids:['q0'],answers:[]}};
  const incoming = {...emptyProgress(),attempts:[base],session:{id:'s',mode:'practice',index:0,qids:['q1'],answers:[base],draft:{submitted:true}}};
  const merged = mergeProgress(local,incoming);
  assert.equal(merged.attempts[0].errorTag,'漏条件');
  assert.equal(merged.session.id,'s');
  assert.equal(merged.session.answers[0].errorTag,'漏条件');
});
test('same session merge advances to incoming progress with unique answers', () => {
  const first = {...base,qid:'q1'};
  const second = {...base,id:'b',qid:'q2',at:2000};
  const session={id:'s',mode:'practice',qids:['q1','q2','q3'],index:1,answers:[first],draft:{submitted:false}};
  const local={...emptyProgress(),attempts:[first],session};
  const incoming={...emptyProgress(),attempts:[first,second],session:{...session,index:2,answers:[first,second]}};
  const merged=mergeProgress(local,incoming);
  assert.equal(merged.session.index,2); assert.equal(merged.session.answers.length,2);
});
