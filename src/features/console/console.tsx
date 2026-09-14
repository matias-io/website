'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BriefcaseBusiness,
  FolderOpen,
  Mail,
  Shapes,
  ArrowLeft,
  ArrowRight,
  X,
} from 'lucide-react';
import { usePortfolio } from '@/i18n/provider';
import { useSound } from '@/features/audio/audio-provider';
import { Mark } from '@/components/mark';
import { RibbonScene } from './ribbon-scene';

export function ConsoleDevice() {
  const { t } = usePortfolio();
  const { play } = useSound();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const itemButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const items = [
    {
      label: t('experience'),
      href: '/experience/',
      icon: BriefcaseBusiness,
      description: t('consoleExperience'),
    },
    {
      label: t('projects'),
      href: '/projects/',
      icon: FolderOpen,
      description: t('consoleProjects'),
    },
    { label: t('skills'), href: '/skills/', icon: Shapes, description: t('consoleSkills') },
    { label: t('contact'), href: '/contact/', icon: Mail, description: t('consoleContact') },
  ];
  function show() {
    setOpen(true);
    dialog.current?.showModal();
    itemButtons.current[selected]?.focus();
    play('open');
  }
  function close() {
    dialog.current?.close();
    setOpen(false);
    play('close');
  }
  function choose(index: number) {
    play('open');
    dialog.current?.close();
    setOpen(false);
    router.push(items[index].href, { scroll: false });
  }
  function change(delta: number) {
    const focused = itemButtons.current.findIndex((button) => button === document.activeElement);
    const current = focused >= 0 ? focused : selected;
    const next = (current + delta + items.length) % items.length;
    setSelected(next);
    itemButtons.current[next]?.focus();
    play('select');
  }
  return (
    <>
      <button className="console-device" aria-label={t('openConsole')} onClick={show}>
        <span className="device-shoulder left" />
        <span className="device-shoulder right" />
        <span className="device-cross" aria-hidden="true" />
        <span className="device-screen">
          <RibbonScene active={false} />
          <span className="mini-icons">
            <BriefcaseBusiness />
            <FolderOpen />
            <Shapes />
            <Mail />
          </span>
          <span className="device-label">Matias Suxo</span>
        </span>
        <span className="device-buttons" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="device-indicator" />
        <span className="device-brand" aria-hidden="true">
          M S
        </span>
      </button>
      <dialog
        className="console-dialog"
        ref={dialog}
        aria-labelledby="console-title"
        onCancel={() => {
          setOpen(false);
          play('close');
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            change(1);
          }
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            change(-1);
          }
        }}
      >
        <div className="console-content">
          <RibbonScene active={open} />
          <div className="console-top">
            <Mark />
            <span id="console-title">{t('browse')}</span>
            <button onClick={close} aria-label={t('close')}>
              <X size={20} />
            </button>
          </div>
          <div className="console-menu" role="group" aria-label={t('browse')}>
            {items.map((item, index) => (
              <button
                ref={(node) => {
                  itemButtons.current[index] = node;
                }}
                key={item.href}
                className={selected === index ? 'selected' : ''}
                onFocus={() => setSelected(index)}
                onMouseEnter={() => {
                  if (selected !== index) {
                    setSelected(index);
                    play('select');
                  }
                }}
                onClick={() => choose(index)}
              >
                <item.icon strokeWidth={1.3} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <p className="console-caption">{items[selected].description}</p>
          <div className="console-bottom">
            <span>
              <ArrowLeft size={12} />
              <ArrowRight size={12} /> {t('navigate')}
            </span>
            <span>
              <kbd>Enter</kbd> {t('select')}
            </span>
            <span>
              <kbd>Esc</kbd> {t('exit')}
            </span>
          </div>
        </div>
      </dialog>
    </>
  );
}
