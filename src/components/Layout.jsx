import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home, BookOpen, FileQuestion, Trophy, CreditCard, Users, LogOut, BarChart3, Layers,
  FolderOpen, Database, ClipboardCheck, GraduationCap, KeyRound, Sun, Moon, Monitor, MoreHorizontal, WifiOff,
} from 'lucide-react';
import useAuth from '../context/useAuth';
import { useTheme } from '../lib/theme';
import { cn } from '../lib/cn';
import { Menu, MenuTrigger, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuRadioGroup, MenuRadioItem } from './ui/Menu';
import { Modal } from './ui/Dialog';
import useOnline from '../lib/useOnline';

const studentLinks = [
  { to: '/dashboard', icon: Home, key: 'home', end: true },
  { to: '/lessons', icon: BookOpen, key: 'lessons' },
  { to: '/quizzes', icon: FileQuestion, key: 'quizzes' },
  { to: '/results', icon: Trophy, key: 'results' },
  { to: '/payments', icon: CreditCard, key: 'payments' },
];

const adminGroups = [
  { key: null, links: [
    { to: '/admin/dashboard', icon: BarChart3, key: 'analytics' },
    { to: '/admin/marking', icon: ClipboardCheck, key: 'marking' },
  ] },
  { key: 'teach', links: [
    { to: '/admin/units', icon: FolderOpen, key: 'units' },
    { to: '/admin/lessons', icon: BookOpen, key: 'manageLessons' },
    { to: '/admin/quizzes', icon: FileQuestion, key: 'manageQuizzes' },
    { to: '/admin/question-bank', icon: Database, key: 'questionBank' },
  ] },
  { key: 'people', links: [
    { to: '/admin/students', icon: Users, key: 'students' },
    { to: '/admin/payments', icon: CreditCard, key: 'managePayments' },
    { to: '/admin/instructors', icon: GraduationCap, key: 'instructors' },
    { to: '/admin/batches', icon: Layers, key: 'batches' },
  ] },
];

const instructorGroups = [
  { key: null, links: [{ to: '/admin/marking', icon: ClipboardCheck, key: 'marking' }] },
  { key: 'teach', links: adminGroups[1].links },
];

// Phone bottom bar: the five destinations used most. Everything else is under "More".
const adminTabs = ['/admin/dashboard', '/admin/marking', '/admin/quizzes', '/admin/students'];
const instructorTabs = ['/admin/marking', '/admin/lessons', '/admin/quizzes', '/admin/question-bank'];

const initials = (u) => `${u?.firstName?.[0] ?? ''}${u?.lastName?.[0] ?? ''}`.toUpperCase() || '?';

const LanguageSwitch = ({ className }) => {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return (
    <div role="group" aria-label="Language" className={cn('inline-flex h-11 lg:h-8 p-1 lg:p-0.5 rounded-[10px] bg-sunken text-xs font-medium', className)}>
      {[['en', 'EN'], ['si', 'සිං']].map(([code, label]) => (
        <button key={code} type="button" onClick={() => i18n.changeLanguage(code)} aria-pressed={lang === code}
          className={cn('min-w-11 lg:min-w-0 px-2.5 rounded-[7px] transition-colors', lang === code ? 'bg-surface text-ink shadow-panel' : 'text-ink-2 hover:text-ink')}>
          <span style={code === 'si' && lang !== 'si' ? { fontFamily: 'system-ui, sans-serif' } : undefined}>{label}</span>
        </button>
      ))}
    </div>
  );
};

