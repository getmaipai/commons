import * as React from "react"
import { OTPInput } from "input-otp"
import { cn } from "@/kit/utils"

/**
 * PasscodeInput: a row of exactly `digits` separate boxes for a numeric passcode (the iCloud code
 * prompt). One real, visually hidden input sits behind the boxes, so typing, paste, the phone's
 * numeric keypad and screen readers all work on one field. The boxes show filled dots, not digits
 * (`masked`, on by default), a caret in the active box, and a red state on every box when
 * `invalid` is set, with a short sideways shake that reduced motion skips.
 *
 * It never asks the browser for SMS or password-manager autofill (autocomplete is off): a passcode
 * is not a one-time code. `onComplete` fires when the last box fills. Boxes are 48px tall and wide
 * enough for a thumb (docs/UI.md). The group is labelled "Enter your N-digit passcode" and each box
 * is announced by position ("Digit 3 of 6, filled"). The caller owns the error text and should put
 * it in a `role="alert"` element; `invalid` only draws the boxes.
 */
type PasscodeInputProps = {
  digits: number
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  invalid?: boolean
  disabled?: boolean
  masked?: boolean
  /** Group label. Default: "Enter your N-digit passcode". */
  label?: string
  id?: string
  name?: string
  autoFocus?: boolean
  className?: string
}

function PasscodeInput({
  digits,
  value,
  onChange,
  onComplete,
  invalid = false,
  disabled = false,
  masked = true,
  label,
  id,
  name,
  autoFocus,
  className,
}: PasscodeInputProps) {
  const [shaking, setShaking] = React.useState(false)
  const wasInvalid = React.useRef(false)
  React.useEffect(() => {
    if (invalid && !wasInvalid.current) setShaking(true)
    wasInvalid.current = invalid
  }, [invalid])
  const groupLabel = label ?? `Enter your ${digits}-digit passcode`

  return (
    <OTPInput
      id={id}
      name={name}
      data-slot="passcode-input"
      maxLength={digits}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      disabled={disabled}
      // The caller decides: a sign-in or lock screen is the whole page, so the first box takes focus.
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus={autoFocus}
      inputMode="numeric"
      pattern="^[0-9]*$"
      autoComplete="off"
      pushPasswordManagerStrategy="none"
      spellCheck={false}
      aria-label={groupLabel}
      aria-invalid={invalid || undefined}
      data-1p-ignore
      data-lpignore="true"
      containerClassName={cn("group/passcode flex items-center has-disabled:opacity-50", className)}
      className="disabled:cursor-not-allowed"
      render={({ slots }) => (
        <div
          role="group"
          aria-label={groupLabel}
          data-slot="passcode-input-group"
          data-shaking={shaking ? "true" : undefined}
          onAnimationEnd={() => setShaking(false)}
          className="flex items-center gap-2 data-[shaking=true]:motion-safe:animate-[passcode-shake_320ms_ease-in-out]"
        >
          {slots.map((slot, index) => (
            <PasscodeSlot key={index} index={index} total={digits} masked={masked} invalid={invalid} char={slot.char} active={slot.isActive} caret={slot.hasFakeCaret} />
          ))}
        </div>
      )}
    />
  )
}

function PasscodeSlot({
  index,
  total,
  masked,
  invalid,
  char,
  active,
  caret,
}: {
  index: number
  total: number
  masked: boolean
  invalid: boolean
  char: string | null
  active: boolean
  caret: boolean
}) {
  return (
    <div
      role="img"
      aria-label={`Digit ${index + 1} of ${total}, ${char ? "filled" : "empty"}`}
      data-slot="passcode-input-slot"
      data-active={active || undefined}
      data-filled={char ? "true" : undefined}
      data-invalid={invalid || undefined}
      className={cn(
        "relative flex h-12 w-11 items-center justify-center rounded-md border border-input bg-transparent text-base outline-none transition-[border-color,box-shadow] dark:bg-input/30",
        "data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-[3px] data-[active=true]:ring-ring/50",
        "data-[invalid=true]:border-destructive data-[invalid=true]:ring-[3px] data-[invalid=true]:ring-destructive/20 dark:data-[invalid=true]:ring-destructive/40"
      )}
    >
      {char ? (
        masked ? (
          <span data-slot="passcode-input-dot" aria-hidden="true" className="size-3 rounded-full bg-foreground" />
        ) : (
          char
        )
      ) : null}
      {caret ? (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="h-5 w-px bg-foreground motion-safe:animate-[passcode-caret_1s_steps(1)_infinite]" />
        </span>
      ) : null}
    </div>
  )
}

export { PasscodeInput }
export type { PasscodeInputProps }
