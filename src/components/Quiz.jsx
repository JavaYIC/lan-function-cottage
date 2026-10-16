import React, { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, CircleHelp, Lightbulb, RotateCcw, SkipForward, X } from 'lucide-react';
import { questions } from '../data/questions.js';
import { topics } from '../data/topics.js';
import { MathText } from './UI.jsx';
import './quiz.css';
import { topicStatus } from '../lib/progress.js';

const questionMap = new Map(questions.map((question) => [question.id, question]));
const topicMap = new Map(topics.map((topic) => [topic.id, topic]));
const modeLabels = { diagnostic: '起点短测', practice: '知识点练习', review: '错题复测' };
const levelLabels = { 1: '简单', 2: '中等', 3: '难' };
const letters = ['A', 'B', 'C', 'D'];
const freshDraft = () => ({ selected: -1, confidence: 'sure', hintCount: 0, submitted: false });

function makeAttemptId() {
  return globalThis.crypto?.randomUUID?.() ?? ['attempt', Date.now(), Math.random().toString(36).slice(2)].join('-');
}

function ErrorTagSelect({ question, attempt, onChange }) {
  const tags = [...new Set([
    question.errorTag, '概念还没理解', '漏了条件或范围', '计算或符号出错', '审题失误', '暂时说不清',
  ].filter(Boolean))];
  return (
    <div className="quiz-error-tag">
      <label htmlFor={'cause-' + attempt.id}>回看这一步，我觉得卡在</label>
      <select id={'cause-' + attempt.id} value={attempt.errorTag || ''} onChange={(event) => onChange(attempt, event.target.value)}>
        <option value="">选一个接近的原因（可跳过）</option>
        {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
      </select>
      <p>这是你的回顾，不会仅凭这一题确定薄弱点。</p>
    </div>
  );
}

function AnswerExplanation({ question, attempt, onErrorTagChange, showSelection = false }) {
  const skipped = Boolean(attempt.skipped);
  const correct = Boolean(attempt.correct) && !skipped;
  return (
    <div className="quiz-explanation">
      <div className={'quiz-feedback ' + (correct ? 'quiz-feedback-correct' : 'quiz-feedback-revisit')} role="status">
        {correct ? <Check size={20} aria-hidden="true" /> : <CircleHelp size={20} aria-hidden="true" />}
        <div>
          <strong>{correct ? '这道题答对了' : skipped ? '先看清这道题的思路' : '一起把这一步理清'}</strong>
          <p>{correct
            ? attempt.hintCount > 0 ? '借助提示完成了，之后用一道新题独立确认。' : attempt.confidence === 'unsure' ? '结果是对的，换种问法再确认会更稳。' : '保留这一步思路，之后再用新题验证。'
            : '看完解析，再检查自己是从哪一步开始卡住的。'}</p>
        </div>
      </div>
      {showSelection ? (
        <p className="quiz-answer-line">
          <span>你的选择</span>
          {skipped || !Number.isInteger(attempt.selected) || attempt.selected < 0
            ? <span>这题先跳过了</span>
            : <MathText text={letters[attempt.selected] + '．' + question.options[attempt.selected]} />}
        </p>
      ) : null}
      <p className="quiz-answer-line">
        <span>正确答案</span>
        <MathText text={letters[question.answer] + '．' + question.options[question.answer]} />
      </p>
      <h3>一步一步看</h3>
      <ol className="quiz-steps">
        {question.explanation.map((step, index) => (
          <li key={question.id + '-step-' + index}><MathText text={step} /></li>
        ))}
      </ol>
      {!correct ? <ErrorTagSelect question={question} attempt={attempt} onChange={onErrorTagChange} /> : null}
    </div>
  );
}

function SessionResults({ session, onExit, onLearn, onErrorTagChange, progressAttempts }) {
  const answers = session.answers || [];
  const validAnswers = answers.filter((attempt) => questionMap.has(attempt.qid));
  const independent = validAnswers.filter((attempt) =>
    attempt.correct && !attempt.skipped && attempt.confidence === 'sure' && !attempt.hintCount).length;
  const revisit = validAnswers.filter((attempt) => !attempt.correct || attempt.skipped || attempt.confidence === 'unsure' || attempt.hintCount > 0).length;
  const groups = new Map();
  validAnswers.forEach((attempt) => {
    const question = questionMap.get(attempt.qid);
    if (!groups.has(question.topicId)) groups.set(question.topicId, []);
    groups.get(question.topicId).push(attempt);
  });
  const suggestions = [...groups.entries()].map(([topicId, attempts]) => {
    const needsPractice = attempts.some((attempt) => !attempt.correct || attempt.skipped);
    const neededHelp = attempts.some((attempt) => attempt.hintCount > 0 || attempt.confidence === 'unsure');
    const status=topicStatus(topicId,progressAttempts.length ? progressAttempts : validAnswers);
    return { topicId, topic: topicMap.get(topicId), attempts, needsPractice, neededHelp, status };
  }).sort((a, b) => Number(b.needsPractice) - Number(a.needsPractice) ||
    (a.topic?.order || 0) - (b.topic?.order || 0));
  const firstSuggestion = suggestions[0];
  const allMastered = suggestions.length > 0 && suggestions.every(s=>s.status.mastered);

  return (
    <section className="quiz-page quiz-results" aria-labelledby="quiz-results-title">
      <div className="quiz-topbar">
        <button className="btn btn-ghost quiz-back" onClick={onExit}><ArrowLeft size={18} aria-hidden="true" />返回知识地图</button>
        <span className="quiz-topbar-note">{modeLabels[session.mode] || '练习'} · 已完成</span>
      </div>
      <div className="page-intro quiz-results-intro">
        <h1 id="quiz-results-title">{allMastered?'本轮知识点，已经点亮。':'从这一轮，找到继续的方向'}</h1>
        <p>{allMastered?'简单、中等、难各 3 道均已独立答对，回到知识地图查看掌握标志。':'每种难度各 3 道，全部独立答对后点亮知识点。'}</p>
      </div>
      <div className="quiz-result-counts" aria-label="本轮练习记录">
        <div><strong>{validAnswers.length}</strong><span>本轮完成</span></div>
        <div><strong>{independent}</strong><span>有把握且无提示答对</span></div>
        <div><strong>{revisit}</strong><span>建议回看</span></div>
      </div>
      <div className="quiz-results-grid">
        <section className="quiz-result-section" aria-labelledby="quiz-next-title">
          <div className="quiz-section-heading">
            <h2 id="quiz-next-title">接下来练什么</h2><span>按知识点安排</span>
          </div>
          <div className="quiz-suggestions">
            {suggestions.map(({ topicId, topic, attempts, needsPractice, neededHelp, status }) => (
              <article className="quiz-suggestion" key={topicId}>
                <div className="quiz-suggestion-copy">
                  <span className={'quiz-status ' + (status.mastered ? 'quiz-status-mastered' : needsPractice ? 'quiz-status-practice' : '')}>
                    {status.mastered ? <><Check size={16} aria-hidden="true"/>已掌握</> : needsPractice ? '建议补练' : '继续分层练习'}
                  </span>
                  <h3>{topic?.title || topicId}</h3>
                  <p>{status.detail}</p>
                </div>
                <button className="btn btn-ghost quiz-suggestion-button" onClick={() => onLearn(topicId)}>
                  {needsPractice ? '去补一补' : '回看知识点'}<ArrowRight size={17} aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
          {firstSuggestion ? (
            <button className="btn btn-primary quiz-main-result-action" onClick={() => allMastered?onExit():onLearn(firstSuggestion.topicId)}>
              {allMastered?'查看地图掌握标志':`从${firstSuggestion.topic?.shortTitle || '这个知识点'}继续`}<ArrowRight size={18} aria-hidden="true" />
            </button>
          ) : null}
        </section>
        <aside className="quiz-results-note">
          <Lightbulb size={23} aria-hidden="true" />
          <h2>{allMastered?'三种难度，都通过了':'三种难度，逐步掌握'}</h2>
          <p>{allMastered?'这枚掌握标志来自 9 道不同题目的独立作答。之后也可以通过错题回访继续巩固。':'简单、中等、难各 3 道题，独立答对后分别计入进度。看过提示或不太确定的题，再独立做一次。'}</p>
          <p>错题和跳过的题，是这一轮留下的线索。可以慢慢补，不需要一次解决全部。</p>
          <button className="btn btn-outline" onClick={onExit}><RotateCcw size={17} aria-hidden="true" />回到知识地图</button>
        </aside>
      </div>
      <section className="quiz-review-section" aria-labelledby="quiz-review-title">
        <div className="quiz-section-heading"><h2 id="quiz-review-title">回看这一轮</h2><span>展开查看答案与解析</span></div>
        {validAnswers.map((attempt, index) => {
          const question = questionMap.get(attempt.qid);
          const topic = topicMap.get(question.topicId);
          const correct = attempt.correct && !attempt.skipped;
          return (
            <details className="quiz-review-item" key={attempt.id || attempt.qid + '-' + index}>
              <summary>
                <span className="quiz-review-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="quiz-review-name">{topic?.shortTitle || topic?.title || '函数练习'}</span>
                <span className={'quiz-review-result ' + (correct ? 'quiz-review-correct' : '')}>
                  {attempt.skipped ? '先跳过' : correct ? '答对' : '待回看'}
                  {correct && attempt.confidence === 'unsure' ? ' · 不太确定' : ''}
                  {correct && attempt.hintCount > 0 ? ' · 用过提示' : ''}
                </span>
                <ChevronDown size={18} className="quiz-review-chevron" aria-hidden="true" />
              </summary>
              <div className="quiz-review-body">
                <div className="quiz-review-stem"><MathText text={question.stem} /></div>
                <p className="quiz-source">{question.source.label}</p>
                <AnswerExplanation question={question} attempt={attempt} onErrorTagChange={onErrorTagChange} showSelection />
              </div>
            </details>
          );
        })}
      </section>
    </section>
  );
}

export default function Quiz({ session, onSessionChange, onAttempt, onExit, onLearn, progressAttempts=[] }) {
  const liveSession = useRef(session);
  const submissionLock = useRef(null);
  liveSession.current = session;
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
  }, [session?.id, session?.index]);
  const saveSession = (nextSession) => {
    liveSession.current = nextSession;
    onSessionChange(nextSession);
  };
  const updateErrorTag = (attempt, errorTag) => {
    const current = liveSession.current;
    const savedAttempt = (current.answers || []).find((item) => item.id === attempt.id);
    if (!savedAttempt || (savedAttempt.errorTag || '') === errorTag) return;
    const updated = { ...savedAttempt, errorTag: errorTag || undefined };
    onAttempt(updated);
    saveSession({ ...current, answers: current.answers.map((item) => item.id === updated.id ? updated : item) });
  };

  if (!session?.qids?.length) {
    return (
      <section className="quiz-page quiz-empty">
        <CircleHelp size={32} aria-hidden="true" /><h1>这一轮还没有题目</h1>
        <p>回到知识地图，选一个知识点开始练习。</p>
        <button className="btn btn-primary" onClick={onExit}>返回知识地图</button>
      </section>
    );
  }
  const index = Math.max(0, session.index || 0);
  const total = session.qids.length;
  if (index >= total) {
    return <SessionResults session={session} onExit={onExit} onLearn={onLearn} onErrorTagChange={updateErrorTag} progressAttempts={progressAttempts}/>;
  }
  const question = questionMap.get(session.qids[index]);
  if (!question) {
    return (
      <section className="quiz-page quiz-empty">
        <h1>这道题暂时无法读取</h1><p>返回知识地图，重新开始这一轮即可。</p>
        <button className="btn btn-primary" onClick={onExit}>返回知识地图</button>
      </section>
    );
  }
  const topic = topicMap.get(question.topicId);
  const diagnostic = session.mode === 'diagnostic';
  const draft = { ...freshDraft(), ...session.draft };
  const currentAttempt = (session.answers || []).find((attempt) => attempt.qid === question.id);
  const submitted = Boolean(draft.submitted || currentAttempt);
  const selected = submitted && currentAttempt ? currentAttempt.selected : draft.selected;
  const hintCount = submitted && currentAttempt ? currentAttempt.hintCount : draft.hintCount;
  const confidence = submitted && currentAttempt ? currentAttempt.confidence : draft.confidence;
  const displayedProgress = submitted ? index + 1 : index;
  const updateDraft = (changes) => {
    const current = liveSession.current;
    if (current.id !== session.id || current.index !== session.index || current.draft?.submitted) return;
    saveSession({ ...current, draft: { ...freshDraft(), ...current.draft, ...changes } });
  };
  const submit = (skipped = false) => {
    const current = liveSession.current;
    // A stale double tap must never submit or skip the following question.
    if (current.id !== session.id || current.index !== session.index) return;
    const currentDraft = { ...freshDraft(), ...current.draft };
    const key = current.id + ':' + index + ':' + question.id;
    if (currentDraft.submitted || submissionLock.current === key ||
      (current.answers || []).some((attempt) => attempt.qid === question.id)) return;
    if (!skipped && (!Number.isInteger(currentDraft.selected) || currentDraft.selected < 0 || currentDraft.selected > 3)) return;
    submissionLock.current = key;
    const attempt = {
      id: makeAttemptId(), qid: question.id, topicId: question.topicId, level: question.level,
      selected: skipped ? -1 : currentDraft.selected,
      correct: !skipped && currentDraft.selected === question.answer,
      confidence: currentDraft.confidence === 'unsure' ? 'unsure' : 'sure',
      hintCount: diagnostic ? 0 : Math.min(currentDraft.hintCount || 0, question.hints.length),
      skipped, mode: current.mode, sessionId: current.id, at: Date.now(),
    };
    onAttempt(attempt);
    saveSession({
      ...current, answers: [...(current.answers || []), attempt],
      index: diagnostic ? index + 1 : index,
      draft: diagnostic ? freshDraft() : { ...currentDraft, selected: attempt.selected, submitted: true },
    });
  };
  const nextQuestion = () => {
    const current = liveSession.current;
    if (current.id !== session.id || current.index !== session.index) return;
    if (!(current.answers || []).some((attempt) => attempt.qid === question.id)) return;
    saveSession({ ...current, index: index + 1, draft: freshDraft() });
  };

  return (
    <section className="quiz-page" aria-labelledby="quiz-title">
      <div className="quiz-topbar">
        <button className="btn btn-ghost quiz-back" onClick={onExit}><ArrowLeft size={18} aria-hidden="true" />返回知识地图</button>
        <div className="quiz-progress-copy" aria-live="polite"><span>{modeLabels[session.mode] || '知识点练习'}</span><strong>第 {index + 1} / {total} 题</strong></div>
      </div>
      <progress className="quiz-progress" value={displayedProgress} max={total} aria-label={'已完成 ' + displayedProgress + ' 道，共 ' + total + ' 道'} />
      <div className="page-intro quiz-screen-intro">
        <h1 id="quiz-title" className="quiz-question-heading">{diagnostic ? '先找到你的起点' : '把这一步，练得更清楚'}</h1>
        <p>{diagnostic ? '不会也没关系，这能帮我们安排接下来的学习。' : '先独立想一想，需要时再逐步打开提示。'}</p>
      </div>
      <div className="quiz-layout">
        <div className="quiz-question-panel" key={question.id}>
          <div className="quiz-question-meta"><span className="quiz-eyebrow">{topic?.shortTitle || topic?.title || '函数练习'}</span><span>{levelLabels[question.level]} · {question.source.label}</span></div>
          <div className="quiz-stem"><MathText text={question.stem} /></div>
          <fieldset className="quiz-options" disabled={submitted}>
            <legend className="quiz-visually-hidden">请选择一个答案</legend>
            {question.options.map((option, optionIndex) => {
              const isSelected = selected === optionIndex;
              const isCorrectAnswer = !diagnostic && submitted && question.answer === optionIndex;
              const isWrongSelection = !diagnostic && submitted && isSelected && question.answer !== optionIndex;
              return (
                <label key={question.id + '-' + optionIndex} className={['quiz-option', isSelected && 'quiz-option-selected', isCorrectAnswer && 'quiz-option-correct', isWrongSelection && 'quiz-option-wrong'].filter(Boolean).join(' ')}>
                  <input className="quiz-option-input" type="radio" name={'answer-' + session.id + '-' + index} value={optionIndex} checked={isSelected} onChange={() => updateDraft({ selected: optionIndex })} />
                  <span className="quiz-option-letter" aria-hidden="true">{letters[optionIndex]}</span>
                  <span className="quiz-option-text"><MathText text={option} /></span>
                  {isCorrectAnswer ? <Check size={20} className="quiz-option-mark" aria-label="正确答案" /> : null}
                  {isWrongSelection ? <X size={20} className="quiz-option-mark" aria-label="你选择的答案不正确" /> : null}
                </label>
              );
            })}
          </fieldset>
          {!submitted ? (
            <>
              <div className="quiz-confidence" aria-label="作答把握">
                <span>这题的把握</span>
                <div className="quiz-confidence-options">
                  <button className={confidence === 'sure' ? 'quiz-confidence-active' : ''} aria-pressed={confidence === 'sure'} onClick={() => updateDraft({ confidence: 'sure' })}>有把握</button>
                  <button className={confidence === 'unsure' ? 'quiz-confidence-active' : ''} aria-pressed={confidence === 'unsure'} onClick={() => updateDraft({ confidence: 'unsure' })}>不太确定</button>
                </div>
              </div>
              <div className="quiz-question-actions">
                <button className="btn btn-primary" disabled={selected < 0} onClick={() => submit(false)}>{diagnostic ? index === total - 1 ? '提交并查看建议' : '提交，下一题' : '提交答案'}<ArrowRight size={18} aria-hidden="true" /></button>
                <button className="btn btn-ghost quiz-skip" onClick={() => submit(true)}><SkipForward size={17} aria-hidden="true" />这题先跳过</button>
              </div>
            </>
          ) : (
            <>
              {currentAttempt ? <AnswerExplanation question={question} attempt={currentAttempt} onErrorTagChange={updateErrorTag} /> : null}
              <div className="quiz-question-actions quiz-next-actions"><button className="btn btn-primary" onClick={nextQuestion}>{index === total - 1 ? '查看本轮建议' : '继续下一题'}<ArrowRight size={18} aria-hidden="true" /></button></div>
            </>
          )}
        </div>
        <aside className="quiz-guide-panel">
          <span className="quiz-guide-icon">{diagnostic ? <CircleHelp size={25} aria-hidden="true" /> : <Lightbulb size={25} aria-hidden="true" />}</span>
          <h2>{diagnostic ? '不用准备，按真实感觉作答' : '卡住了，可以一点点打开提示'}</h2>
          <p>{diagnostic ? '这一轮先不提示、不即时公布答案。做完后一起看，哪一步值得优先补。' : '先自己想一会儿。提示会从方向开始，逐步给到关键步骤；用过提示也会保留在这次记录里。'}</p>
          {!diagnostic ? (
            <div className="quiz-hints">
              {question.hints.slice(0, Math.max(0, hintCount || 0)).map((hint, hintIndex) => (
                <div className="quiz-hint" key={question.id + '-hint-' + hintIndex}><span>提示 {hintIndex + 1}</span><MathText text={hint} /></div>
              ))}
              {!submitted && hintCount < question.hints.length ? (
                <button className="btn btn-outline quiz-hint-button" onClick={() => updateDraft({ hintCount: Math.min((liveSession.current.draft?.hintCount || 0) + 1, question.hints.length) })}>
                  <Lightbulb size={17} aria-hidden="true" />{hintCount ? '再看一步提示' : '给我一点提示'}<span>{hintCount + 1} / {question.hints.length}</span>
                </button>
              ) : !submitted ? <p className="quiz-hints-complete">提示已全部展开，试着把思路连起来。</p> : null}
            </div>
          ) : (
            <ul className="quiz-guide-list"><li>没学过或暂时不会，可以跳过。</li><li>有答案但拿不准，选“不太确定”。</li><li>没有倒计时，可以慢慢想。</li></ul>
          )}
          <div className="quiz-pause-note"><span>可以暂停</span><p>返回地图后，这轮进度会保留在当前浏览器；下次可接着完成。</p></div>
        </aside>
      </div>
    </section>
  );
}
