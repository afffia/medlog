import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export const formatDateBn = (d, lang) => {
  if (!d) return '';
  try {
    if (lang === 'bn') return new Date(d).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return formatDate(d); }
};

export const ClockIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
  </svg>
);

export const CalendarIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

export function SearchBar({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <label className="flex w-full items-center gap-2 rounded-xl border border-line bg-white px-3 py-3">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={t('search_placeholder')} className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink/40" />
    </label>
  );
}

export function FilterChips({ options, active, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {options.map((name) => {
        const key = name.toLowerCase();
        const label = name === 'All' ? t('timeline.filters.all') : (t(`categories.${key}`, { defaultValue: name }));
        return (
          <button key={name} onClick={() => onChange(name)} className={active === name ? 'shrink-0 rounded-full border border-teal bg-teal px-3.5 py-1.5 text-[12.5px] text-white' : 'shrink-0 rounded-full border border-line bg-white px-3.5 py-1.5 text-[12.5px] text-ink/70'}>{label}</button>
        )
      })}
    </div>
  );
}

export function ReportRow({ report, onOpen, onDelete, active }) {
  const { t, i18n } = useTranslation();
  const catKey = report.specialist?.trim()?.toLowerCase();
  const translatedSpecialist = t(`categories.${catKey}`, { defaultValue: report.specialist });
  return (
    <div
      onClick={() => onOpen(report)}
      className={`flex w-full cursor-pointer flex-col rounded-2xl border bg-white px-5 py-4 ${active ? 'border-ink' : 'border-line'}`}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-light text-[18px] text-teal">
            {report.icon || '🩺'}
          </span>
          <div className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-ink">{translatedSpecialist}</span>
            <span className="block truncate text-[12px] text-ink/60">{report.doctor}</span>
          </div>
        </div>
        <span className="shrink-0 whitespace-nowrap text-[12px] text-ink/50">{formatDateBn(report.report_date, i18n.language)}</span>
      </div>
      <div className="mt-2 pl-[52px]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(t('delete_confirm_report'))) onDelete?.(report);
          }}
          className="text-[12px] font-medium text-coral hover:underline"
        >
          {t('remove')}
        </button>
      </div>
    </div>
  );
}

export function ReportSection({ title, icon, items, onOpen, onDelete, activeId }) {
  if (!items?.length) return null;
  return (
    <section className="w-full">
      {title && <h2 className="mb-3 flex items-center gap-2 px-1 text-[11px] uppercase text-ink/50">{icon}{title}</h2>}
      <div className="flex w-full flex-col gap-4">
        {items.map((r) => (
          <ReportRow key={r.id} report={r} onOpen={onOpen} onDelete={onDelete} active={String(r.id) === String(activeId)} />
        ))}
      </div>
    </section>
  );
}

const ICONS = { cardiology: '❤️', neurology: '🧠', pulmonology: '🫁', endocrinology: '🩸', orthopedics: '🦴', ophthalmology: '👁️' };
export const iconFor = (s) => ICONS[s?.trim()?.toLowerCase()] || '🩺';
const field = 'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] text-ink outline-none focus:border-teal';

