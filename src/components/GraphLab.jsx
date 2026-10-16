import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Minus, Plus, RotateCcw } from 'lucide-react';
import { MathText } from './UI.jsx';
import { graphValue, graphIntersections, formatCoordinate as fmt } from '../lib/graph.js';
import './graph-lab.css';

const TYPES = [{ id: 'quad', label: '二次函数' }, { id: 'exp', label: '指数函数' }, { id: 'log', label: '对数函数' }];
const MODES = [{ id: 'x', label: '给 x 求 y' }, { id: 'y', label: '给 y 求 x' }, { id: 'free', label: '自由点 (x, y)' }];
const INITIAL = { type: 'quad', a: 1, h: 0, k: 0, base: 2 };
const WINDOW = { cx: 0, cy: 1, span: 10 };
const LEFT = 58, TOP = 28, SIZE = 540;
const raw = String.raw;
const tex = n => { const s = fmt(n); if (!s.includes('e')) return s; const [m,e] = s.split('e'); return `${Number(m)}\\times10^{${Number(e)}}`; };

function Numeric({ label, value, onChange, validate = () => true }) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const n = Number(draft);
  const valid = draft.trim() !== '' && Number.isFinite(n) && Math.abs(n) <= 1e6 && validate(n);
  return <label className="lab-number" htmlFor={id}><span>{label}</span><input id={id} aria-label={label} aria-describedby={!valid ? `${id}-error` : undefined} type="number" step="any" value={draft} aria-invalid={!valid} onChange={e => {
    const text = e.target.value; setDraft(text); const next = Number(text);
    if (text.trim() !== '' && Number.isFinite(next) && Math.abs(next) <= 1e6 && validate(next)) onChange(next);
  }} onBlur={() => { if (!valid) setDraft(String(value)); }} />{!valid && <small id={`${id}-error`}>{label === '底数 b' ? '底数需大于 0 且不等于 1。' : '请输入绝对值不超过一百万的有效数值。'}</small>}</label>;
}

function Parameter({ label, value, onChange, min = -5, max = 5 }) {
  return <div className="lab-parameter"><Numeric label={label} value={value} onChange={onChange}/><input aria-label={`${label}滑块`} type="range" min={Math.min(min, value)} max={Math.max(max, value)} step="0.1" value={value} onChange={e => onChange(Number(e.target.value))}/></div>;
}

function equation(p) {
  const inner = p.h === 0 ? 'x' : `(x${p.h > 0 ? '-' : '+'}${tex(Math.abs(p.h))})`;
  const offset = p.k === 0 ? '' : `${p.k > 0 ? '+' : '-'}${tex(Math.abs(p.k))}`;
  if (p.a === 0) return `$y=${tex(p.k)}$`;
  const a = p.a === 1 ? '' : p.a === -1 ? '-' : `${tex(p.a)}\\cdot `;
  return `$y=${a}${p.type === 'quad' ? `${inner}^2` : p.type === 'exp' ? `(${tex(p.base)})^{${inner}}` : `\\log_{${tex(p.base)}}${inner}`}${offset}$`;
}

