import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

const ok = ({ data, error }) => { if (error) throw error; return data; };

// reports -> medical_reports
export const listReports = async () => 
  ok(await supabase.from('medical_reports').select('*').order('report_date', { ascending: false }));

export const addReport = async (row) => 
  ok(await supabase.from('medical_reports').insert(row).select());

export const deleteReport = async (id) => 
  ok(await supabase.from('medical_reports').delete().eq('id', id));


export const listReadings = async (reportId) =>
  ok(await supabase.from('medical_readings').select('*').eq('report_id', reportId).order('taken_at', { ascending: false }));

export const addReading = async (row) => 
  ok(await supabase.from('medical_readings').insert(row));

export const listDiagnostics = async (reportId) =>
  ok(await supabase.from('medical_diagnostics').select('*').eq('report_id', reportId).order('created_at', { ascending: false }));

export const addDiagnostic = async (reportId, file) => {
  const path = `${reportId}/${Date.now()}-${file.name}`;
  const up = await supabase.storage.from('diagnostics').upload(path, file);
  if (up.error) throw up.error;
  const { data } = supabase.storage.from('diagnostics').getPublicUrl(path);
  ok(await supabase.from('medical_diagnostics').insert({ 
    report_id: reportId, 
    title: file.name.replace(/\.[^.]+$/, ''), 
    image_url: data.publicUrl 
  }));
};

export const listMedications = async (reportId) =>
  ok(await supabase.from('medical_medications').select('*').eq('report_id', reportId).order('created_at', { ascending: false }));

export const addMedication = async (row) => 
  ok(await supabase.from('medical_medications').insert(row));