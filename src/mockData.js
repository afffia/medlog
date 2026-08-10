export const CATEGORIES = {
  bloodwork: { label: 'Bloodwork', icon: 'droplet', color: 'teal' },
  imaging: { label: 'Imaging', icon: 'scan', color: 'amber' },
  prescription: { label: 'Prescription', icon: 'pill', color: 'coral' },
  visit: { label: 'Visit summary', icon: 'stethoscope', color: 'teal' },
}

export const reports = [
  { id: 'r1', title: 'Complete blood count', category: 'bloodwork', provider: 'Dr. Anika Rahman', facility: 'City Diagnostics', date: '2026-06-02', notes: 'Routine annual checkup panel.' },
  { id: 'r2', title: 'Chest X-ray', category: 'imaging', provider: 'Dr. Faruk Hossain', facility: 'General Hospital', date: '2026-04-18', notes: 'Follow-up on persistent cough.' },
  { id: 'r3', title: 'Prescription renewal — Atorvastatin', category: 'prescription', provider: 'Dr. Anika Rahman', facility: 'City Diagnostics', date: '2026-02-03', notes: '3-month refill.' },
  { id: 'r4', title: 'Cardiology consultation', category: 'visit', provider: 'Dr. Nusrat Jahan', facility: 'Heart & Vascular Center', date: '2025-11-14', notes: 'Discussed cholesterol trend and diet plan.' },
]
