import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr',
    defaultNS: 'translation',
    backend: {
      loadPath: '/api/translations/{{lng}}',
      request: (_options, url, _payload, callback) => {
        fetch(url)
          .then(r => {
            if (r.ok) return r.text();
            // fallback fichiers statiques si l'API est down
            const lang = url.split('/').pop() ?? 'fr';
            return fetch(`/locales/${lang}/translation.json`).then(r2 => r2.text());
          })
          .then(data => callback(null, { status: 200, data }))
          .catch(() => {
            fetch('/locales/fr/translation.json')
              .then(r => r.text())
              .then(data => callback(null, { status: 200, data }))
              .catch(err => callback(err, { status: 500, data: '' }));
          });
      },
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: true,
    },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
    },
  });

export default i18n;
