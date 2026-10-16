import React, { useId, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  Lightbulb,
  MoveUpRight,
} from 'lucide-react';
import { topics } from '../data/topics.js';
import { topicStatus } from '../lib/progress.js';
import { MathText } from './UI.jsx';
import './lesson.css';

const topicLookup = new Map(topics.map((topic) => [topic.id, topic]));
const graphTopics = new Set(['domain', 'basic', 'monotonic', 'parity', 'zero']);
const groups = {
  A: '函数的概念与表示',
  B: '函数的基本性质',
  C: '基本初等函数',
  D: '函数图象',
  E: '函数与方程',
  F: '函数模型',
};
const tabs = [
  { id: 'intuition', label: '直观理解' },
  { id: 'rules', label: '规则与例题' },
  { id: 'pitfalls', label: '易错提醒' },
];
const emptyLevels = [
  { level: 1, label: '简单', total: 3, completed: 0, mastered: false },
  { level: 2, label: '中等', total: 3, completed: 0, mastered: false },
  { level: 3, label: '难', total: 3, completed: 0, mastered: false },
];

function hasRead(readTopics, topicId) {
  if (readTopics instanceof Set) return readTopics.has(topicId);
  if (Array.isArray(readTopics)) return readTopics.includes(topicId);
  return Boolean(readTopics?.[topicId]);
}

function WorkedExample({ example }) {
  return (
    <section className="lesson-example" aria-labelledby="lesson-example-heading">
      <div className="lesson-section-heading">
        <span className="lesson-section-index">02</span>
        <h2 id="lesson-example-heading">跟着例题走一遍</h2>
      </div>
      <div className="lesson-example-stem">
        <span className="lesson-small-label">例题</span>
        <MathText text={example.stem} />
      </div>
      <p className="lesson-step-note muted">先自己想一想，再逐步展开思路。</p>
      <div className="lesson-steps">
        {example.steps.map((step, index) => (
          <details className="lesson-step" key={`${index}-${step}`}>
            <summary>
              <span className="lesson-step-number">{String(index + 1).padStart(2, '0')}</span>
              <span>展开第 {index + 1} 步</span>
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <div className="lesson-step-body"><MathText text={step} /></div>
          </details>
        ))}
      </div>
      <details className="lesson-answer">
        <summary>
          <Check size={18} aria-hidden="true" />
          <span>核对最终答案</span>
          <ChevronDown size={18} aria-hidden="true" />
        </summary>
        <div className="lesson-answer-body"><MathText text={example.answer} /></div>
      </details>
    </section>
  );
}

