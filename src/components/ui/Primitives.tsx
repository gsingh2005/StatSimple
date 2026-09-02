import type { PropsWithChildren, ReactNode, SelectHTMLAttributes } from "react";

export const classNames = (...values: Array<string | false | null | undefined>): string =>
  values.filter(Boolean).join(" ");

export const Button = ({
  children,
  className,
  size = "md",
  variant = "primary",
  ...props
}: PropsWithChildren<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: "sm" | "md";
    variant?: "primary" | "secondary" | "ghost" | "danger";
  }
>) => (
  <button
    className={classNames("button", `button--${variant}`, `button--${size}`, className)}
    type={props.type ?? "button"}
    {...props}
  >
    {children}
  </button>
);

export const Card = ({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) => (
  <section className={classNames("card", className)}>{children}</section>
);

export const SectionHeader = ({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <div className="section-header">
    <div>
      {eyebrow ? <div className="section-header__eyebrow">{eyebrow}</div> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
    {actions ? <div className="section-header__actions">{actions}</div> : null}
  </div>
);

export const EmptyState = ({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) => (
  <section className="empty-state">
    {eyebrow ? <div className="empty-state__eyebrow">{eyebrow}</div> : null}
    <h1>{title}</h1>
    <p>{description}</p>
    {actions ? <div className="empty-state__actions">{actions}</div> : null}
  </section>
);

export const Field = ({
  children,
  label,
  hint,
}: PropsWithChildren<{
  label: string;
  hint?: string;
}>) => (
  <label className="field">
    <span className="field__label">{label}</span>
    {children}
    {hint ? <span className="field__hint">{hint}</span> : null}
  </label>
);

export const Select = ({
  children,
  className,
  ...props
}: PropsWithChildren<SelectHTMLAttributes<HTMLSelectElement> & { className?: string }>) => (
  <select className={classNames("field__control", className)} {...props}>
    {children}
  </select>
);

export const Input = ({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
  <input className={classNames("field__control", className)} {...props} />
);

export const Badge = ({
  children,
  tone = "neutral",
}: PropsWithChildren<{ tone?: "neutral" | "info" | "warning" | "success" }>) => (
  <span className={classNames("badge", `badge--${tone}`)}>{children}</span>
);

export const Disclosure = ({
  title,
  children,
  defaultOpen = false,
}: PropsWithChildren<{
  title: string;
  defaultOpen?: boolean;
}>) => (
  <details className="disclosure" open={defaultOpen}>
    <summary>{title}</summary>
    <div className="disclosure__content">{children}</div>
  </details>
);