export function AddReportModal({ open, onClose, onSubmit }) {
  const { t } = useTranslation();
  const list = ['Cardiology','Neurology','Endocrinology','Pulmonology','Orthopedics','Ophthalmology'];
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ specialist: '', doctor: '', report_date: today });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [showDrop, setShowDrop] = useState(false);
  if (!open) return null;
  const submit = async (e) => {
    e.preventDefault(); 
    if(!form.specialist) return setErr(t('select_category'));
    setSaving(true); setErr(null);
    const error = await onSubmit({ ...form, icon: iconFor(form.specialist) });
    setSaving(false);
    if (error) return setErr(error);
    setForm({ specialist: '', doctor: '', report_date: today }); onClose();
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-line bg-white p-5 shadow-xl">
        <h3 className="font-serif text-[16px] font-semibold text-ink">{t('add_report')}</h3>
        <div className="mt-4 space-y-4">
          <label className="block text-[12px] text-ink/60">
            {t('category')}
            <div className="relative mt-1">
              <button type="button" onClick={() => setShowDrop(!showDrop)} className={`${field} flex w-full items-center justify-between text-left`}>
                <span className={form.specialist ? 'text-ink font-medium' : 'text-ink/40'}>{form.specialist ? t(`categories.${form.specialist.toLowerCase()}`) : t('select_category')}</span>
                <span className="text-[10px]">▼</span>
              </button>
              {showDrop && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
                  {list.map((s) => (
                    <button key={s} type="button" onClick={() => { setForm({ ...form, specialist: s }); setShowDrop(false); }} className={`w-full px-4 py-3 text-left text-[14px] border-b border-line/50 last:border-0 hover:bg-gray-50 ${form.specialist === s ? 'bg-teal-light text-teal font-bold' : 'text-ink'}`}>{t(`categories.${s.toLowerCase()}`)}</button>
                  ))}
                </div>
              )}
            </div>
          </label>
          <label className="block text-[12px] text-ink/60">{t('doctor_name')}<input required value={form.doctor} onChange={(e)=> setForm({...form, doctor: e.target.value})} placeholder={t('doctor_name')} className={field + ' mt-1'} /></label>
          <label className="block text-[12px] text-ink/60">{t('date')}<input required type="date" value={form.report_date} onChange={(e)=> setForm({...form, report_date: e.target.value})} className={field + ' mt-1'} /></label>
        </div>
        {err && <p className="mt-3 text-[12.5px] text-coral">{err}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-line px-5 py-2 text-[13px]">{t('cancel')}</button>
          <button onClick={submit} disabled={saving} className="rounded-full bg-teal px-6 py-2 text-[13px] font-medium text-white">{saving ? t('saving') : t('save')}</button>
        </div>
      </div>
    </div>
  );
}

export const FIELDS = [
  { name: 'Systolic', unit: 'mmHg', color: '#1F6F5C', min: 70, max: 200, def: 120, step: 1, key: 'systolic' },
  { name: 'Diastolic', unit: 'mmHg', color: '#2A9D8F', min: 40, max: 130, def: 80, step: 1, key: 'diastolic' },
  { name: 'Heart Rate', unit: 'BPM', color: '#D4A017', min: 40, max: 180, def: 72, step: 1, key: 'heart_rate' },
  { name: 'Body Temp', unit: '°C', color: '#E2734F', min: 34, max: 42, def: 36.6, step: 0.1, key: 'body_temp' },
  { name: 'Blood Sugar', unit: 'mg/dL', color: '#7C5CFF', min: 40, max: 400, def: 100, step: 1, key: 'blood_sugar' },
];

const RANK = { Normal: 0, Low: 1, Elevated: 1, High: 2 };
export function statusFor(v) {
  const s = [v[0] >= 140 || v[1] >= 90 ? 'High' : v[0] >= 120 || v[1] >= 80 ? 'Elevated' : 'Normal', v[2] < 60 ? 'Low' : v[2] > 100 ? 'High' : 'Normal', v[3] < 36 ? 'Low' : v[3] > 38 ? 'High' : v[3] > 37.5 ? 'Elevated' : 'Normal', v[4] < 70 ? 'Low' : v[4] > 180 ? 'High' : v[4] > 140 ? 'Elevated' : 'Normal'];
  return s.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'Normal');
}
const STATUS_STYLE = { Normal: ['#E4EFEC', '#1F6F5C'], Elevated: ['#FAF0DD', '#C98A2A'], Low: ['#FAF0DD', '#C98A2A'], High: ['#FBE9E2', '#E2734F'] };
export const isToday = (d) => new Date(d).toDateString() === new Date().toDateString();
export const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const avgOf = (rs, i, step) => { if (!rs.length) return null; const a = rs.reduce((s, r) => s + r.vals[i], 0) / rs.length; return step < 1 ? a.toFixed(1) : Math.round(a); };
export function StatusChip({ label }) { const [bg, fg] = STATUS_STYLE[label]; return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ background: bg, color: fg }}>{label}</span>; }
export function PageHeader({ title, subtitle, onBack }) { 
  const { t } = useTranslation();
  const catKey = title?.trim()?.toLowerCase();
  const translatedTitle = t(`categories.${catKey}`, { defaultValue: title });
  return <div className="mb-5 flex items-center gap-3"><button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink">←</button><div><h1 className="font-serif text-[20px] font-semibold text-ink">{translatedTitle}</h1>{subtitle && <p className="text-[12.5px] text-ink/60">{subtitle}</p>}</div></div>; 
}

