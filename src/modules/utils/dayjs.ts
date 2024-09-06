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

export default dayjs
export const dayjs_internal = dj
export const date = global.date
