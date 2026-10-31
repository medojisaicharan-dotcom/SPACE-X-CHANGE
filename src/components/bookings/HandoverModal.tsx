import { useEffect, useState } from 'react';
import { AlertTriangle, ClipboardCheck, RotateCcw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { ImageUploader } from '@/components/ImageUploader';
import { useToast } from '@/contexts/ToastContext';
import type { HandoverInput } from '@/services/bookingService';
import type { Booking, Resource } from '@/types';
import { formatSlot } from '@/utils/date';
import { cn } from '@/utils/format';

const CHECKIN_ITEMS = [
  'Resource is present and complete',
  'No visible damage at handover',
  'Workspace is clean and safe',
  'Safety instructions were explained',
];

const CHECKOUT_ITEMS = [
  'All components and accessories returned',
  'No new damage found',
  'Workspace cleaned and reset',
  'Access cards, keys or cables returned',
];

export function HandoverModal({
  open,
  onClose,
  mode,
  booking,
  resource,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  mode: 'checkin' | 'checkout';
  booking: Booking | null;
  resource: Resource | undefined;
  onSubmit: (input: HandoverInput) => Promise<void>;
}) {
  const toast = useToast();
  const items = mode === 'checkin' ? CHECKIN_ITEMS : CHECKOUT_ITEMS;
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [damageNoted, setDamageNoted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setChecked(Object.fromEntries(items.map((item) => [item, false])));
    setPhotos([]);
    setNotes('');
    setDamageNoted(false);
    setSaving(false);
  }, [open, mode]);

  if (!booking) return null;

  async function handleSubmit() {
    const completed = Object.values(checked).filter(Boolean).length;
    if (completed === 0) {
      toast.warning('Complete the checklist', 'Confirm at least one condition item before continuing.');
      return;
    }
    if (mode === 'checkout' && damageNoted && notes.trim().length < 10) {
      toast.warning('Describe the damage', 'Add a short note so the owner and manager can review it.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ photos, checklist: checked, notes, damageNoted });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'checkin' ? 'Check in resource' : 'Check out resource'}
      description={`${resource?.name ?? 'Resource'} · ${formatSlot(booking.startDate, booking.startTime, booking.endTime)}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant={mode === 'checkin' ? 'primary' : 'success'}
            onClick={handleSubmit}
            loading={saving}
            icon={mode === 'checkin' ? <ClipboardCheck className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
          >
            {mode === 'checkin' ? 'Confirm check-in' : 'Confirm return'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-navy-100 bg-navy-50 p-3 text-xs leading-relaxed text-navy-800">
          {mode === 'checkin'
            ? 'Record the condition before use. Photos and notes are stored with this booking and help resolve disputes fairly.'
            : 'Record the return condition. The owner will review and confirm completion. Note any damage honestly — reports are reviewed by a human.'}
        </div>

        <div>
          <p className="label-base">Condition checklist</p>
          <div className="space-y-1.5">
            {items.map((item) => (
              <label
                key={item}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition',
                  checked[item] ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                )}
              >
                <input
                  type="checkbox"
                  checked={Boolean(checked[item])}
                  onChange={(event) => setChecked((current) => ({ ...current, [item]: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-navy-700"
                />
                {item}
              </label>
            ))}
          </div>
        </div>

        <ImageUploader
          value={photos}
          onChange={setPhotos}
          max={3}
          label="Condition photos (optional)"
          helper="Attach up to 3 photos. Keep images small (under 900 KB each)."
        />

        <Textarea
          label="Notes"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={
            mode === 'checkin'
              ? 'Anything the owner should know before use (existing scratches, missing accessory, etc.)'
              : 'Describe the return condition, any issues, or where the resource was left.'
          }
        />

        {mode === 'checkout' ? (
          <label className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <input
              type="checkbox"
              checked={damageNoted}
              onChange={(event) => setDamageNoted(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600"
            />
            <span className="flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              I am reporting damage or a missing item with this return.
            </span>
          </label>
        ) : null}
      </div>
    </Modal>
  );
}
