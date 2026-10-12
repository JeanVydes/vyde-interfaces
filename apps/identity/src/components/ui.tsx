/**
 * The primitives every screen is made of.
 *
 * # Why these are React Aria components and not plain elements
 *
 * Because the accessibility work is the fiddly part and it should be written once. A `<TextField>`
 * from React Aria wires up the label association, `aria-invalid`, `aria-describedby` for the error,
 * and focus management on validation failure. Hand-rolling that in nine screens is nine chances to
 * forget the `aria-describedby`, and the screen that forgets it is the one with the error message
 * nobody hears.
 *
 * # Why there are no variants
 *
 * One visual treatment for each primitive. A `<Button variant="danger">` would be a token swap, and
 * the moment there are two of them there is a third. The destructive action in this app is a link in
 * a confirmation panel, not a red button on the main screen.
 */

import { Button, Input, Label, TextField } from 'react-aria-components';
import type { ReactNode } from 'react';

// --- text -------------------------------------------------------------------

export function Panel(props: {
  title: ReactNode;
  /** A short line under the title, before the content. */
  description?: string | undefined;
  /** Rendered at the far right of the title row — usually a save button. */
  action?: ReactNode | undefined;
  children: ReactNode;
  /** The corner brackets. On by default; off for nested panels. */
  bracketed?: boolean | undefined;
}) {
  return (
    <section className={props.bracketed === false ? 'panel' : 'panel panel--bracketed'}>
      <div className="panel__head">
        <h2 className="panel__title">{props.title}</h2>
        {props.action ? <div className="panel__action">{props.action}</div> : null}
      </div>
      {props.description ? <p className="panel__description">{props.description}</p> : null}
      {props.children}
    </section>
  );
}

/**
 * A labelled input wired for errors.
 *
 * `error` is rendered in a live region so a validation failure is announced rather than merely drawn.
 * It is *not* a toast and it does not clear on the next keystroke: an error that disappears before it
 * has been read is an error that gets submitted again.
 *
 * # Why `<Input>` and not a bare `<input>`
 *
 * Because a bare `<input>` receives none of what `<TextField>` computes. React Aria generates an
 * `id`, points the label's `htmlFor` at it, and wires `aria-describedby` to the hint and the error —
 * all of it by handing the props to its own `<Input>`, which reads them from context. Drop a plain
 * `<input>` inside a `<TextField>` and it renders fine, looks right, and is completely unlabelled:
 * no `id`, no `for`, no accessible name. A screen reader announces "edit text" instead of "E-mail",
 * and `getByLabel('E-mail')` finds nothing.
 *
 * That failure is invisible in a screenshot and invisible to `tsc`, which is exactly why the flow
 * tests drive a real browser.
 */
export function Field(props: {
  label: string;
  name: string;
  type?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** `| undefined` because `react-hook-form` gives `undefined` when the field is valid. */
  error?: string | undefined;
  hint?: ReactNode;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'numeric' | 'text' | 'email';
  readOnly?: boolean;
  disabled?: boolean;
  /** Rendered after the input, inside the same row. Used by the sign-out row. */
  trailing?: ReactNode;
  maxLength?: number;
}) {
  // `label`, `hint` and `trailing` are rendered by us rather than forwarded to `TextField`, so they
  // are pulled out of the props the rest of the object carries.
  const { label, trailing, hint, disabled, ...textFieldProps } = props;

  return (
    <TextField {...textFieldProps} {...(disabled === undefined ? {} : { isDisabled: disabled })}>
      <Label className="field__label">{label}</Label>
      <Input
        className="field__input"
        {...(props.autoComplete ? { autoComplete: props.autoComplete } : {})}
        {...(props.inputMode ? { inputMode: props.inputMode } : {})}
        {...(props.placeholder ? { placeholder: props.placeholder } : {})}
        {...(props.maxLength === undefined ? {} : { maxLength: props.maxLength })}
      />
      {hint ? <span className="field__hint">{hint}</span> : null}
      {props.error ? <FieldError message={props.error} /> : null}
      {trailing}
    </TextField>
  );
}

export function SelectField(props: {
  label: string;
  name: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  error?: string | undefined;
}) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={props.name}>{props.label}</label>
      <select
        id={props.name}
        name={props.name}
        className="field__input"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      >
        <option value="">Select...</option>
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {props.error ? <FieldError message={props.error} /> : null}
    </div>
  );
}

/**
 * The one error primitive.
 *
 * `role="alert"` here rather than in a stylesheet, because a live region is a semantic fact and not
 * a visual one — and because it is the only way a screen reader hears a failure that happened without
 * the user moving focus.
 */
export function FieldError(props: { message: string }) {
  return (
    <span className="field__error" role="alert">
      <span aria-hidden="true">▲</span>
      <span>{props.message}</span>
    </span>
  );
}

/** A box for a message that is not a failure — a hint, a success, a warning. */
export function Notice(props: {
  tone: 'info' | 'success' | 'warning';
  children: ReactNode;
  /** Announced when it appears. Defaults to `status`; pass `alert` for anything urgent. */
  live?: 'status' | 'alert' | 'none';
}) {
  return (
    <p
      className={`notice notice--${props.tone}`}
      role={props.live === 'none' ? undefined : props.live}
    >
      {props.children}
    </p>
  );
}

/**
 * The submit button.
 *
 * `isPending` disables rather than dims. A control that looks available and is not leaves the user
 * wondering whether the click registered; one that plainly is not does not.
 */
export function Submit(props: {
  children: ReactNode;
  pending?: boolean | undefined;
  pendingLabel?: string | undefined;
  onPress?: () => void;
  variant?: 'primary' | 'quiet' | undefined;
  type?: 'submit' | 'button' | undefined;
  /** Disabled for a reason other than being pending — e.g. a form that has nothing to submit. */
  disabled?: boolean | undefined;
  title?: string | undefined;
}) {
  return (
    <Button
      className={`button button--${props.variant ?? 'primary'}`}
      type={props.type ?? 'submit'}
      isPending={props.pending ?? false}
      isDisabled={(props.pending ?? false) || (props.disabled ?? false)}
      {...(props.title === undefined ? {} : { title: props.title })}
      {...(props.onPress ? { onPress: props.onPress } : {})}
    >
      {props.pending ? (props.pendingLabel ?? props.children) : props.children}
    </Button>
  );
}

/**
 * A value on its own line, in monospace, as data rather than as prose.
 *
 * The point of the interface is that everything here is a value somebody chose and may change, and
 * rendering it in the body face would make it read as a sentence instead.
 */
export function DataRow(props: { label: string; children: ReactNode }) {
  return (
    <div className="data">
      <span className="data__label">{props.label}</span>
      <span className="data__value">{props.children}</span>
    </div>
  );
}

/** A status chip. One per meaning, so the colours do not multiply. */
export function Chip(props: { tone: 'ok' | 'warn' | 'bad' | 'idle'; children: ReactNode }) {
  return <span className={`chip chip--${props.tone}`}>{props.children}</span>;
}