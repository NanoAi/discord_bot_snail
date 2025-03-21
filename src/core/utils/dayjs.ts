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

export function nsArrayToReadable(data: { [key: string]: bigint }) {
  const output: { [key: string]: string } = {}
  for (const [k, v] of Object.entries(data)) {
    const us = (Number(v) / 1e3)
    const ms = (Number(v) / 1e6)
    output[k] = ms < 1 && `${us.toFixed(0)}µs` || `${ms.toFixed(0)}ms`
  }
  return output
}

export default dayjs
export const dayjs_internal = dj
export const date = global.date
