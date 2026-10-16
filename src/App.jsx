import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Download, FileUp, History, Info, Leaf, LockKeyhole, RotateCcw, X } from 'lucide-react';
import { topics } from './data/topics.js';
import { questions } from './data/questions.js';
import { STORAGE_KEY, getReviewItems, isIndependent, latestByQuestion, loadProgress, mergeProgress, recommendTopic, topicStatus, upsertAttempt, validateProgress } from './lib/progress.js';
import KnowledgeMap from './components/KnowledgeMap.jsx';
import Lesson from './components/Lesson.jsx';
import Quiz from './components/Quiz.jsx';
import GraphLab from './components/GraphLab.jsx';
import { MathText } from './components/UI.jsx';
import ProgressRing from './components/ProgressRing.jsx';

const topicById = new Map(topics.map(t => [t.id, t]));
const questionById = new Map(questions.map(q => [q.id, q]));
const navItems = [['map','学习地图'],['lab','图像实验室'],['review','错题回访'],['records','学习记录']];
const defaultDraft = () => ({ selected: -1, confidence: 'sure', hintCount: 0, submitted: false });

function routeFromHash() {
  const [page = 'map', id = ''] = window.location.hash.replace(/^#\/?/, '').split('/');
  if (page === 'lesson' && topicById.has(id)) return { page, id };
  return { page: ['map','lab','review','records','quiz'].includes(page) ? page : 'map', id: '' };
}

function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => { ref.current.showModal(); }, []);
  return <dialog ref={ref} className="study-dialog" onCancel={onClose} aria-labelledby="dialog-title">
    <div className="dialog-heading"><h2 id="dialog-title">{title}</h2><button className="icon-btn" type="button" aria-label="关闭" onClick={onClose}><X size={22}/></button></div>{children}
  </dialog>;
}

