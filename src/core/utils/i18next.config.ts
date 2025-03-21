import type { FsBackendOptions } from 'i18next-fs-backend'
import * as process from 'node:process'
import i18next from 'i18next'
import FsBackend from 'i18next-fs-backend'

const options: FsBackendOptions = {
  // path where resources get loaded from
  loadPath: './lang/{{lng}}.json',
  // path to post missing resources
  addPath: './lang/{{lng}}.missing.json',
  // Indent to use when storing json files
  ident: 2,
}

const i = {
  at: '<:at:1352473651215335424>',
  admin: '<:by:1352470809612124234>',
}

export default async function langConfig() {
  return await i18next
    .use(FsBackend)
    .init<FsBackendOptions>({
      lng: process.env.LANGUAGE,
      backend: options,
      debug: process.env.DEBUG_I18N === '1',
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, // Allows HTML-like content in translations
        defaultVariables: { i }, // Injects `icons` globally
      },
    })
}
