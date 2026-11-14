import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listReports, addReport, deleteReport, listReadings, addReading, listDiagnostics, addDiagnostic, listMedications, addMedication } from '../data';
import { FIELDS, statusFor, isToday, SearchBar, FilterChips, ReportSection, AddReportModal, ClockIcon, CalendarIcon, PageHeader, WheelPicker, StatusChip, ExamSection, DiagnosticsCard, MedicationCard } from '../components/MedicalUI.jsx';

const go = (h) => { location.hash = h; };
const asc = (a, b) => new Date(a.taken_at) - new Date(b.taken_at);
const daysAgo = (d) => (Date.now() - new Date(d)) / 864e5;

function parseRoute(h) {
  if (!h.startsWith('report-')) return null;
  const rest = h.slice(7);
  return rest.endsWith('-add') ? { id: rest.slice(0, -4), add: true } : { id: rest };
}

function ReportsPage() {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try { setReports(await listReports()); } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async (row) => { try { await addReport(row); await load(); return null; } catch (e) { return e.message; } };
  
  const onDelete = async (report) => {
    try {
      await deleteReport(report.id);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch (e) {
      alert(e.message || 'Delete failed');
    }
  };

  const specialists = useMemo(() => [...new Set(reports.map((r) => r.specialist))], [reports]);
  const shown = reports.filter((r) => (filter === 'All' || r.specialist === filter) && (r.specialist + r.doctor).toLowerCase().includes(q.toLowerCase()));

  return (
    <main className="w-full bg-canvas px-6 pb-10 pt-8">
      <div className="w-full">
        <div className="flex w-full items-center justify-between gap-4">
          <h1 className="font-serif text-[20px] font-semibold tracking-tight text-ink">{t('medical_report')}</h1>
          <button onClick={() => setOpen(true)} className="rounded-full bg-teal px-4 py-2 text-[13px] font-medium text-white">{t('add_report')}</button>
        </div>
        <div className="mt-4 w-full"><SearchBar value={q} onChange={setQ} /></div>
        <div className="mt-3 w-full"><FilterChips options={['All', ...specialists]} active={filter} onChange={setFilter} /></div>
        <div className="mt-4 w-full">
          {loading && <p className="px-4 py-10 text-center text-[13px] text-ink/60">{t('common.loading')}</p>}
          {error && <p className="px-4 py-10 text-center text-[13px] text-coral">{error}</p>}
          {!loading && !error && (
            <>
              <ReportSection title={t('timeline.filters.all') !== 'All' ? 'Recent - Last 30 Days' : 'Recent - Last 30 Days'} icon={ClockIcon} items={shown.filter((r) => daysAgo(r.report_date) <= 30)} onOpen={(r)=>go(`report-${r.id}`)} onDelete={onDelete} />
              <div className="mt-6">
                <ReportSection title="Last One Year" icon={CalendarIcon} items={shown.filter((r) => daysAgo(r.report_date) > 30)} onOpen={(r)=>go(`report-${r.id}`)} onDelete={onDelete} />
              </div>
              {!shown.length && <p className="px-4 py-10 text-center text-[13px] text-ink/60">{t('timeline.noReportsInCategory')}</p>}
            </>
          )}
        </div>
      </div>
      <AddReportModal open={open} onClose={() => setOpen(false)} onSubmit={add} specialists={specialists} />
    </main>
  );
}

function ReportPage({ id }) {
  const { t } = useTranslation();
  const [report, setReport] = useState(null);
  const [readings, setReadings] = useState([]);
  const [diag, setDiag] = useState([]);
  const [meds, setMeds] = useState([]);
  const load = useCallback(async () => {
    const [rp, rd, dg, md] = await Promise.all([listReports(), listReadings(id), listDiagnostics(id), listMedications(id)]);
    setReport(rp.find((r) => String(r.id) === id) || null);
    setReadings(rd.map(r=>({ ...r, vals: [r.systolic, r.diastolic, r.heart_rate, r.body_temp, r.blood_sugar] })));
    setDiag(dg); setMeds(md);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const handleDeleteReading = async () => {
    // This is called from TodayAverage / BarChart if you wire delete all
    // For single page, you can delete all today's readings here if needed
  };

  return (
    <main className="w-full bg-canvas px-6 pb-16 pt-8">
      <div className="w-full max-w-4xl">
        <PageHeader title={report ? report.specialist : t('medical_report')} onBack={() => go('')} />
        {report && (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-white p-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-canvas text-xl">{report.icon}</span>
            <div><p className="text-[15px] font-semibold text-ink">{report.doctor}</p><p className="text-[12px] text-ink/60">{t(`categories.${report.specialist?.toLowerCase()}`) || report.specialist} {t('providers.title')}</p></div>
          </div>
        )}
        <div className="mt-4"><ExamSection readings={readings.filter((r) => isToday(r.taken_at)).sort(asc)} onAdd={() => go(`report-${id}-add`)} onDelete={handleDeleteReading} /></div>
        <div className="mt-6 flex w-full flex-col gap-6">
          <DiagnosticsCard items={diag} onUpload={async (f) => { await addDiagnostic(id, f); await load(); }} onDelete={async (d) => { /* add deleteDiagnostic if you have */ await load(); }} />
          <MedicationCard items={meds} onAdd={async (m) => { await addMedication({ report_id: id, ...m }); await load(); }} onDelete={async (m) => { /* add deleteMedication if you have */ await load(); }} />
        </div>
      </div>
    </main>
  );
}

const toLocalInput = (d) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function AddReadingPage({ id }) {
  const { t } = useTranslation();
  const [vals, setVals] = useState(FIELDS.map((f) => f.def));
  const [saving, setSaving] = useState(false);
  const back = `report-${id}`;
  const save = async () => {
    setSaving(true);
    try {
      await addReading({ report_id: id, systolic: vals[0], diastolic: vals[1], heart_rate: vals[2], body_temp: vals[3], blood_sugar: vals[4], taken_at: new Date().toISOString() });
      go(back);
    } catch (e) { alert(e.message); setSaving(false); }
  };
  return (
    <main className="w-full bg-canvas px-6 pb-10 pt-8">
      <div className="max-w-xl">
        <PageHeader title={t('providers.addReading')} onBack={() => go(back)} />
        <div className="mt-3 rounded-xl border border-line bg-white p-3">
          <div className="grid grid-cols-5 gap-1">
            {FIELDS.map((f, i) => <WheelPicker key={f.name} field={f} value={vals[i]} onChange={(v) => setVals((a) => a.map((x, j) => (j === i ? v : x)))} />)}
          </div>
        </div>
        <div className="mt-4"><StatusChip label={statusFor(vals)} /></div>
        <button onClick={save} disabled={saving} className="mt-6 w-full rounded-full bg-teal py-3 text-[14px] font-medium text-white">{saving ? t('common.saving') : t('common.save')}</button>
      </div>
    </main>
  );
}

export default function Providers() {
  const [h, setH] = useState(() => location.hash.slice(1));
  useEffect(() => {
    const fn = () => { setH(location.hash.slice(1)); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  const r = parseRoute(h);
  if (!r) return <ReportsPage />;
  return r.add ? <AddReadingPage key={h} id={r.id} /> : <ReportPage key={h} id={r.id} />;
}