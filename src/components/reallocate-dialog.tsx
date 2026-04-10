"use client";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  taskTitle: string;
};

export function ReallocateDialog({ open, onClose, onConfirm, taskTitle }: Props) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
      <div className="line-card w-full max-w-md bg-white p-6">
        <h3 className="text-lg font-semibold">Confirm crisis takeover</h3>
        <p className="mt-2 text-sm text-muted">
          Task <span className="font-medium text-ink">{taskTitle}</span> will be reallocated and original assignee gets credit penalty.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="rounded-full border border-line px-4 py-2 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full border border-critical bg-critical px-4 py-2 text-sm font-medium text-white"
            onClick={onConfirm}
          >
            Reallocate now
          </button>
        </div>
      </div>
    </div>
  );
}
