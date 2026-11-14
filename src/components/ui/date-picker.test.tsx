import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { DatePicker, formatDay, parseDay } from "./date-picker"
import { formatTime, parseTime, TimePicker, times } from "./time-picker"

describe("date picker", () => {
  it("reads and writes YYYY-MM-DD without the time zone moving the day", () => {
    const d = parseDay("2026-11-10")!
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 10])
    expect(parseDay("nope")).toBeNull()
    expect(formatDay(new Date(2026, 0, 5))).toBe("2026-01-05")
  })

  it("shows the date on its button, or the placeholder", () => {
    expect(renderToStaticMarkup(<DatePicker value="2026-11-10" onChange={() => {}} />)).toContain("Tue, Nov 10, 2026")
    expect(renderToStaticMarkup(<DatePicker value={null} onChange={() => {}} placeholder="Pick a day" />)).toContain("Pick a day")
  })
})

describe("time picker", () => {
  it.each([
    ["4pm", "16:00"],
    ["4:30 pm", "16:30"],
    ["4.30pm", "16:30"],
    ["12am", "00:00"],
    ["12pm", "12:00"],
    ["16:30", "16:30"],
    ["930", "09:30"],
    ["1630", "16:30"],
    ["9", "09:00"],
    ["noon", "12:00"],
  ])("reads %s as %s", (typed, time) => {
    expect(parseTime(typed)).toBe(time)
  })

  it.each(["", "25:00", "13pm", "9:75", "lunch"])("refuses %j", (typed) => {
    expect(parseTime(typed)).toBeNull()
  })

  it("lists the day in steps", () => {
    expect(times(15)).toHaveLength(96)
    expect(times(30).slice(0, 3)).toEqual(["00:00", "00:30", "01:00"])
  })

  it("shows the time on its button", () => {
    expect(formatTime("16:30")).toBe("16:30")
    expect(renderToStaticMarkup(<TimePicker value="09:15" onChange={() => {}} />)).toContain("09:15")
  })

  it("shows a 12-hour clock when asked, keeping HH:MM values", () => {
    expect(formatTime("16:30", 12)).toBe("4:30 PM")
    expect(formatTime("09:00", 12)).toBe("9 AM")
    expect(formatTime("00:15", 12)).toBe("12:15 AM")
    expect(formatTime("12:00", 12)).toBe("12 PM")
    expect(renderToStaticMarkup(<TimePicker value="21:45" hourCycle={12} onChange={() => {}} />)).toContain("9:45 PM")
  })
})
