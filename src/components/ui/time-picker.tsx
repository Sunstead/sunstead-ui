import * as React from "react"
import { ClockIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Input } from "./input"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

const pad = (n: number) => String(n).padStart(2, "0")

/**
 * A typed time as `HH:MM`: `4pm`, `4:30 pm`, `16:30`, `930`, `1630`, `9`,
 * `noon`, `midnight`. Null if it isn't one.
 */
function parseTime(typed: string): string | null {
  const t = typed.trim().toLowerCase().replace(/\s+/g, "")
  if (t === "noon" || t === "midday") return "12:00"
  if (t === "midnight") return "00:00"
  const m = /^(\d{1,2})(?:[:.]?(\d{2}))?(am|pm|a|p)?$/.exec(t)
  if (!m) return null
  let h = Number(m[1])
  const min = m[2] ? Number(m[2]) : 0
  const meridiem = m[3]?.[0]
  if (min > 59) return null
  if (meridiem) {
    if (h < 1 || h > 12) return null
    h = (h % 12) + (meridiem === "p" ? 12 : 0)
  } else if (h > 23) {
    return null
  }
  return `${pad(h)}:${pad(min)}`
}

function formatTime(value: string): string {
  return value
}

/** Every time of day `step` minutes apart, from midnight. */
function times(step: number): string[] {
  const out: string[] = []
  for (let m = 0; m < 1440; m += Math.max(1, step)) out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`)
  return out
}

/**
 * A time in a button that opens a box to type one in and a list to pick
 * from. Values are `HH:MM` strings.
 */
function TimePicker({
  value,
  onChange,
  step = 15,
  placeholder = "Time",
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  value: string | null
  onChange: (value: string) => void
  /** Minutes between the times offered. */
  step?: number
  placeholder?: string
  disabled?: boolean
  className?: string
  "aria-label"?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [typed, setTyped] = React.useState("")
  const list = React.useRef<HTMLDivElement>(null)
  const parsed = parseTime(typed)
  const options = times(step)
  // The list starts at the value, or at the nearest step after it.
  const near = value ? (options.find((t) => t >= value) ?? options[0]) : "09:00"

  React.useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() =>
      list.current
        ?.querySelector<HTMLElement>(`[data-time="${near}"]`)
        ?.scrollIntoView({ block: "center" })
    )
    return () => cancelAnimationFrame(id)
  }, [open, near])

  const pick = (t: string) => {
    onChange(t)
    setOpen(false)
    setTyped("")
  }

  return (
    <Popover open={open} onOpenChange={(o) => (setOpen(o), o || setTyped(""))}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            aria-label={ariaLabel}
            data-slot="time-picker-trigger"
            className={cn(
              "justify-start gap-2 font-normal tabular-nums",
              !value && "text-muted-foreground",
              className
            )}
          />
        }
      >
        <ClockIcon className="text-muted-foreground" />
        {value ? formatTime(value) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1.5" align="start">
        <Input
          autoFocus
          aria-label="Type a time"
          placeholder="Type a time"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              if (parsed) pick(parsed)
            }
          }}
          aria-invalid={typed.trim() !== "" && !parsed}
          className="h-8"
        />
        {typed.trim() !== "" && (
          <p className="px-1 pt-1 text-xs text-muted-foreground">
            {parsed ? `Enter for ${parsed}` : "Not a time yet"}
          </p>
        )}
        <div
          ref={list}
          role="listbox"
          aria-label="Times"
          className="mt-1.5 max-h-56 overflow-y-auto overscroll-contain"
        >
          {options.map((t) => (
            <button
              key={t}
              type="button"
              role="option"
              aria-selected={t === value}
              data-time={t}
              onClick={() => pick(t)}
              className={cn(
                "flex w-full rounded-sm px-2 py-1 text-left text-sm tabular-nums hover:bg-muted",
                t === value && "bg-primary text-primary-foreground hover:bg-primary"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { formatTime, parseTime, TimePicker, times }