const AccountMenu = ({ compact = false }) => {
  const { t, i18n } = useTranslation();
  const { user, logout, isAdmin, isInstructor } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const role = isAdmin ? t('account.admin') : isInstructor ? t('account.instructor') : t('account.batch', { batch: user?.batch });

  return (
    <Menu>
      <MenuTrigger asChild>
        <button type="button" aria-label={t('account.openMenu')}
          className={cn('flex items-center gap-3 rounded-control text-left hover:bg-sunken transition-colors',
            compact ? 'p-1' : 'w-full p-2')}>
          <span className="h-9 w-9 shrink-0 rounded-full bg-brand-soft text-brand grid place-items-center text-sm font-semibold">
            {initials(user)}
          </span>
          {!compact && (
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink truncate">{user?.firstName} {user?.lastName}</span>
              <span className="block text-xs text-ink-2 truncate">{role}</span>
            </span>
          )}
        </button>
      </MenuTrigger>
      <MenuContent align={compact ? 'end' : 'start'} side={compact ? 'bottom' : 'top'} className="w-64">
        <div className="px-2.5 py-2">
          <p className="text-sm font-medium text-ink truncate">{user?.firstName} {user?.lastName}</p>
          <p className="text-xs text-ink-2 truncate">{user?.email || user?.phone}</p>
          {!isAdmin && !isInstructor && (
            <p className="text-xs text-ink-2 mt-0.5">{t('account.studentId')}: <span className="tabular text-ink">{user?.id}</span></p>
          )}
        </div>
        <MenuSeparator />
        <MenuLabel>{t('account.theme')}</MenuLabel>
        <MenuRadioGroup value={theme} onValueChange={setTheme}>
          <MenuRadioItem value="light"><span className="flex items-center gap-2.5"><Sun size={16} className="text-ink-3" />{t('account.light')}</span></MenuRadioItem>
          <MenuRadioItem value="dark"><span className="flex items-center gap-2.5"><Moon size={16} className="text-ink-3" />{t('account.dark')}</span></MenuRadioItem>
          <MenuRadioItem value="system"><span className="flex items-center gap-2.5"><Monitor size={16} className="text-ink-3" />{t('account.system')}</span></MenuRadioItem>
        </MenuRadioGroup>
        <MenuSeparator />
        <MenuLabel>{t('account.language')}</MenuLabel>
        <MenuRadioGroup value={i18n.language} onValueChange={(l) => i18n.changeLanguage(l)}>
          <MenuRadioItem value="en">English</MenuRadioItem>
          <MenuRadioItem value="si">සිංහල</MenuRadioItem>
        </MenuRadioGroup>
        <MenuSeparator />
        <MenuItem icon={KeyRound} onSelect={() => navigate('/change-password')}>{t('account.changePassword')}</MenuItem>
        <MenuItem icon={LogOut} tone="danger" onSelect={() => { logout(); navigate('/login'); }}>{t('account.signOut')}</MenuItem>
      </MenuContent>
    </Menu>
  );
};

const SideLink = ({ link, t, onNavigate }) => (
  <NavLink to={link.to} end={link.end} onClick={onNavigate}
    className={({ isActive }) => cn(
      'relative flex items-center gap-3 h-10 pl-3.5 pr-3 rounded-control text-sm transition-colors',
      isActive
        ? 'bg-surface text-ink font-medium shadow-panel before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-brand'
        : 'text-ink-2 hover:text-ink hover:bg-sunken')}>
    {({ isActive }) => (<>
      <link.icon size={18} className={isActive ? 'text-brand' : 'text-ink-3'} aria-hidden />
      <span className="truncate">{t(`nav.${link.key}`)}</span>
    </>)}
  </NavLink>
);

const Brand = () => (
  <Link to="/dashboard" className="flex items-center gap-3 min-w-0">
    <img src="/avatar-96.webp" alt="" width="36" height="36" className="h-9 w-9 rounded-full object-cover ring-1 ring-line shrink-0" />
    <span className="min-w-0 leading-tight">
      <span className="block font-semibold text-ink text-[15px]">Accounting</span>
      <span className="block text-xs text-ink-2 truncate">with Indika Amarakoon</span>
    </span>
  </Link>
);