function Backup({ progress, onImport, onClose }) {
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);
  const download = () => {
    const data = JSON.stringify({ format: 'function-study-backup', createdAt: new Date().toISOString(), data: progress }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = `function-study-${new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'})}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('备份已生成，请保存浏览器下载的 JSON 文件。');
  };
  const importFile = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 8_000_000) throw new Error('文件过大，请选择学习站导出的 JSON 备份。');
      const parsed = JSON.parse(await file.text());
      if (parsed.format !== 'function-study-backup') throw new Error('这不是函数学习站的备份文件。');
      const valid = validateProgress(parsed.data, questions, topics);
      onImport(valid); setMessage(valid.sessionWarning || '备份已合并，已有答题记录会保留。');
    } catch (error) { setMessage(error.message || '读取失败，已有记录未改变。'); }
    event.target.value = '';
  };
  return <Modal title="把学习记录留好" onClose={onClose}>
    <p>进度只保存在这台设备的这个浏览器。换平板、清理浏览器数据前，请先导出备份。</p>
    <div className="backup-actions"><button className="btn btn-primary" onClick={download}><Download size={19}/>导出学习记录</button><button className="btn btn-outline" onClick={() => inputRef.current.click()}><FileUp size={19}/>导入并合并备份</button></div>
    <input ref={inputRef} className="sr-only" type="file" accept="application/json,.json" onChange={importFile}/>
    <p className="muted">备份包含答题、阅读和暂停进度，不含账号信息。建议固定使用同一浏览器，避免无痕模式。</p>
    <p role="status" className="backup-message">{message}</p>
  </Modal>;
}

function Home({ progress, onLearn, onSelect, selected, onStart, onResume }) {
  const topic = topicById.get(selected) || topics[1];
  const active = progress.session && progress.session.index < progress.session.qids.length;
  const hasDiagnostic = progress.attempts.some(a => a.mode === 'diagnostic');
  const mastered = topics.filter(t => topicStatus(t.id, progress.attempts).mastered).length;
  const independent = latestByQuestion(progress.attempts).filter(isIndependent).length;
  const pending = getReviewItems(progress.attempts).filter(item => !item.complete).length;
  const features = topic.id === 'domain' ? ['根式、分式与对数的限制','多个条件取交集','避免漏掉分母不为零'] : topic.rules.slice(0,3).map(rule => rule.text);
  return <>
    <div className="home-intro"><div><div className="home-kicker"><span/>函数专题 · 安徽 2027</div><h1>把函数，<em>学清楚。</em></h1><p>从一个薄弱点开始，把知识连起来。</p></div><div className="intro-action"><button className="btn btn-primary diagnostic-cta" onClick={() => active && progress.session.mode === 'diagnostic' ? onResume() : onStart('diagnostic')}>{active && progress.session.mode === 'diagnostic' ? '继续上次短测' : hasDiagnostic ? '再做一次短测' : '开始 12 题短测'}<ArrowRight size={23}/></button><small>约 15 分钟 · 随时可以暂停</small></div></div>
    <section className="learning-overview" aria-label="学习进度概览">
      <div className="overview-main"><ProgressRing completed={independent} total={questions.length} size={60}/><div><span>独立答对</span><strong>{independent}<small> / {questions.length} 题</small></strong></div></div>
      <div className="overview-metric"><span>知识点已点亮</span><strong>{mastered}<small> / {topics.length}</small></strong><span className="overview-dots" aria-hidden="true">{topics.map(t=><i key={t.id} className={topicStatus(t.id,progress.attempts).mastered ? 'complete' : ''}/>)}</span></div>
      <div className="overview-metric"><span>待回访题目</span><strong>{pending}<small> 题</small></strong><span className="overview-caption">{pending ? '每一次回看，都更进一步' : '按照自己的节奏继续'}</span></div>
    </section>
    {active && progress.session.mode !== 'diagnostic' ? <div className="resume-strip"><span><History size={19}/>上次练习已保留，完成了 {progress.session.answers?.length || 0} / {progress.session.qids.length} 题</span><button className="btn btn-ghost" onClick={onResume}>继续练习<ArrowRight size={17}/></button></div> : null}
    <div className="home-workspace"><KnowledgeMap topics={topics} attempts={progress.attempts} selected={selected} onSelect={onSelect}/>
      <aside className="home-aside"><p className="aside-lead">今天，从这里开始</p><h2>{topic.id === 'domain' ? '定义域' : topic.shortTitle}</h2><p className="aside-description">{topic.id === 'domain' ? '先检查哪些 x 能代入，再把条件放在一起。' : topic.summary}</p><div className="aside-rule"/><h3>你会学到</h3><ul className="learn-list">{features.map((text,i) => <li key={i}><MathText text={text}/></li>)}</ul><button className="btn btn-outline enter-lesson" onClick={() => onLearn(topic.id)}>进入知识点<ArrowRight size={19}/></button><div className="aside-rule"/><p className="muted">不确定从哪开始？先做短测。</p></aside>
    </div>
    <section className="study-route"><h2>一条清晰的补弱路线</h2><div className="route-steps">{[['01','概念与定义域','理解函数的本质，检查输入的全部限制。','domain'],['02','图像与单调性','把表达式、图像和性质联系起来。','monotonic'],['03','简单零点','用图像和性质，理解方程的根。','zero']].map(([n,title,desc,id],i) => <React.Fragment key={id}><button className="route-step" onClick={() => onLearn(id)}><span>{n}</span><div><h3>{title}</h3><p>{desc}</p></div></button>{i<2 ? <ArrowRight className="route-arrow" size={28}/> : null}</React.Fragment>)}</div></section>
    <section className="beyond-route"><div><h2>再往前一点</h2><p className="muted">图中的进阶内容，按先修知识逐步加入。</p></div><div className="extension-topics"><span>抽象与复合函数</span><span>周期性与对称性</span><span>分段函数综合零点</span><span>指数与对数综合</span></div><p className="muted">难题已包含部分综合练习，完整进阶专题会按先修知识继续扩展。</p></section>
  </>;
}

function Review({ progress, onStart, onLearn }) {
  const [filter, setFilter] = useState('pending');
  const items = getReviewItems(progress.attempts);
  const visible = items.filter(item => filter === 'all' || !item.complete);
  return <>
    <div className="page-intro"><h1>把错题，变成会做的题。</h1><p>记住错在哪里，再用独立作答和隔天复测确认。</p></div>
    <div className="section-toolbar"><div className="segmented" aria-label="错题筛选"><button aria-pressed={filter==='pending'} onClick={() => setFilter('pending')}>待回访</button><button aria-pressed={filter==='all'} onClick={() => setFilter('all')}>全部记录</button></div>{visible.some(x=>!x.complete) ? <button className="btn btn-primary" onClick={() => onStart('review', null, visible.filter(x => !x.complete).slice(0,8).map(x => x.qid))}>开始一组复测<ArrowRight size={18}/></button> : null}</div>
    {!visible.length ? <div className="empty-state"><Leaf size={36} strokeWidth={1.4}/><h2>{items.length ? '这一轮已通过复测' : '这里会留下需要回访的题'}</h2><p>答错、跳过、看过提示或不太确定的题，都会进入回访记录。</p><button className="btn btn-outline" onClick={() => onStart('diagnostic')}>先做 12 题短测<ArrowRight size={18}/></button></div> : <div className="review-list">{visible.map(item => {
      const q = questionById.get(item.qid), t = topicById.get(q.topicId);
      return <article className="review-item" key={item.qid}><div className="review-meta"><span>{t.shortTitle} · 原创练习</span><span>{item.complete ? '已通过隔天复测' : item.due ? '可以回访了' : '待隔天复测'}</span></div><h3><MathText text={q.stem}/></h3><p className="muted">{item.last.errorTag ? `你记录的错因：${item.last.errorTag}` : `建议检查：${q.errorTag}（可在复测后确认错因）`}</p><div className="review-item-actions"><button className="btn btn-outline" onClick={() => onStart('review', q.topicId, [q.id])}>再做一次<RotateCcw size={16}/></button><button className="btn btn-ghost" onClick={() => onLearn(q.topicId)}>回到知识点<ArrowRight size={17}/></button></div></article>;
    })}</div>}
    <p className="footnote">答对一次会安排隔天再测；至少间隔一天的两次独立正确作答后，才标记通过。重复记忆原题还需配合知识点中的变式练习。</p>
  </>;
}

function Records({ progress, onLearn, onStart }) {
  const latest = latestByQuestion(progress.attempts);
  const independent = latest.filter(isIndependent).length;
  const recommendation = recommendTopic(topics, progress.attempts);
  return <>
    <div className="page-intro"><h1>每一步，都算数。</h1><p>关注独立作答和复测结果，慢慢把知识连起来。</p></div>
    <div className="record-summary"><div><strong>{latest.length}</strong><span>尝试过的不同题目</span></div><div><strong>{independent}</strong><span>最近一次独立答对</span></div><div><strong>{topics.filter(t=>topicStatus(t.id,progress.attempts).mastered).length}</strong><span>已点亮知识点 / {topics.length}</span></div></div>
    <div className="record-recommend"><div><h2>下一步建议：{recommendation.shortTitle}</h2><p className="muted">{topicStatus(recommendation.id,progress.attempts).detail}</p></div><button className="btn btn-primary" onClick={() => onLearn(recommendation.id)}>继续学习<ArrowRight size={18}/></button></div>
    <div className="topic-records">{topics.map(t => {
      const status = topicStatus(t.id, progress.attempts);
      return <div className="topic-record" key={t.id}><div><h3>{t.title}</h3><p className="muted">{status.detail}</p></div><span className={`status-text status-${status.key}`}>{status.label}</span><button className="btn btn-ghost" onClick={() => onStart('practice',t.id)}>练一练<ArrowRight size={16}/></button></div>;
    })}</div>
    <p className="footnote">“已阅读”不代表已掌握。每个知识点简单、中等、难各 3 道题均需独立答对；看过提示、跳过或不太确定的题，需要再独立完成。重复作答同一题只计一次。</p>
    <details className="source-details"><summary>教材、题源与备考范围</summary><p>当前含 {topics.length} 个微知识点、{questions.length} 道原创练习；每个知识点简单、中等、难各 3 道。12 道诊断题包含在题库中。练习针对人教 A 版函数基础编写，所有题均标注原创，没有将自编题标成高考真题。历年真题与模拟题尚未收录。</p><p>安徽 2027 年具体卷别尚待当年官方安排；当前内容按函数基础能力组织，含导数的综合题不在首版检测范围内。</p><a href="https://www.pep.com.cn/xw/zt/px/2019/shuxue/" target="_blank" rel="noopener noreferrer">人教 A 版教材章节介绍</a><p>进度存于当前浏览器；清理数据或更换设备前请导出备份。</p></details>
  </>;
}

export default function App({ onLock }) {
  const [initial] = useState(() => loadProgress(questions,topics));
  const [progress,setProgress] = useState(initial.data);
  const [storageWarning,setStorageWarning] = useState(initial.warning);
  const [storageReadable,setStorageReadable] = useState(initial.canSave !== false);
  const [route,setRoute] = useState(routeFromHash);
  const [selected,setSelected] = useState('domain');
  const [backupOpen,setBackupOpen] = useState(false);
  const [pendingStart,setPendingStart] = useState(null);
  const mainRef = useRef(null);
  useEffect(() => { const handler = () => setRoute(routeFromHash()); window.addEventListener('hashchange',handler); return () => window.removeEventListener('hashchange',handler); },[]);
  useEffect(() => {
    if (!storageReadable) return;
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(progress)); setStorageWarning(''); }
    catch { setStorageWarning('当前浏览器无法保存进度。离开前请通过“备份”导出记录。'); }
  },[progress,storageReadable]);
  useEffect(() => { window.scrollTo({top:0,behavior:'instant'}); mainRef.current?.focus({preventScroll:true}); },[route.page,route.id]);
  const navigate = (page,id='') => { window.location.hash = `/${page}${id ? `/${id}` : ''}`; };
  const learn = id => navigate('lesson',id);
  const resume = () => navigate('quiz');
  const begin = (mode,topicId,explicitQids,level) => {
    let qids = explicitQids?.length ? explicitQids : mode==='diagnostic' ? questions.filter(q=>q.diagnostic).map(q=>q.id) : questions.filter(q=>q.topicId===topicId && (!level || q.level===level)).sort((a,b)=>a.level-b.level).map(q=>q.id);
    if (!qids.length) return;
    const current = progress.session;
    if (current && current.index < current.qids.length) {
      if (current.mode===mode && current.qids.join('|')===qids.join('|')) return resume();
      return setPendingStart({mode,qids});
    }
    startFresh(mode,qids);
  };
  const startFresh = (mode,qids) => { setProgress(p=>({...p,session:{id:crypto.randomUUID(),mode,qids,index:0,answers:[],draft:defaultDraft()}})); setPendingStart(null); navigate('quiz'); };
  const saveAttempt = attempt => setProgress(p=>({...p,attempts:upsertAttempt(p.attempts,attempt)}));
  const importBackup = data => {
    setProgress(p=>mergeProgress(p,data));
    setStorageReadable(true);
  };
  const activeNav = route.page==='lesson'||route.page==='quiz' ? 'map' : route.page;
  return <>
    <header className="app-header"><div className="header-inner"><a className="brand" href="#/map" aria-label="澜的函数小屋，返回学习地图"><span className="brand-f">f</span><span>澜的函数小屋</span></a><nav aria-label="主要导航">{navItems.map(([id,label])=><a key={id} href={`#/${id}`} aria-current={activeNav===id?'page':undefined}>{label}</a>)}</nav><div className="header-tools"><button className="backup-button" onClick={()=>setBackupOpen(true)}><Download size={19}/><span>备份</span></button>{onLock && <button className="backup-button" onClick={onLock}><LockKeyhole size={17}/><span>锁定</span></button>}</div></div></header>
    <main ref={mainRef} tabIndex={-1} className={`app-main page-${route.page}`}>
      {storageWarning ? <div className="storage-warning" role="status"><Info size={19}/><span>{storageWarning}</span><button className="btn btn-ghost" onClick={()=>setBackupOpen(true)}>备份</button></div> : null}
      {route.page==='map' ? <Home progress={progress} selected={selected} onSelect={setSelected} onLearn={learn} onStart={begin} onResume={resume}/> : null}
      {route.page==='lesson' ? <Lesson key={route.id} topicId={route.id} onBack={()=>navigate('map')} onPractice={(id,level)=>begin('practice',id,undefined,level)} onLab={()=>navigate('lab')} onRead={id=>setProgress(p=>({...p,readTopics:[...new Set([...p.readTopics,id])]}))} readTopics={progress.readTopics} attempts={progress.attempts}/> : null}
      {route.page==='quiz' ? progress.session ? <Quiz session={progress.session} onSessionChange={session=>setProgress(p=>({...p,session}))} onAttempt={saveAttempt} onExit={()=>navigate('map')} onLearn={learn} progressAttempts={progress.attempts}/> : <div className="empty-state"><h1>从一个小问题开始</h1><button className="btn btn-primary" onClick={()=>begin('diagnostic')}>开始 12 题短测<ArrowRight size={19}/></button></div> : null}
      {route.page==='lab' ? <GraphLab onPractice={id=>begin('practice',id)} onBack={()=>navigate('map')}/> : null}
      {route.page==='review' ? <Review progress={progress} onStart={begin} onLearn={learn}/> : null}
      {route.page==='records' ? <Records progress={progress} onLearn={learn} onStart={begin}/> : null}
    </main>
    <footer className="app-footer"><span>澜的函数小屋</span><span>人教 A 版 · 安徽 2027 备考</span><span>进度保存在本机 · 记得备份</span></footer>
    {backupOpen ? <Backup progress={progress} onImport={importBackup} onClose={()=>setBackupOpen(false)}/> : null}
    {pendingStart ? <Modal title="开始另一组练习？" onClose={()=>setPendingStart(null)}><p>上次暂停的题目进度会被新练习替换，已提交的答题记录会保留。</p><div className="backup-actions"><button className="btn btn-primary" onClick={()=>startFresh(pendingStart.mode,pendingStart.qids)}>开始新练习</button><button className="btn btn-outline" onClick={()=>{setPendingStart(null);resume();}}>继续上次练习</button></div></Modal> : null}
  </>;
}
