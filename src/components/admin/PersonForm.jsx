import { useState } from 'react';
import { Mail, Phone, CheckCircle2 } from 'lucide-react';
import { Field, Input, Select } from '../ui/primitives';
import { Modal } from '../ui/Dialog';
import Button from '../ui/Button';
import PhoneInput from '../PhoneInput';
import { cn } from '../../lib/cn';

/**
 * Add a student or instructor by email or phone. The server creates a temporary
 * password and sends it to them; its message is shown once the account exists.
 */
const PersonForm = ({ open, onOpenChange, title, batches, onSubmit, submitting, createdMessage, onAddAnother }) => {
  const [method, setMethod] = useState('email');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', batch: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const payload = { firstName: form.firstName.trim(), lastName: form.lastName.trim() };
    if (batches) payload.batch = parseInt(form.batch, 10);
    if (method === 'email') payload.email = form.email.trim(); else payload.phone = form.phone;
    onSubmit(payload);
  };

  const reset = () => { setForm({ firstName: '', lastName: '', email: '', phone: '', batch: form.batch }); onAddAnother(); };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title}
      footer={createdMessage ? (
        <>
          <Button variant="secondary" onClick={reset}>Add another</Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </>
      ) : (
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="person-form" loading={submitting}>Create account</Button>
        </>
      )}>
      {createdMessage ? (
        <div className="flex gap-3 rounded-control bg-credit-soft text-credit p-4" role="status">
          <CheckCircle2 size={20} className="shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm text-ink">{createdMessage}</p>
        </div>
      ) : (
        <form id="person-form" onSubmit={submit} className="space-y-4">
          <div role="tablist" aria-label="Send login details by" className="grid grid-cols-2 p-1 rounded-control bg-sunken">
            {[['email', Mail, 'Email'], ['phone', Phone, 'Phone (SMS)']].map(([m, Icon, label]) => (
              <button key={m} type="button" role="tab" aria-selected={method === m} onClick={() => setMethod(m)}
                className={cn('h-9 rounded-[8px] inline-flex items-center justify-center gap-2 text-sm font-medium',
                  method === m ? 'bg-surface text-ink shadow-panel' : 'text-ink-2 hover:text-ink')}>
                <Icon size={16} aria-hidden /> {label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" required>{(p) => <Input {...p} value={form.firstName} onChange={set('firstName')} />}</Field>
            <Field label="Last name" required>{(p) => <Input {...p} value={form.lastName} onChange={set('lastName')} />}</Field>
          </div>
          {method === 'email'
            ? <Field label="Email" required hint="Their login details are emailed here.">{(p) => <Input {...p} type="email" value={form.email} onChange={set('email')} />}</Field>
            : <Field label="Phone" required hint="Their login details are sent by SMS.">{(p) => <PhoneInput id={p.id} required onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />}</Field>}
          {batches && (
            <Field label="Batch" required>
              {(p) => (
                <Select {...p} value={form.batch} onChange={set('batch')}>
                  <option value="">Choose a batch</option>
                  {batches.map((b) => <option key={b.id} value={b.batchNumber}>{b.name} ({b.batchNumber})</option>)}
                </Select>
              )}
            </Field>
          )}
        </form>
      )}
    </Modal>
  );
};
export default PersonForm;