function Plot({ p, mode, x, y, point, intersections, view, onPoint, compare }) {
  const svgRef = useRef(null);
  const clip = useId().replaceAll(':', '');
  const xMin = view.cx - view.span / 2, xMax = view.cx + view.span / 2;
  const yMin = view.cy - view.span / 2, yMax = view.cy + view.span / 2;
  const sx = v => LEFT + (v - xMin) / view.span * SIZE;
  const sy = v => TOP + (yMax - v) / view.span * SIZE;
  const visible = ([px, py]) => Number.isFinite(px) && Number.isFinite(py) && px >= xMin && px <= xMax && py >= yMin && py <= yMax;
  const idealStep = view.span / 10;
  const step = 10 ** Math.floor(Math.log10(idealStep));
  const ratio = idealStep / step;
  const tickStep = step * (ratio <= 1 ? 1 : ratio <= 2 ? 2 : ratio <= 5 ? 5 : 10);
  const ticks = (min, max) => Array.from({ length: Math.min(30, Math.floor((max - Math.ceil(min / tickStep) * tickStep) / tickStep) + 1) }, (_, i) => Number((Math.ceil(min / tickStep) * tickStep + i * tickStep).toPrecision(12)));
  function path(params) {
    let result = '', connected = false;
    const start = params.type === 'log' ? Math.max(xMin, params.h + view.span * 1e-8) : xMin;
    if (start >= xMax) return '';
    for (let i = 0; i <= 700; i++) {
      const vx = params.type === 'log' && xMin <= params.h
        ? params.h + Math.exp(Math.log(start - params.h) + (Math.log(xMax - params.h) - Math.log(start - params.h)) * i / 700)
        : start + (xMax - start) * i / 700;
      const vy = graphValue(params, vx);
      if (!Number.isFinite(vy)) { connected = false; continue; }
      const screenY = Math.max(-100000, Math.min(100000, sy(vy)));
      result += `${connected ? 'L' : 'M'}${sx(vx).toFixed(2)},${screenY.toFixed(2)} `; connected = true;
    }
    return result;
  }
  function drag(e) {
    const matrix = svgRef.current.getScreenCTM();
    if (!matrix) return;
    const at = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
    const nx = Number((xMin + (Math.max(LEFT, Math.min(LEFT + SIZE, at.x)) - LEFT) / SIZE * view.span).toFixed(3));
    const ny = Number((yMax - (Math.max(TOP, Math.min(TOP + SIZE, at.y)) - TOP) / SIZE * view.span).toFixed(3));
    onPoint(nx, ny);
  }
  const xAxis = Math.max(TOP, Math.min(TOP + SIZE, sy(0)));
  const yAxis = Math.max(LEFT, Math.min(LEFT + SIZE, sx(0)));
  return <svg ref={svgRef} className="graph-canvas lab-draggable" viewBox="0 0 640 610" role="img" aria-label="可触控函数坐标图，拖动图中位置调整观察点，也可使用下方坐标输入框" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); drag(e); }} onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) drag(e); }} onPointerUp={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}>
    <defs><clipPath id={clip}><rect x={LEFT} y={TOP} width={SIZE} height={SIZE}/></clipPath></defs>
    <rect className="graph-plot-background" x={LEFT} y={TOP} width={SIZE} height={SIZE}/>
    {ticks(xMin, xMax).map(v => <g key={`x${v}`}><line className="graph-grid-line" x1={sx(v)} x2={sx(v)} y1={TOP} y2={TOP + SIZE}/><text className="graph-tick" x={sx(v)} y={xAxis > TOP + SIZE - 25 ? xAxis - 10 : xAxis + 22} textAnchor="middle">{fmt(v)}</text></g>)}
    {ticks(yMin, yMax).filter(v => v !== 0).map(v => <g key={`y${v}`}><line className="graph-grid-line" x1={LEFT} x2={LEFT + SIZE} y1={sy(v)} y2={sy(v)}/><text className="graph-tick" x={yAxis < LEFT + 40 ? yAxis + 8 : yAxis - 12} y={sy(v) + 5} textAnchor={yAxis < LEFT + 40 ? 'start' : 'end'}>{fmt(v)}</text></g>)}
    {yMin <= 0 && yMax >= 0 && <line className="graph-axis" x1={LEFT} x2={LEFT + SIZE} y1={sy(0)} y2={sy(0)}/>}
    {xMin <= 0 && xMax >= 0 && <line className="graph-axis" x1={sx(0)} x2={sx(0)} y1={TOP} y2={TOP + SIZE}/>}
    <text className="graph-axis-label" x={LEFT + SIZE + 12} y={xAxis + 6}>x</text><text className="graph-axis-label" x={yAxis + 12} y={TOP - 10}>y</text>
    <g clipPath={`url(#${clip})`}>
      {compare && <path className="lab-reference" d={path({ ...INITIAL, type: p.type, base: p.base })}/>}
      {p.type !== 'quad' && <line className="graph-guide" x1={p.type === 'log' ? sx(p.h) : LEFT} x2={p.type === 'log' ? sx(p.h) : LEFT + SIZE} y1={p.type === 'log' ? TOP : sy(p.k)} y2={p.type === 'log' ? TOP + SIZE : sy(p.k)}/>}
      <path className="graph-curve" d={path(p)}/>
      {mode === 'y' && <line className="lab-target" x1={LEFT} x2={LEFT + SIZE} y1={sy(y)} y2={sy(y)}/>}
      {point && visible(point) && <><line className="lab-projection" x1={sx(point[0])} x2={sx(point[0])} y1={sy(0)} y2={sy(point[1])}/><line className="lab-projection" x1={sx(0)} x2={sx(point[0])} y1={sy(point[1])} y2={sy(point[1])}/><circle className="lab-touch-point" cx={sx(point[0])} cy={sy(point[1])} r="10"/><text className="graph-point-label" x={sx(point[0]) + (point[0] > view.cx ? -14 : 14)} y={sy(point[1]) - 16} textAnchor={point[0] > view.cx ? 'end' : 'start'}>P ({fmt(point[0])}, {fmt(point[1])})</text></>}
      {mode === 'y' && intersections.xs.filter(v => visible([v, y])).map(v => <circle key={v} className="lab-touch-point" cx={sx(v)} cy={sy(y)} r="8"/>)}
      {p.type === 'quad' && p.a !== 0 && visible([p.h, p.k]) && <circle className="graph-special-point" cx={sx(p.h)} cy={sy(p.k)} r="5"/>}
    </g>
  </svg>;
}