const Layout = ({ children }) => {
  const { t } = useTranslation();
  const { isAdmin, isInstructor } = useAuth();
  const online = useOnline();
  const [moreOpen, setMoreOpen] = useState(false);

  const groups = isAdmin ? adminGroups : isInstructor ? instructorGroups : [{ key: null, links: studentLinks }];
  const all = groups.flatMap((g) => g.links);
  const tabPaths = isAdmin ? adminTabs : isInstructor ? instructorTabs : studentLinks.map((l) => l.to);
  const tabs = tabPaths.map((p) => all.find((l) => l.to === p)).filter(Boolean);
  const showMore = isAdmin || isInstructor;

  return (
    <div className="min-h-dvh lg:h-dvh lg:flex bg-paper">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:z-[60] focus:top-3 focus:left-3 focus:bg-surface focus:px-3 focus:py-2 focus:rounded-control focus:shadow-pop">
        {t('common.skipToContent')}
      </a>

      {/* Desktop sidebar */}
      <aside aria-label="Sidebar" className="hidden lg:flex w-[248px] shrink-0 flex-col border-r border-line">
        <div className="px-5 pt-5 pb-4"><Brand /></div>
        <nav className="flex-1 min-h-0 overflow-y-auto scroll-thin px-3 pb-4 space-y-5" aria-label="Main">
          {groups.map((g, i) => (
            <div key={i} className="space-y-0.5">
              {g.key && <p className="px-3.5 pb-1 text-xs font-medium text-ink-3">{t(`nav.${g.key}`)}</p>}
              {g.links.map((l) => <SideLink key={l.to} link={l} t={t} />)}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-line space-y-2">
          <LanguageSwitch className="ml-2" />
          <AccountMenu />
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 h-14 bg-paper/90 backdrop-blur border-b border-line pt-[env(safe-area-inset-top)]">
        <Brand />
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <AccountMenu compact />
        </div>
      </header>

      <main id="main" className="flex-1 min-w-0 lg:overflow-y-auto scroll-thin">
        {!online && (
          <div role="status" className="flex items-center gap-2 px-4 lg:px-8 py-2 bg-due-soft text-due text-sm">
            <WifiOff size={16} aria-hidden /> {t('common.offline')}
          </div>
        )}
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-10 pt-5 lg:pt-9 pb-28 lg:pb-12">
          {children}
        </div>
      </main>

      {/* Phone bottom tab bar */}
      <nav aria-label="Main" className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length + (showMore ? 1 : 0)}, minmax(0, 1fr))` }}>
          {tabs.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} end={l.end}
                className={({ isActive }) => cn('flex flex-col items-center justify-center gap-0.5 h-16 text-[11px] font-medium',
                  isActive ? 'text-brand' : 'text-ink-3')}>
                {({ isActive }) => (<>
                  <span className={cn('grid place-items-center h-7 w-12 rounded-full transition-colors', isActive && 'bg-brand-soft')}>
                    <l.icon size={20} aria-hidden />
                  </span>
                  <span className="truncate max-w-full px-1">{t(`nav.${l.key}`)}</span>
                </>)}
              </NavLink>
            </li>
          ))}
          {showMore && (
            <li>
              <button type="button" onClick={() => setMoreOpen(true)} className="w-full flex flex-col items-center justify-center gap-0.5 h-16 text-[11px] font-medium text-ink-3">
                <span className="grid place-items-center h-7 w-12"><MoreHorizontal size={20} aria-hidden /></span>
                {t('nav.more')}
              </button>
            </li>
          )}
        </ul>
      </nav>

      {showMore && (
        <Modal open={moreOpen} onOpenChange={setMoreOpen} title={t('nav.menu')} size="sm">
          <div className="space-y-4">
            {groups.map((g, i) => (
              <div key={i} className="space-y-0.5">
                {g.key && <p className="px-3.5 pb-1 text-xs font-medium text-ink-3">{t(`nav.${g.key}`)}</p>}
                {g.links.map((l) => <SideLink key={l.to} link={l} t={t} onNavigate={() => setMoreOpen(false)} />)}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Layout;
