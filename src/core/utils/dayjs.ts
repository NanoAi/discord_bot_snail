import dj from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dj.extend(relativeTime)
const global: { date: dj.ConfigType } = { date: 0 }

function dayjs(date?: dj.ConfigType) {
  global.date = date || new Date()
  return dj(global.date)
}

export function nullDate() {
  return new Date('1969-12-31T19:00:00-05:00')
}

export function ms(date: Date) {
  return date.getMilliseconds()
}

export function msCompare(startDate: Date, endDate: Date) {
  const start = ms(startDate)
  const end = ms(endDate)
  return end - start
}

export default dayjs
export const dayjs_internal = dj
export const date = global.date
