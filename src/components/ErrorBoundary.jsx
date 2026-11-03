import React from 'react';

/**
 * Last line of defence: a render error shows this instead of a blank page. The most
 * common cause after a deploy is a stale tab asking for a page file that no longer
 * exists, which a reload fixes, so reloading is the main action.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component error:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const si = document.documentElement.lang === 'si';
    return (
      <div role="alert" className="min-h-dvh grid place-items-center bg-paper p-6">
        <div className="max-w-sm">
          <h1 className="text-2xl font-semibold text-ink">{si ? 'යමක් වැරදී ගියා' : 'Something went wrong'}</h1>
          <p className="text-ink-2 mt-2">
            {si ? 'පිටුව නැවත පූරණය කරන්න. ඔබ පිළිතුරු දෙමින් සිටියා නම්, ඒවා සුරැකී ඇත.'
              : 'Reload the page to carry on. If you were answering a quiz, your answers are saved.'}
          </p>
          <div className="flex gap-2 mt-6">
            <button type="button" onClick={() => window.location.reload()}
              className="h-10 px-4 rounded-control bg-brand text-on-brand text-sm font-medium hover:bg-brand-strong">
              {si ? 'නැවත පූරණය කරන්න' : 'Reload page'}
            </button>
            <a href="/dashboard" className="h-10 px-4 inline-flex items-center rounded-control border border-line bg-surface text-sm font-medium text-ink hover:bg-sunken">
              {si ? 'මුල් පිටුවට' : 'Go home'}
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