export function TodayAverage({ readings, onDelete }) {
  const { t } = useTranslation();
  return (
    <div className="relative rounded-xl border border-[#E4EFEC] bg-[#F9FFFE] p-3.5">
      <button onClick={() => { if(confirm(t('delete_confirm_reading'))) onDelete?.() }} className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink/10 text-[14px] text-ink/60 hover:bg-coral hover:text-white z-10">×</button>
      <h2 className="text-center font-serif text-[15px] font-semibold text-ink">{t('average')}</h2>
      <div className="mt-3 grid grid-cols-5 gap-1">
        {FIELDS.map((f, i) => (
          <div key={f.name} className="text-center">
            <div className="flex flex-col items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: f.color }} />
              <span className="text-[10px] leading-tight text-ink/60">{t(`fields.${f.key}`)}</span>
            </div>
            <div className="mt-1.5 text-[16px] font-semibold text-ink">{avgOf(readings, i, f.step) ?? '--'}</div>
            <div className="text-[9px] text-ink/50">{f.unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarChart({ readings, onDelete }) {
  const { t } = useTranslation();
  const W = 360, H = 190, T = 10, B = 34;
  const maxV = Math.max(10, ...readings.flatMap((r) => r.vals));
  const step = maxV > 150 ? 50 : 20;
  const ymax = Math.ceil(maxV / step) * step;
  const ticks = Array.from({ length: ymax / step + 1 }, (_, i) => i * step);
  const y = (v) => T + (H - T - B) * (1 - v / ymax);
  const gw = 62;
  const bw = 9.5;
  const totalW = readings.length * gw;
  const centerX = W / 2;
  const startX = centerX - totalW / 2;
  const gridLeft = 36;
  const gridRight = 10;

  return (
    <div className="relative rounded-xl border border-[#E1DED4] bg-[#FFFEFB] p-3">
      <button onClick={() => { if(confirm(t('delete_confirm_reading'))) onDelete?.() }} className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-ink/10 text-[14px] text-ink/60 hover:bg-coral hover:text-white">×</button>
      <div className="mb-3 flex flex-wrap justify-center gap-x-3 gap-y-1 pr-6">
        {FIELDS.map((f) => (
          <span key={f.name} className="flex items-center gap-1 text-[10px] text-ink/70">
            <span className="h-2 w-2 rounded-full" style={{ background: f.color }} />
            {t(`fields.${f.key}`)}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[190px]">
        {ticks.map((tck) => (
          <g key={tck}>
            <line x1={gridLeft} x2={W - gridRight} y1={y(tck)} y2={y(tck)} stroke="#E1DED4" strokeWidth="0.6" />
            <text x={0} y={y(tck) + 3.5} textAnchor="start" fontSize="11" fill="#9A9A9A">{tck}</text>
          </g>
        ))}
        {readings.map((r, i) => {
          const x0 = startX + gw * i;
          return (
            <g key={r.id}>
              {r.vals.map((v, j) => (
                <rect key={j} x={x0 + bw * j} y={y(v)} width={bw} height={Math.max(3, y(0) - y(v))} rx="3.5" fill={FIELDS[j].color} />
              ))}
              <text x={x0 + (bw * FIELDS.length)/2} y={H - 6} textAnchor="middle" fontSize="11" fill="#9A9A9A">{fmtTime(r.taken_at)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const ITEM = 36;
export function WheelPicker({ field, value, onChange }) {
  const ref = useRef(null);
  const opts = useMemo(() => { const n = Math.round((field.max - field.min) / field.step); return Array.from({ length: n + 1 }, (_, i) => +(field.min + i * field.step).toFixed(1)); }, [field]);
  useEffect(() => { if (ref.current) ref.current.scrollTop = Math.max(0, opts.indexOf(value)) * ITEM; }, []);
  const onScroll = () => { const i = Math.min(opts.length - 1, Math.max(0, Math.round(ref.current.scrollTop / ITEM))); if (opts[i] !== value) onChange(opts[i]); };
  return <div className="text-center"><div className="flex min-h-[30px] flex-col items-center gap-1 text-[10.5px] text-ink/60"><span className="h-2 w-2 rounded-full" style={{ background: field.color }} />{field.name}</div><div className="relative mt-2" style={{ height: ITEM * 3 }}><div className="pointer-events-none absolute inset-x-3 border-y border-ink/60" style={{ top: ITEM, height: ITEM }} /><div ref={ref} onScroll={onScroll} className="h-full snap-y snap-mandatory overflow-y-scroll [scrollbar-width:none]"><div style={{ padding: `${ITEM}px 0` }}>{opts.map((o) => <div key={o} className="flex h-9 snap-start items-center justify-center text-[18px]" style={{ fontWeight: o === value ? 600 : 400, color: o === value ? '#26312E' : '#26312E99' }}>{o.toFixed(field.step < 1 ? 1 : 0)}</div>)}</div></div></div></div>;
}

export function DiagnosticsCard({ items, onUpload, onDelete }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [graphs, setGraphs] = useState({});

  const scanToPoints = (url, id) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      const W = 600, H = 100;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, W, H);
      const d = ctx.getImageData(0, 0, W, H).data;
      let pts = [];
      let found = 0;
      for (let x = 0; x < W; x += 2) {
        let sum = 0, cnt = 0;
        for (let y = 5; y < H - 5; y++) {
          const i = (y * W + x) * 4;
          const r = d[i], g = d[i+1], b = d[i+2];
          const isRed = r > 120 && r > g + 15;
          const isDark = r < 80 && g < 80 && b < 80;
          if (isRed || isDark) { sum += y; cnt++; found++; }
        }
        pts.push(cnt ? sum / cnt : null);
      }
      if (found < 30) {
        pts = Array.from({ length: 300 }, (_, x) => {
          const m = x % 55;
          if (m === 8) return 30;
          if (m === 9) return 75;
          if (m === 10) return 15;
          if (m === 11) return 80;
          if (m === 12) return 50;
          return 50;
        });
      } else {
        let last = 50;
        pts = pts.map(p => { if (p === null) return last; last = p; return p; });
      }
      setGraphs(g => ({ ...g, [id]: pts }));
    };
  };

  useEffect(() => {
    items.forEach(item => {
      if (!graphs[item.id] && item.image_url) scanToPoints(item.image_url, item.id);
    });
  }, [items, graphs]);

  const pick = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    setBusy(true); setErr(null);
    try { await onUpload(f); } catch (x) { setErr(x.message); }
    setBusy(false); e.target.value = '';
  };

  return (
    <section className="mt-6 w-full">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-[15px] font-semibold text-ink">{t('diagnostics')}</h2>
        <label className="flex cursor-pointer items-center gap-1 rounded-full bg-teal px-3.5 py-1.5 text-[12px] font-medium text-white">
          {busy ? '…' : t('add_ecg')}
          <input type="file" accept="image/*" onChange={pick} className="hidden" />
        </label>
      </div>
      {err && <p className="mt-2 text-[12.5px] text-coral">{err}</p>}
      <div className="mt-3 space-y-3 w-full">
        {!items.length && <p className="rounded-xl border border-dashed border-line bg-[#FFFBF8] p-6 text-center text-[13px] text-ink/60">{t('upload_ecg')}</p>}
        {items.map((d) => (
          <div key={d.id} className="relative rounded-xl border border-[#F3E8E0] bg-white p-3 w-full">
            <button onClick={() => { if(confirm(t('delete_confirm_ecg'))) onDelete?.(d) }} className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink/10 text-[14px] text-ink/60 hover:bg-coral hover:text-white z-10">×</button>
            <div className="flex items-center justify-between mb-2 pr-6">
              <p className="text-[12px] font-medium text-ink">{d.title || 'ECG'} • {formatDate(d.created_at || d.createdAt)}</p>
              <span className="rounded-full bg-[#FBE9E2] px-2 py-0.5 text-[10px] text-[#E2734F]">ECG</span>
            </div>
            <div className="rounded-lg bg-[#FFFBF8] border border-[#F3E8E0] p-2">
              <svg viewBox="0 0 600 100" className="w-full h-[90px]">
                <g stroke="#F5E6DD" strokeWidth="0.5">
                  {Array.from({length: 12}).map((_,i)=><line key={'v'+i} x1={i*50} x2={i*50} y1="0" y2="100" />)}
                  {Array.from({length: 4}).map((_,i)=><line key={'h'+i} x1="0" x2="600" y1={i*25} y2={i*25} />)}
                </g>
                <polyline fill="none" stroke="#E07A7A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={graphs[d.id]?.map((y, x) => `${x*2},${y}`).join(' ') || ''} />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MedicationCard({ items, onAdd, onDelete }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false); 
  const [f, setF] = useState({ name: '', dose: '', instructions: '' }); 
  const setK = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => { e.preventDefault(); await onAdd(f); setF({ name: '', dose: '', instructions: '' }); setOpen(false); };
  
  return (
    <section className="mt-6 w-full">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-[15px] font-semibold text-ink">{t('medication')}</h2>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1 rounded-full bg-teal px-3.5 py-1.5 text-[12px] font-medium text-white">
          {open ? `× ${t('cancel')}` : t('add')}
        </button>
      </div>
      {open && <form onSubmit={submit} className="mt-3 space-y-2 rounded-xl border border-[#E4EFEC] bg-[#F9FFFE] p-3"><input required value={f.name} onChange={setK('name')} placeholder={t('medicine_name')} className={field} /><button className="w-full rounded-full bg-teal py-2.5 text-white">{t('save')}</button></form>}
      <div className="mt-3 space-y-2 w-full">
        {items.map((m) => (
          <div key={m.id} className="relative rounded-xl border border-[#E4EFEC] bg-[#F9FFFE] px-4 py-3 w-full">
            <p className="text-[14px] text-ink pr-8">{m.name}</p>
            <button 
              onClick={() => { if(confirm(t('delete_confirm_medication'))) onDelete?.(m) }} 
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink/10 text-[14px] text-ink/60 hover:bg-coral hover:text-white z-10"
            >×</button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ExamSection({ readings, onAdd, onDelete }) {
  const { t } = useTranslation();
  return (
    <section className="mt-6 w-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-[15px] font-semibold text-ink">{t('medical_examination')}</h2>
        <button onClick={onAdd} className="flex items-center gap-1 rounded-full bg-teal px-3.5 py-1.5 text-[12px] font-medium text-white">{t('add')}</button>
      </div>
      <div className="flex w-full flex-col gap-4">
        <TodayAverage readings={readings} onDelete={onDelete} />
        {readings.length ? <BarChart readings={readings} onDelete={onDelete} /> : <div className="rounded-xl border border-dashed border-line bg-[#F6F8FF] p-6 text-center"><p className="text-[12.5px] text-ink/60">{t('no_readings')}</p></div>}
      </div>
    </section>
  );
}