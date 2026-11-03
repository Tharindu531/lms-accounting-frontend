import { useEffect } from 'react';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Registers the service worker and, when a new version has been deployed, offers
 * a reload instead of reloading by itself. Checks for updates every 30 minutes.
 */
const UpdatePrompt = () => {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (reg) setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    toast('A new version is available', {
      id: 'sw-update',
      duration: Infinity,
      description: 'Reload when you\'re not in the middle of a quiz.',
      action: { label: 'Reload', onClick: () => updateServiceWorker(true) },
    });
  }, [needRefresh, updateServiceWorker]);

  return null;
};

export default UpdatePrompt;