export default function GraphLab({ onPractice, onBack }) {
  const [p, setP] = useState(INITIAL);
  const [mode, setMode] = useState('x');
  const [x, setX] = useState(1);
  const [y, setY] = useState(1);
  const [view, setView] = useState(WINDOW);
  const [compare, setCompare] = useState(false);
  const [guess, setGuess] = useState(null);
  const [verified, setVerified] = useState(false);
  const value = graphValue(p, x);
  const intersections = graphIntersections(p, y);
  const roots = graphIntersections(p, 0);
  const point = mode === 'x' ? Number.isFinite(value) ? [x, value] : null : mode === 'free' ? [x, y] : null;
  const offscreen = point && (Math.abs(point[0] - view.cx) > view.span / 2 || Math.abs(point[1] - view.cy) > view.span / 2);
  const change = (key, v) => { setP(old => ({ ...old, [key]: v })); setGuess(null); setVerified(false); };
  const inverseText = q => q.kind === 'all' ? `定义域内每个 x 都满足，交点有无数个${p.type === 'log' ? `（x > ${fmt(p.h)}）` : ''}。` : q.kind === 'none' ? '没有实数解，水平线与曲线不相交。' : q.kind === 'precision' ? '交点超出当前数值精度，请减小数值或调整底数。' : `x = ${q.xs.map(fmt).join(' 或 ')}（${q.xs.length} 个交点）`;
  const range = p.a === 0 ? `$\\{${tex(p.k)}\\}$` : p.type === 'log' ? raw`$\mathbb R$` : p.a > 0 ? `$${p.type === 'quad' ? '[' : '('}${tex(p.k)},+\\infty)$` : `$(-\\infty,${tex(p.k)}${p.type === 'quad' ? ']' : ')'}$`;
  const increasing = p.a * Math.log(p.base) > 0;
  const monotonic = p.a === 0 ? '常函数，既不严格递增也不严格递减。' : p.type === 'quad' ? `$(-\\infty,${tex(p.h)}]$ 上${p.a > 0 ? '递减' : '递增'}，$[${tex(p.h)},+\\infty)$ 上${p.a > 0 ? '递增' : '递减'}` : `${p.type === 'log' ? `$(${tex(p.h)},+\\infty)$` : raw`$\mathbb R$`} 上${increasing ? '严格递增' : '严格递减'}`;
  function centerPoint() {
    const target = point || (intersections.xs.length ? [intersections.xs[0], y] : [p.h, p.k]);
    if (target.every(Number.isFinite)) setView(v => ({ ...v, cx: target[0], cy: target[1] }));
  }
  return <section className="graph-lab" aria-labelledby="graph-lab-title">
    <button className="btn btn-ghost graph-back" onClick={onBack}><ArrowLeft size={18}/>返回学习</button>
    <header className="graph-heading"><h1 id="graph-lab-title">图像实验室</h1><p className="muted">调参数、拖坐标、反查交点。让每一步变化都看得见。</p></header>
    <div className="graph-tabs" role="group" aria-label="选择函数类型">{TYPES.map(t => <button key={t.id} className={`graph-tab${p.type === t.id ? ' graph-tab-active' : ''}`} aria-pressed={p.type === t.id} onClick={() => { change('type', t.id); setView(WINDOW); }}>{t.label}</button>)}</div>
    <div className="graph-layout">
      <figure className="graph-figure">
        <div className="graph-figure-heading"><MathText text={equation(p)}/><span className="graph-unit-note">横纵轴同比例</span></div>
        <div className="lab-toolbar"><button aria-label="放大坐标系" onClick={() => setView(v => ({ ...v, span: Math.max(0.01, v.span / 2) }))}><Plus size={18}/></button><button aria-label="缩小坐标系" onClick={() => setView(v => ({ ...v, span: Math.min(1e6, v.span * 2) }))}><Minus size={18}/></button><button onClick={() => setView(WINDOW)}>默认视野</button><button onClick={centerPoint}>定位观察点</button><label><input type="checkbox" checked={compare} onChange={e => setCompare(e.target.checked)}/>原函数对照</label></div>
        <Plot p={p} mode={mode} x={x} y={y} point={point} intersections={intersections} view={view} compare={compare} onPoint={(nx, ny) => { if (mode !== 'y') setX(nx); if (mode !== 'x') setY(ny); }}/>
        <div className="lab-pan" role="group" aria-label="平移视野">{[['←', -1, 0, '视野向左'], ['→', 1, 0, '视野向右'], ['↑', 0, 1, '视野向上'], ['↓', 0, -1, '视野向下']].map(([text, dx, dy, label]) => <button key={label} aria-label={label} onClick={() => setView(v => ({ ...v, cx: v.cx + dx * v.span / 4, cy: v.cy + dy * v.span / 4 }))}>{text}</button>)}<span>可缩放，也可平移到图外</span></div>
        <figcaption>{mode === 'x' ? '用手指左右拖动图中位置，观察 x 改变时 y 怎样变化。' : mode === 'y' ? '上下拖动橙色水平线，观察给定 y 对应几个 x。' : '自由拖动橙色点，同时改变 x 和 y，对照它与绿色曲线的位置。'}{compare && ' 灰色虚线是未平移、未伸缩的原函数。'}</figcaption>
        <div className="lab-observation" aria-live="polite"><strong>{mode === 'x' ? `x = ${fmt(x)} → ${Number.isFinite(value) ? `y = ${fmt(value)}` : p.type === 'log' && x <= p.h ? `输入不在定义域内，需要 x > ${fmt(p.h)}` : '函数值超出数值范围'}` : mode === 'y' ? `y = ${fmt(y)}：${inverseText(intersections)}` : `P (${fmt(x)}, ${fmt(y)})：${!Number.isFinite(value) ? '此 x 没有可计算的函数值' : Math.abs(y - value) < 1e-8 * Math.max(1, Math.abs(value)) ? '点在曲线上' : `点在曲线${y > value ? '上方' : '下方'}，同一 x 的曲线 y = ${fmt(value)}`}`}</strong>{offscreen && <p>观察点在当前视野外，点击“定位观察点”查看。</p>}</div>
      </figure>
      <aside className="graph-controls" aria-label="参数与坐标控制">
        <div className="graph-control-heading"><h2>调一调函数</h2><button className="btn btn-ghost graph-reset" onClick={() => { setP({ ...INITIAL, type: p.type }); setX(1); setY(1); setView(WINDOW); setGuess(null); setVerified(false); setCompare(false); }}><RotateCcw size={15}/>复位</button></div>
        <div className="graph-sliders">
          <Parameter label="伸缩与方向 a" value={p.a} onChange={v => change('a', v)}/>
          <Parameter label="水平位置 h" value={p.h} onChange={v => change('h', v)}/>
          <Parameter label="竖直位置 k" value={p.k} onChange={v => change('k', v)}/>
          {p.type !== 'quad' && <><Numeric label="底数 b" value={p.base} onChange={v => change('base', v)} validate={v => v > 0 && v !== 1}/><div className="graph-base-options">{[0.5, 2, 3].map(v => <button key={v} className="graph-base-option" onClick={() => change('base', v)}>{v}</button>)}</div></>}
        </div>
        <p className="graph-small-note">{p.a === 0 ? 'a = 0 时图像退化为水平线；对数式仍保留原定义域。' : p.type === 'quad' ? 'a 决定开口方向和宽窄；h、k 决定顶点位置。滑块可连续调，数字框可直接输入。' : 'a 控制竖直伸缩和翻转，h、k 控制平移；底数 b > 0 且 b ≠ 1。'}</p>
        <section className="lab-coordinate-controls" aria-label="坐标探究"><h2>自己改变 x 和 y</h2><div className="lab-modes" role="group" aria-label="坐标操作模式">{MODES.map(m => <button key={m.id} className={mode === m.id ? 'active' : ''} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</button>)}</div>
          {mode !== 'y' && <Parameter label="横坐标 x" value={x} min={view.cx - view.span / 2} max={view.cx + view.span / 2} onChange={setX}/>}
          {mode !== 'x' && <Parameter label={mode === 'y' ? '目标纵坐标 y' : '纵坐标 y'} value={y} min={view.cy - view.span / 2} max={view.cy + view.span / 2} onChange={setY}/>}
          <p className="graph-small-note">{mode === 'free' ? '自由点的 x、y 可独立改变；只有满足 y = f(x) 时，点才在曲线上。' : mode === 'x' ? '函数确定后，给定合法的 x，y 就由函数关系决定。' : '给定 y 可能对应两个、一个或没有 x，不能总把 y 与 x 一一反推。'}</p>
        </section>
        <div className="graph-properties"><h2>现在的性质</h2><dl><div><dt>定义域</dt><dd><MathText text={p.type === 'log' ? `$(${tex(p.h)},+\\infty)$` : raw`$\mathbb R$`}/></dd></div><div><dt>值域</dt><dd><MathText text={range}/></dd></div>{p.type === 'quad' && p.a !== 0 && <div className="graph-property-wide"><dt>顶点</dt><dd>({fmt(p.h)}, {fmt(p.k)}) · {p.a > 0 ? '开口向上' : '开口向下'}</dd></div>}<div className="graph-property-wide"><dt>单调性</dt><dd><MathText text={monotonic}/></dd></div></dl></div>
        <div className="graph-experiment"><h3>先猜，再验证</h3><p>当前函数有几个实零点？</p><div className="graph-guess-options" role="group" aria-label="预测实零点个数">{[0, 1, 2, 'all'].map(v => <button key={v} className={`graph-guess${guess === v ? ' graph-guess-active' : ''}`} aria-pressed={guess === v} onClick={() => { setGuess(v); setVerified(false); }}>{v === 'all' ? '无数' : `${v} 个`}</button>)}</div><button className="btn btn-primary graph-verify" disabled={guess === null} onClick={() => setVerified(true)}>验证预测</button>{verified && <div className="graph-feedback" role="status"><strong>{guess === (roots.kind === 'all' ? 'all' : roots.kind === 'finite' ? roots.xs.length : roots.kind === 'none' ? 0 : -1) ? '判断正确' : '再对照一次图像'}</strong><p>{inverseText(roots)}</p></div>}</div>
        <button className="btn btn-outline graph-practice" onClick={() => onPractice(p.type === 'quad' ? 'zero' : 'basic')}>去做相关练习<ArrowRight size={18}/></button>
      </aside>
    </div>
  </section>;
}
