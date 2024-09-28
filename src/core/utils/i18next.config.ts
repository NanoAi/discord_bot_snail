import * as process from 'node:process'
import i18next from 'i18next'
import type { FsBackendOptions } from 'i18next-fs-backend'
import FsBackend from 'i18next-fs-backend'

const options = {
  // path where resources get loaded from
  loadPath: './lang/{{lng}}.json',
  // path to post missing resources
  addPath: './lang/{{lng}}.missing.json',
  // jsonIndent to use when storing json files
  jsonIndent: 2,
}

export default async function langConfig() {
  return await i18next
    .use(FsBackend)
    .init<FsBackendOptions>({
      lng: process.env.LANGUAGE,
      backend: options,
      debug: process.env.DEBUG_I18N === '1',
      // other i18next options
    })
}
