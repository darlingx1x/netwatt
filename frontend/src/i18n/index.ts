import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { useUi } from '@/store/ui'
import ru from './ru.json'
import uz from './uz.json'
import en from './en.json'

i18n
  .use(initReactI18next)
  .init({
    resources: { ru: { translation: ru }, uz: { translation: uz }, en: { translation: en } },
    lng: useUi.getState().lang,
    fallbackLng: 'ru',
    interpolation: { escapeValue: false },
  })

useUi.subscribe((state) => {
  if (state.lang !== i18n.language) {
    void i18n.changeLanguage(state.lang)
  }
})

export default i18n
