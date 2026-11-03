import { Mail, Phone, CheckCircle2 } from 'lucide-react';

const Contact = ({ person }) => (
  <span className="flex flex-col gap-0.5 text-sm">
    {person.email && (
      <span className="inline-flex items-center gap-1.5 text-ink-2"><Mail size={14} aria-hidden />{person.email}
        {person.emailVerified && <CheckCircle2 size={13} className="text-credit" aria-label="verified" />}</span>
    )}
    {person.phone && (
      <span className="inline-flex items-center gap-1.5 text-ink-2 tabular"><Phone size={14} aria-hidden />{person.phone}
        {person.phoneVerified && <CheckCircle2 size={13} className="text-credit" aria-label="verified" />}</span>
    )}
  </span>
);

export default Contact;
