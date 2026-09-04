import { useEffect, useRef, type ReactNode } from 'react';

import { Button } from './Button';

type DialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function Dialog({ open, title, onClose, children }: DialogProps) {
  const reference = useRef<HTMLDialogElement>(null);
  const titleId = `dialog-${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`;

  useEffect(() => {
    const dialog = reference.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={reference}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
    >
      <div className="dialog__header">
        <h2 id={titleId}>{title}</h2>
        <Button type="button" variant="ghost" onClick={onClose} aria-label={`Close ${title}`}>
          Close
        </Button>
      </div>
      {children}
    </dialog>
  );
}
