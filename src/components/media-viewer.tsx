'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type MouseEvent, type SyntheticEvent } from 'react';
import { X } from 'lucide-react';
import { usePortfolio } from '@/i18n/provider';

interface MediaViewerProps {
  src: string;
  alt: string;
  caption?: string;
  width: number;
  height: number;
  priority?: boolean;
}

export function MediaViewer({
  src,
  alt,
  caption = alt,
  width,
  height,
  priority = false,
}: MediaViewerProps) {
  const { t } = usePortfolio();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    if (!element.open) element.showModal();
    const frame = requestAnimationFrame(() => closeButton.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  function restoreFocus() {
    requestAnimationFrame(() => trigger.current?.focus());
  }

  function closeViewer() {
    if (dialog.current?.open) dialog.current.close();
    setOpen(false);
    restoreFocus();
  }

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    closeViewer();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeViewer();
  }

  return (
    <figure className="project-image media-viewer">
      <button
        ref={trigger}
        className="media-viewer-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-label={`${t('enlargeImage')}: ${alt}`}
        onClick={() => setOpen(true)}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          sizes="(max-width: 760px) 100vw, 660px"
        />
      </button>
      <figcaption>
        <span>{caption}</span>
        <span className="media-viewer-hint">{t('enlargeImage')}</span>
      </figcaption>
      <dialog
        ref={dialog}
        className="media-viewer-dialog"
        aria-label={alt}
        onCancel={handleCancel}
        onClose={() => {
          setOpen(false);
          restoreFocus();
        }}
        onClick={handleBackdropClick}
      >
        <button
          ref={closeButton}
          className="media-viewer-close"
          type="button"
          aria-label={t('close')}
          onClick={closeViewer}
        >
          <X size={18} />
        </button>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes="(max-width: 760px) 92vw, 1100px"
        />
        <p>{caption}</p>
      </dialog>
    </figure>
  );
}
