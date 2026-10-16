import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, ChartNoAxesCombined, CircleCheck, CircleDot, GitBranch, MoveUpRight, Shapes, TrendingUp, Waypoints } from 'lucide-react';
import { topicStatus } from '../lib/progress.js';
import ProgressRing from './ProgressRing.jsx';

const labels = { concept: '函数概念', domain: '定义域', basic: '基本函数', monotonic: '单调性', zero: '函数零点', piecewise: '分段函数', parity: '奇偶性', model: '函数模型' };
const icons = { concept: BookOpen, domain: Waypoints, basic: Shapes, monotonic: TrendingUp, zero: CircleDot, piecewise: GitBranch, parity: MoveUpRight, model: ChartNoAxesCombined };
const ids = ['concept', 'domain', 'basic', 'monotonic', 'zero', 'piecewise', 'parity', 'model'];
const edges = [['concept','domain'], ['domain','basic'], ['basic','monotonic'], ['monotonic','zero'], ['concept','piecewise'], ['piecewise','domain'], ['basic','parity'], ['basic','model']];
const positions = {
  wide: [[9,30],[29.5,30],[50,30],[70.5,30],[91,30],[29.5,73],[55,73],[80.5,73]],
  medium: [[17,15],[50,15],[83,15],[50,48],[83,48],[17,48],[17,81],[50,81]],
  narrow: [[25,10],[75,10],[25,34],[75,34],[75,58],[25,58],[25,82],[75,82]],
};

export default function KnowledgeMap({ topics, attempts, selected, onSelect }) {
  const ref = useRef(null);
  const [layout, setLayout] = useState('medium');
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setLayout(entry.contentRect.width >= 780 ? 'wide' : entry.contentRect.width >= 460 ? 'medium' : 'narrow'));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const points = positions[layout];
  return <section className="map-field" aria-label="函数知识学习地图">
    <div className="map-title-row"><h2>你的函数学习地图</h2><span className="map-legend"><CircleCheck size={18} /> 三档通过即点亮</span></div>
    <div ref={ref} className={`map-stage map-${layout}`}>
      <svg className="map-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs><marker id="map-arrowhead" viewBox="0 0 6 6" refX="5.5" refY="3" markerWidth="1.1" markerHeight="2" orient="auto" markerUnits="userSpaceOnUse"><polygon points="0,0 6,3 0,6" fill="#739e8b"/></marker></defs>
        {edges.map(([from,to]) => {
          const a = points[ids.indexOf(from)], b = points[ids.indexOf(to)];
          const dx=b[0]-a[0],dy=b[1]-a[1];
          const halfWidth=layout==='wide'?8.5:layout==='medium'?14:22;
          const halfHeight=layout==='wide'?9:layout==='medium'?9:6.8;
          const t=Math.min(dx ? halfWidth/Math.abs(dx) : Infinity,dy ? halfHeight/Math.abs(dy) : Infinity);
          const start=[a[0]+dx*t,a[1]+dy*t],end=[b[0]-dx*t,b[1]-dy*t];
          return <path className={from === selected || to === selected ? 'map-edge-active' : ''} key={`${from}-${to}`} markerEnd="url(#map-arrowhead)" d={`M ${start[0]} ${start[1]} C ${start[0]} ${(start[1]+end[1])/2}, ${end[0]} ${(start[1]+end[1])/2}, ${end[0]} ${end[1]}`} />;
        })}
      </svg>
      {ids.map((id, i) => {
        const Icon = icons[id], status = topicStatus(id, attempts);
        const point = points[i];
        return <button type="button" key={id} className={`map-node ${selected === id ? 'selected' : ''} status-${status.key}`} style={{ left: `${point[0]}%`, top: `${point[1]}%` }} onClick={() => onSelect(id)} aria-pressed={selected === id} aria-label={`${labels[id]}，${status.label}，独立答对 ${status.completed}/${status.total} 题`}>
          <ProgressRing completed={status.completed} total={status.total} size={38}><Icon size={21} strokeWidth={1.5}/></ProgressRing><span><strong>{labels[id]}</strong><small>{status.mastered?'已掌握':`独立完成 ${status.completed}/${status.total}`}</small></span>
          {status.mastered ? <CircleCheck className="map-mastery-mark" size={23} strokeWidth={2} aria-hidden="true"/> : null}
        </button>;
      })}
    </div>
    <div className="map-bottom">先理解 <ArrowRight size={17} /> 再练习 <ArrowRight size={17} /> 隔天复测</div>
  </section>;
}
