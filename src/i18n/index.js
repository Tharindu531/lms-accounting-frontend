import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';

const saved = (() => { try { return localStorage.getItem('lang'); } catch { return null; } })();

// English ships with the app; Sinhala loads the first time it's chosen.
const loadSinhala = () => import('./si.json').then((m) => {
  if (!i18n.hasResourceBundle('si', 'translation')) i18n.addResourceBundle('si', 'translation', m.default, true, true);
});

i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },   // React already escapes
  returnNull: false,
});

const changeLanguage = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = async (lng, ...rest) => {
  if (lng === 'si') await loadSinhala();
  return changeLanguage(lng, ...rest);
};

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  try { localStorage.setItem('lang', lng); } catch { /* ignore */ }
});

if (saved === 'si') i18n.changeLanguage('si');
document.documentElement.lang = saved === 'si' ? 'si' : 'en';

export default i18n;
