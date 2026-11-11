import * as React from "react"
import { CalendarIcon, XIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

/** `YYYY-MM-DD` as a local date, so no time zone moves the day. */
function parseDay(value: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "")
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** `Tue, Nov 10, 2026`. */
function dayLabel(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d)
}

/**
 * A date in a button that opens a month calendar. Values are `YYYY-MM-DD`
 * strings, as forms and APIs carry them.
 */
function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  clearable,
  className,
  "aria-label": ariaLabel,
  weekStartsOn = 1,
}: {
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
  /** Offer a way to remove the date. */
  clearable?: boolean
  className?: string
  "aria-label"?: string
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
}) {
  const [open, setOpen] = React.useState(false)
  const selected = parseDay(value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            aria-label={ariaLabel}
            data-slot="date-picker-trigger"
            className={cn(
              "justify-start gap-2 font-normal",
              !selected && "text-muted-foreground",
              className
            )}
          />
        }
      >
        <CalendarIcon className="text-muted-foreground" />
        <span className="truncate">
          {selected ? dayLabel(selected) : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected ?? undefined}
          defaultMonth={selected ?? undefined}
          weekStartsOn={weekStartsOn}
          onSelect={(d) => {
            if (!d) return
            onChange(formatDay(d))
            setOpen(false)
          }}
          autoFocus
        />
        {clearable && selected && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
            >
              <XIcon />
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker, dayLabel, formatDay, parseDay }