export default function Lesson({ topicId, onBack, onPractice, onLab, onRead, readTopics, attempts = [] }) {
  const [activeTab, setActiveTab] = useState('intuition');
  const tabRefs = useRef([]);
  const tabBaseId = useId();
  const topic = topicLookup.get(topicId);

  function handleTabKey(event, index) {
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(tabs[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  if (!topic) {
    return (
      <section className="lesson-page">
        <button className="btn btn-ghost lesson-back" type="button" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" /> 返回知识地图
        </button>
        <h1 className="lesson-title">没有找到这一节</h1>
        <p className="muted">请回到知识地图，重新选择一个知识点。</p>
      </section>
    );
  }

  const isRead = hasRead(readTopics, topic.id);
  const status = topicStatus(topic.id, attempts);
  const levels = status.levels || emptyLevels;
  const prerequisites = topic.prerequisites
    .map((id) => topicLookup.get(id))
    .filter(Boolean);

  return (
    <article className="lesson-page">
      <header className="lesson-header">
        <button className="btn btn-ghost lesson-back" type="button" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" /> 返回知识地图
        </button>
        <h1 className="lesson-title">{topic.title}</h1>
        <p className="page-intro lesson-summary"><MathText text={topic.summary} /></p>
      </header>

      <div className="lesson-layout">
        <div className="lesson-main">
          <div className="lesson-tabs" role="tablist" aria-label="学习内容">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                ref={(element) => { tabRefs.current[index] = element; }}
                className={`lesson-tab${activeTab === tab.id ? ' lesson-tab-active' : ''}`}
                id={`${tabBaseId}-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`${tabBaseId}-panel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => handleTabKey(event, index)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <section
            className="lesson-panel"
            id={`${tabBaseId}-panel-intuition`}
            role="tabpanel"
            aria-labelledby={`${tabBaseId}-tab-intuition`}
            hidden={activeTab !== 'intuition'}
            tabIndex={0}
          >
            <div className="lesson-intuition">
              <div className="lesson-intuition-title"><Lightbulb size={21} aria-hidden="true" /><h2>先建立直觉</h2></div>
              <div className="lesson-intuition-text"><MathText text={topic.intuition} /></div>
            </div>
            <div className="lesson-takeaway">
              <h2>这一节，记住这句话</h2>
              <p><MathText text={topic.takeaway} /></p>
            </div>
            <div className="lesson-preview">
              <h2>带着一个问题往下看</h2>
              <div className="lesson-preview-stem"><MathText text={topic.example.stem} /></div>
              <button className="btn btn-outline" type="button" onClick={() => { setActiveTab('rules'); tabRefs.current[1]?.focus(); }}>
                查看规则与分步例题 <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          </section>

          <section
            className="lesson-panel"
            id={`${tabBaseId}-panel-rules`}
            role="tabpanel"
            aria-labelledby={`${tabBaseId}-tab-rules`}
            hidden={activeTab !== 'rules'}
            tabIndex={0}
          >
            <section className="lesson-rules" aria-labelledby={`${tabBaseId}-rules-heading`}>
              <div className="lesson-section-heading">
                <span className="lesson-section-index">01</span>
                <h2 id={`${tabBaseId}-rules-heading`}>把规则与条件一起记</h2>
              </div>
              <ol className="lesson-rule-list">
                {topic.rules.map((rule, index) => (
                  <li className="lesson-rule" key={rule.text}>
                    <span className="lesson-rule-index" aria-hidden="true">{index + 1}</span>
                    <div className="lesson-rule-content">
                      <div><MathText text={rule.text} /></div>
                      <p className="lesson-caution"><span>注意</span><MathText text={rule.caution} /></p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <WorkedExample example={topic.example} />
          </section>

          <section
            className="lesson-panel"
            id={`${tabBaseId}-panel-pitfalls`}
            role="tabpanel"
            aria-labelledby={`${tabBaseId}-tab-pitfalls`}
            hidden={activeTab !== 'pitfalls'}
            tabIndex={0}
          >
            <div className="lesson-section-heading">
              <span className="lesson-section-index">!</span>
              <h2>做题前，多检查一下</h2>
            </div>
            <ol className="lesson-pitfall-list">
              {topic.pitfalls.map((pitfall, index) => (
                <li key={pitfall}>
                  <span className="lesson-rule-index" aria-hidden="true">{index + 1}</span>
                  <div><MathText text={pitfall} /></div>
                </li>
              ))}
            </ol>
            <div className="lesson-practice-invite">
              <p>带着这些提醒，试试能否独立做对。</p>
              <button className="btn btn-primary" type="button" onClick={() => onPractice(topic.id)}>
                开始 9 题练习 <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>

        <aside className="lesson-sidebar" aria-label="学习安排与教材来源">
          <div className="lesson-sidebar-content">
            <section className="lesson-side-goal">
              <h2>这一节目标</h2>
              <p><MathText text={topic.takeaway} /></p>
              <div className="lesson-duration"><Clock3 size={17} aria-hidden="true" /><span>预计 {topic.estimatedMinutes} 分钟</span></div>
              <div className="lesson-mastery" aria-label="本知识点掌握进度">
                <div className="lesson-mastery-heading">
                  <h2>练习进度</h2>
                  {status.mastered ? (
                    <span className="lesson-mastered"><CheckCircle2 size={17} aria-hidden="true" />已掌握</span>
                  ) : (
                    <span className="lesson-mastery-count">{status.completed || 0} / {status.total || 9}</span>
                  )}
                </div>
                <div className="lesson-levels">
                  {levels.map((entry) => (
                    <button
                      className={`lesson-level-row${entry.mastered ? ' lesson-level-mastered' : ''}`}
                      key={entry.level}
                      type="button"
                      aria-label={`${entry.label}练习，已独立答对 ${entry.completed} 道，共 ${entry.total} 道，开始 ${entry.total} 题练习`}
                      onClick={() => onPractice(topic.id, entry.level)}
                    >
                      <span className="lesson-level-summary">
                        <span>{entry.label}</span>
                        <span className="lesson-level-count">{entry.completed} / {entry.total}</span>
                      </span>
                      <progress
                        className="lesson-level-progress"
                        value={entry.completed}
                        max={entry.total}
                        aria-label={`${entry.label}独立答对进度`}
                      />
                      <span className="lesson-level-action">练 {entry.total} 题<ArrowRight size={16} aria-hidden="true" /></span>
                    </button>
                  ))}
                </div>
                <p className="lesson-mastery-note">每种难度 3 题独立答对后点亮；用过提示或不确定的题需要再独立完成。</p>
              </div>
              <button className="btn btn-primary lesson-side-action" type="button" onClick={() => onPractice(topic.id)}>
                开始 9 题练习 <ArrowRight size={18} aria-hidden="true" />
              </button>
              {graphTopics.has(topic.id) ? (
                <button className="btn btn-outline lesson-side-action" type="button" onClick={() => onLab(topic.id)}>
                  到图象实验室看看 <MoveUpRight size={18} aria-hidden="true" />
                </button>
              ) : null}
              <button
                className={`btn btn-ghost lesson-read-action${isRead ? ' lesson-read-complete' : ''}`}
                type="button"
                onClick={() => onRead(topic.id)}
                disabled={isRead}
              >
                {isRead ? <Check size={18} aria-hidden="true" /> : <BookOpen size={18} aria-hidden="true" />}
                {isRead ? '已阅读' : '标记为已阅读'}
              </button>
            </section>

            {prerequisites.length > 0 ? (
              <section className="lesson-side-section">
                <h2>先修知识</h2>
                <ul className="lesson-prerequisites">
                  {prerequisites.map((prerequisite) => <li key={prerequisite.id}>{prerequisite.shortTitle}</li>)}
                </ul>
              </section>
            ) : null}

            <section className="lesson-side-section lesson-source">
              <h2>教材关联</h2>
              <p>{topic.textbook}</p>
              {topic.sourceLinks.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.label} <ExternalLink size={14} aria-hidden="true" />
                </a>
              ))}
            </section>
          </div>
        </aside>
      </div>
    </article>
  );
}
