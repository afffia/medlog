import { atClock, dateKey } from './dates.js'

export const MED_WINDOW_MIN = 4 * 60   // a dose reminder stays up for 4h after its time
export const APPT_GRACE_MIN = 30       // an appointment reminder stays up 30 min past the start
const OVERDUE_AFTER_MIN = 15

// Everything that is due at `now` (ms) and not yet handled.
//  meds:  [{ id, name, dosage, times, profile_id }]
//  taken: Set of 'medicineId:slot' or 'medicineId:all'
//  appts: [{ id, title, doctor, facility, appt_at, remind_before_minutes, profile_id }] (not done)
export function computeDue({ meds, taken, appts, settings, now, personName = () => '' }) {
  const day = dateKey(new Date(now))
  const list = []

  if (settings.med_reminders) {
    meds.forEach((m) => {
      ;(m.times || []).forEach((slot) => {
        const hhmm = settings.slot_times?.[slot]
        if (!hhmm) return
        const at = atClock(day, hhmm).getTime()
        const ageMin = (now - at) / 60000
        if (ageMin < 0 || ageMin > MED_WINDOW_MIN) return
        if (taken.has(`${m.id}:${slot}`) || taken.has(`${m.id}:all`)) return
        list.push({
          key: `med|${day}|${m.id}|${slot}`,
          kind: 'medicine',
          medicineId: m.id,
          profileId: m.profile_id,
          slot,
          title: m.name,
          dosage: m.dosage,
          person: personName(m.profile_id),
          at,
          overdue: ageMin > OVERDUE_AFTER_MIN,
        })
      })
    })
  }

  if (settings.appt_reminders) {
    appts.forEach((a) => {
      const at = new Date(a.appt_at).getTime()
      const lead = a.remind_before_minutes ?? 60
      if (now < at - lead * 60000 || now > at + APPT_GRACE_MIN * 60000) return
      list.push({
        key: `appt|${a.id}|${lead}`,
        kind: 'appointment',
        id: a.id,
        title: a.title,
        doctor: a.doctor,
        facility: a.facility,
        person: personName(a.profile_id),
        at,
      })
    })
  }

  return list.sort((x, y) => x.at - y.at)
}
