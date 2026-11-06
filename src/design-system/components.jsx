import { forwardRef, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronLeft, X } from 'lucide-react';
import './tokens.css';
import './components.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

/**
 * Button.
 * variant: primary | secondary | ghost | link | danger
 * size: sm | md | lg
 */
export const Button = forwardRef(function Button({
  variant = 'primary', size = 'md', block = false, icon = null, className, children, type = 'button', ...rest
}, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx('q20-btn', `q20-btn--${variant}`, size !== 'md' && `q20-btn--${size}`, block && 'q20-btn--block', className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

/** Square 28px icon-only button (close, back, overflow menus). Always pass a label. */
export const IconButton = forwardRef(function IconButton({ label, className, children, type = 'button', ...rest }, ref) {
  return (
    <button ref={ref} type={type} aria-label={label} title={label} className={cx('q20-icon-btn', className)} {...rest}>
      {children}
    </button>
  );
});

/** Labelled form field. Wraps an Input, Textarea or any control. */
export function Field({ label, hint, error, className, children }) {
  return (
    <label className={cx('q20-field', className)}>
      {label}
      {children}
      {error ? <span className="q20-field__error">{error}</span> : null}
      {!error && hint ? <span className="q20-field__hint">{hint}</span> : null}
    </label>
  );
}

export const Input = forwardRef(function Input({ invalid = false, className, ...rest }, ref) {
  return <input ref={ref} className={cx('q20-input', invalid && 'is-invalid', className)} {...rest} />;
});

export const Textarea = forwardRef(function Textarea({ invalid = false, className, ...rest }, ref) {
  return <textarea ref={ref} className={cx('q20-input', invalid && 'is-invalid', className)} {...rest} />;
});

/** Custom-drawn checkbox matching the prototypes' 18px blue box. Supports indeterminate. */
export function Checkbox({
  checked = false, indeterminate = false, onChange, disabled = false, className, children, ...rest
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className={cx('q20-checkbox', className)}>
      <input ref={inputRef} type="checkbox" checked={checked} disabled={disabled} onChange={onChange} {...rest} />
      <span className="q20-checkbox__box" aria-hidden="true">
        {indeterminate ? <span className="q20-checkbox__dash" /> : null}
        {!indeterminate && checked ? <Check size={12} strokeWidth={3} /> : null}
      </span>
      {children}
    </label>
  );
}

/** Grid that lays out Tiles. columns defaults to 2 and drops to 1 on narrow screens. */
export function TileGroup({ columns = 2, className, style, children, ...rest }) {
  return (
    <div
      role="group"
      className={cx('q20-tiles', className)}
      style={{ '--q20-tile-columns': columns, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Selectable choice card with an icon, title and one-line detail. */
export function Tile({
  icon: Icon = null, title, detail, selected = false, className, type = 'button', ...rest
}) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cx('q20-tile', selected && 'is-selected', className)}
      {...rest}
    >
      {Icon ? (
        <span className="q20-tile__icon" aria-hidden="true"><Icon size={16} /></span>
      ) : null}
      <strong className="q20-tile__title">{title}</strong>
      {detail ? <span className="q20-tile__detail">{detail}</span> : null}
    </button>
  );
}

/**
 * Modal dialog rendered in a portal.
 * size: sm (480) | md (640) | lg (720)
 * Escape and a click on the backdrop call onClose. Pass onBack to show a back chevron.
 */
export function Modal({
  open = true, title, eyebrow, onClose, onBack, size = 'sm', footer, className, children,
}) {
  const titleId = useId();
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    dialogRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape' && onClose) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="q20-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && onClose) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cx('q20-modal', size !== 'sm' && `q20-modal--${size}`, className)}
        style={{ outline: 'none' }}
      >
        <div className={cx('q20-modal__head', eyebrow && 'has-eyebrow')}>
          {eyebrow ? <span className="q20-modal__eyebrow">{eyebrow}</span> : null}
          <div className="q20-modal__title-row">
            {onBack ? (
              <IconButton label="Back" onClick={onBack}><ChevronLeft size={18} /></IconButton>
            ) : null}
            <h2 id={titleId} className="q20-modal__title">{title}</h2>
          </div>
          {onClose ? (
            <IconButton label="Close" className="q20-modal__close" onClick={onClose}><X size={18} /></IconButton>
          ) : null}
        </div>
        <div className="q20-modal__body">{children}</div>
        {footer ? <div className="q20-modal__foot">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

/** Small status label. tone: neutral | primary | success | warning | danger */
export function Tag({ tone = 'neutral', pill = false, className, children, ...rest }) {
  return (
    <span
      className={cx('q20-tag', tone !== 'neutral' && `q20-tag--${tone}`, pill && 'q20-tag--pill', className)}
      {...rest}
    >
      {children}
    </span>
  );
}

/** White bordered surface. Pass onClick (or interactive) for a hover state. */
export function Card({ flat = false, interactive = false, className, children, ...rest }) {
  return (
    <div
      className={cx('q20-card', flat && 'q20-card--flat', (interactive || rest.onClick) && 'q20-card--interactive', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ as: Tag_ = 'p', className, children }) {
  return <Tag_ className={cx('q20-eyebrow', className)}>{children}</Tag_>;
}

export function Lead({ className, children }) {
  return <p className={cx('q20-lead', className)}>{children}</p>;
}
