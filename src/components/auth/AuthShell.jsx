import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';

/**
 * Sign-in, registration and password screens. On desktop the tutor's poster sits
 * beside the form; on phones it's dropped (it was 1.6 MB) and the form comes first.
 */
const AuthShell = ({ hero = 'login', children, wide = false }) => {
  const { i18n } = useTranslation();
  const src = hero === 'register'
    ? { srcSet: '/register-hero-720.webp 720w, /register-hero-1200.webp 1200w', src: '/register-hero-720.webp' }
    : { srcSet: '/login-hero-720.webp 720w, /login-hero-832.webp 832w', src: '/login-hero-720.webp' };

  return (
    <div className="min-h-dvh flex bg-paper">
      <div className="hidden lg:block lg:w-[46%] xl:w-1/2 relative overflow-hidden bg-[#0d1f4f]">
        <img {...src} sizes="50vw" alt="Accounting with Indika Amarakoon" width="832" height="1248"
          fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-top" />
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex justify-end p-4">
          <div role="group" aria-label="Language" className="inline-flex h-11 lg:h-8 p-1 lg:p-0.5 rounded-[10px] bg-sunken text-xs font-medium">
            {[['en', 'EN'], ['si', 'සිං']].map(([code, label]) => (
              <button key={code} type="button" onClick={() => i18n.changeLanguage(code)} aria-pressed={i18n.language === code}
                className={cn('min-w-11 lg:min-w-0 px-2.5 rounded-[7px]', i18n.language === code ? 'bg-surface text-ink shadow-panel' : 'text-ink-2')}>
                <span style={code === 'si' && i18n.language !== 'si' ? { fontFamily: 'system-ui, sans-serif' } : undefined}>{label}</span>
              </button>
            ))}
          </div>
        </div>
        <main className="flex-1 flex items-start sm:items-center justify-center px-5 pb-10">
          <div className={cn('w-full', wide ? 'max-w-[520px]' : 'max-w-[400px]')}>
            <div className="flex items-center gap-3 mb-8">
              <img src="/avatar-96.webp" alt="" width="48" height="48" className="h-12 w-12 rounded-full ring-1 ring-line object-cover" />
              <div className="leading-tight">
                <p className="font-semibold text-ink">Accounting</p>
                <p className="text-sm text-ink-2">with Indika Amarakoon</p>
              </div>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AuthShell;
