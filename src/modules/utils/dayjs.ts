import dj from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dj.extend(relativeTime)
const global: { date: dj.ConfigType } = { date: 0 }

function dayjs(date?: dj.ConfigType) {
  global.date = date || new Date()
  return dj(global.date)
}

export default dayjs
export const dayjs_internal = dj
export const date = global.date
