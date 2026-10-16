import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Eye, EyeOff, House } from 'lucide-react';
import { ACCESS_DIGEST, ACCESS_KEY, REMEMBER_MS, matchesAccess, validAccess } from '../lib/access.js';
import './access-gate.css';

function readAccess() {
  for (const storage of ['localStorage', 'sessionStorage']) {
    try {
      const entry = validAccess(window[storage].getItem(ACCESS_KEY));
      if (entry) return entry;
    } catch { /* Storage may be unavailable; entering the password still works. */ }
  }
  return null;
}

export default function AccessGate({ children }) {
  const [access, setAccess] = useState(readAccess);
  const [value, setValue] = useState('');
  const [remember, setRemember] = useState(true);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState(false);
  const input = useRef(null);
  const submission = useRef(0);

  function lock() {
    submission.current += 1;
    for (const storage of ['localStorage', 'sessionStorage']) {
      try { window[storage].removeItem(ACCESS_KEY); } catch { /* Do not touch learning records. */ }
    }
    setAccess(null); setValue(''); setError(''); setVisible(false); setBusy(false); setStorageWarning(false);
  }

  useEffect(() => {
    if (!access) return;
    const checkExpiry = () => { if (access.expiresAt <= Date.now()) lock(); };
    const timeout = setTimeout(checkExpiry, Math.max(0, access.expiresAt - Date.now()));
    window.addEventListener('focus', checkExpiry);
    document.addEventListener('visibilitychange', checkExpiry);
    const sync = e => { if (e.key === ACCESS_KEY) setAccess(readAccess()); };
    window.addEventListener('storage', sync);
    return () => { clearTimeout(timeout); window.removeEventListener('focus', checkExpiry); document.removeEventListener('visibilitychange', checkExpiry); window.removeEventListener('storage', sync); };
  }, [access]);

  async function submit(e) {
    e.preventDefault();
    if (busy || !value) return;
    const current = ++submission.current;
    setBusy(true); setError('');
    try {
      const matched = await matchesAccess(value);
      if (current !== submission.current) return;
      if (!matched) {
        setError('密码不对，再试一次。'); input.current?.focus(); input.current?.select(); return;
      }
      const entry = { version: ACCESS_DIGEST, expiresAt: Date.now() + REMEMBER_MS };
      let saved = false;
      for (const storage of ['localStorage', 'sessionStorage']) { try { window[storage].removeItem(ACCESS_KEY); } catch { /* Keep progress untouched. */ } }
      try { window[remember ? 'localStorage' : 'sessionStorage'].setItem(ACCESS_KEY, JSON.stringify(entry)); saved = true; } catch { /* Continue in memory. */ }
      setStorageWarning(!saved); setValue(''); setAccess(entry);
    } catch { setError('当前浏览器暂时无法验证，请更新浏览器后重试。'); }
    finally { if (current === submission.current) setBusy(false); }
  }

  if (access) return <>{storageWarning && <div className="access-storage-note" role="status">当前浏览器无法记住登录状态，刷新后需重新输入密码。</div>}{children(lock)}</>;
  return <main className="access-page">
    <a className="brand access-brand" href="#/map" aria-label="澜的函数小屋"><span className="brand-f">f</span><h1>澜的函数小屋</h1></a>
    <section className="access-card" aria-label="输入访问密码">
      <span className="access-lock" aria-hidden="true"><House size={24} strokeWidth={1.5}/></span>
      <p className="access-eyebrow">一个小小的学习空间</p>
      <form onSubmit={submit}>
        <label className="access-label" htmlFor="access-password">访问密码</label>
        <div className="access-input-wrap">
          <input ref={input} id="access-password" name="access-password" type={visible ? 'text' : 'password'} autoComplete="current-password" autoCapitalize="none" spellCheck={false} required value={value} onChange={e => { setValue(e.target.value); setError(''); }} aria-invalid={Boolean(error)} aria-describedby={error ? 'access-error' : undefined}/>
          <button className="access-eye" type="button" aria-label={visible ? '隐藏密码' : '显示密码'} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={19}/> : <Eye size={19}/>}</button>
        </div>
        <label className="access-remember"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}/>在此设备记住 7 天</label>
        <div id="access-error" className="access-error" role="alert">{error}</div>
        <button className="btn btn-primary access-submit" type="submit" disabled={busy}>{busy ? '正在验证…' : '进入学习'}<ArrowRight size={19}/></button>
      </form>
      <p className="access-note">学习记录仍保存在当前设备，记得定期备份。</p>
    </section>
    <p className="access-footer">人教 A 版 · 安徽 2027 备考</p>
  </main>;
}
