import { questions } from '../data/questions.js';

export const STORAGE_KEY = 'function-study:v1';
export const DAY = 86_400_000;
export const emptyProgress = () => ({ version: 1, attempts: [], readTopics: [], session: null });

export function isIndependent(a) {
  return a.correct === true && !a.skipped && a.confidence === 'sure' && a.hintCount === 0;
}

export function latestByQuestion(attempts) {
  const result = new Map();
  for (const a of [...attempts].sort((x, y) => x.at - y.at)) result.set(a.qid, a);
  return [...result.values()];
}

export function topicStatus(topicId, attempts, questionBank = questions) {
  const topicQuestions = questionBank.filter(q => q.topicId === topicId);
  const ids = new Set(topicQuestions.map(q => q.id));
  const latest = latestByQuestion(attempts.filter(a => ids.has(a.qid)));
  const passed = new Set(latest.filter(isIndependent).map(a => a.qid));
  const levels = [1,2,3].map(level => {
    const items = topicQuestions.filter(q => q.level === level);
    const completed = items.filter(q => passed.has(q.id)).length;
    return {level,label:{1:'简单',2:'中等',3:'难'}[level],total:items.length,completed,mastered:items.length===3 && completed===3};
  });
  const completed = levels.reduce((sum,level) => sum + level.completed,0);
  const mastered = levels.every(level => level.mastered);
  const progress = {mastered,completed,total:topicQuestions.length,levels};
  if (mastered) return {...progress,key:'mastered',label:'已掌握',detail:'简单、中等、难各 3 道题均已独立答对，知识地图已点亮。'};
  if (!latest.length) return {...progress,key:'new',label:'尚未练习',detail:'简单、中等、难各 3 道，全部独立答对后点亮掌握标志。'};
  const needsPractice = latest.some(a => !isIndependent(a));
  return {...progress,key:needsPractice?'needs':'confirm',label:needsPractice?'建议补练':'正在掌握',detail:`已独立答对 ${completed}/${topicQuestions.length} 道：${levels.map(level=>`${level.label} ${level.completed}/${level.total}`).join('，')}。`};
}

export function getReviewItems(attempts, now = Date.now()) {
  const grouped = new Map();
  for (const a of attempts) {
    if (!grouped.has(a.qid)) grouped.set(a.qid, []);
    grouped.get(a.qid).push(a);
  }
  const items = [];
  for (const [qid, history] of grouped) {
    history.sort((a, b) => a.at - b.at);
    const problemIndex = history.findLastIndex(a => !isIndependent(a));
    const problem = history[problemIndex];
    if (!problem) continue;
    const last = history.at(-1);
    const successes = history.slice(problemIndex + 1).filter(a => a.mode !== 'diagnostic' && isIndependent(a));
    const complete = successes.length >= 2 && successes.at(-1).at - successes[0].at >= DAY;
    const dueAt = successes.length ? successes.at(-1).at + DAY : problem.at;
    items.push({ qid, topicId: last.topicId, problem, last, history, dueAt, complete, due: !complete && dueAt <= now });
  }
  return items.sort((a, b) => Number(b.due) - Number(a.due) || a.dueAt - b.dueAt);
}

export function recommendTopic(topics, attempts) {
  const statuses = topics.map(t => ({ t, s: topicStatus(t.id, attempts) }));
  return statuses.find(({ s }) => s.key === 'needs')?.t || statuses.find(({ s }) => s.key === 'confirm')?.t || statuses.find(({ t, s }) => t.route && s.key === 'new')?.t || topics[0];
}

export function upsertAttempt(attempts, attempt) {
  const index = attempts.findIndex(a => a.id === attempt.id);
  if (index < 0) return [...attempts, attempt];
  return attempts.map((a, i) => i === index ? attempt : a);
}

export function validateProgress(data, questions, topics) {
  if (!data || data.version !== 1 || !Array.isArray(data.attempts) || !Array.isArray(data.readTopics)) throw new Error('备份格式或版本不受支持。');
  if (data.attempts.length > 30_000) throw new Error('备份记录过多，请选择正常的学习备份。');
  const qmap = new Map(questions.map(q => [q.id, q]));
  const tset = new Set(topics.map(t => t.id));
  const attempts = data.attempts.map(a => {
    const q = qmap.get(a?.qid);
    if (!q || typeof a.id !== 'string' || a.id.length > 120 || !Number.isFinite(a.at) || a.at < 0 || !Number.isInteger(a.selected) || a.selected < -1 || a.selected > 3 || !['sure', 'unsure'].includes(a.confidence) || !Number.isInteger(a.hintCount) || a.hintCount < 0 || a.hintCount > 3 || !['diagnostic', 'practice', 'review'].includes(a.mode)) throw new Error('备份含有无效的答题记录。');
    const skipped = !!a.skipped;
    return { id: a.id, qid: q.id, topicId: q.topicId, level: q.level, selected: a.selected, correct: !skipped && a.selected === q.answer, skipped, confidence: a.confidence, hintCount: a.hintCount, mode: a.mode, sessionId: typeof a.sessionId === 'string' ? a.sessionId.slice(0, 120) : '', at: a.at, ...(typeof a.errorTag === 'string' ? { errorTag: a.errorTag.slice(0, 80) } : {}) };
  });
  let session = null;
  const s = data.session;
  if (s && typeof s.id === 'string' && s.id.length <= 120 && ['diagnostic', 'practice', 'review'].includes(s.mode) && Array.isArray(s.qids) && s.qids.length > 0 && s.qids.length <= questions.length && new Set(s.qids).size === s.qids.length && s.qids.every(qid => qmap.has(qid)) && Number.isInteger(s.index) && s.index >= 0 && s.index <= s.qids.length) {
    const matching = latestByQuestion(attempts.filter(a => a.sessionId === s.id && a.mode === s.mode && s.qids.includes(a.qid)));
    const answers = s.qids.map(qid => matching.find(a => a.qid === qid)).filter(Boolean);
    const draft = s.draft || {};
    const priorComplete = s.qids.slice(0,s.index).every(qid => answers.some(a => a.qid === qid));
    const noFutureAnswers = answers.every(a => s.qids.indexOf(a.qid) <= s.index);
    const current = answers.find(a => a.qid === s.qids[s.index]);
    if (priorComplete && noFutureAnswers) session = { id: s.id, mode: s.mode, qids: s.qids, index: s.index, answers, draft: { selected: current?.selected ?? (Number.isInteger(draft.selected) && draft.selected >= -1 && draft.selected <= 3 ? draft.selected : -1), confidence: current?.confidence ?? (draft.confidence === 'unsure' ? 'unsure' : 'sure'), hintCount: current?.hintCount ?? (Number.isInteger(draft.hintCount) && draft.hintCount >= 0 && draft.hintCount <= 3 ? draft.hintCount : 0), submitted: !!current } };
  }
  return { version: 1, attempts, readTopics: [...new Set(data.readTopics.filter(id => tset.has(id)))], session, ...(s && !session ? {sessionWarning:'暂停进度不完整，已保留有效答题历史，请重新开始一组练习。'} : {}) };
}

export function mergeProgress(current, incoming) {
  const attempts = current.attempts.reduce(upsertAttempt,incoming.attempts);
  const sameSession = current.session && incoming.session && current.session.id === incoming.session.id && current.session.qids.join('|') === incoming.session.qids.join('|');
  const chosen = sameSession ? (incoming.session.index > current.session.index ? incoming.session : current.session) : current.session && current.session.index < current.session.qids.length ? current.session : incoming.session || current.session;
  let session = null;
  if (chosen) {
    const unique = latestByQuestion(attempts.filter(a=>a.sessionId===chosen.id && a.mode===chosen.mode));
    const answers = chosen.qids.map(qid=>unique.find(a=>a.qid===qid)).filter(Boolean);
    let index = chosen.index;
    if (chosen.mode === 'diagnostic') while (index < chosen.qids.length && answers.some(a=>a.qid===chosen.qids[index])) index++;
    const answer = answers.find(a=>a.qid===chosen.qids[index]);
    session = {...chosen,index,answers,draft:answer ? {selected:answer.selected,confidence:answer.confidence,hintCount:answer.hintCount,submitted:true} : {...chosen.draft,submitted:false}};
  }
  return {version:1,attempts,readTopics:[...new Set([...current.readTopics,...incoming.readTopics])],session};
}

export function loadProgress(questions, topics) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? validateProgress(JSON.parse(raw), questions, topics) : emptyProgress();
    return { data, warning: data.sessionWarning || '', canSave: true };
  } catch {
    return { data: emptyProgress(), warning: '暂时无法读取本机记录。原记录没有被删除；请检查浏览器存储或导入备份。', canSave: false };
  }
}
