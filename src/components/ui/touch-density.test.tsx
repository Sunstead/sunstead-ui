import { readFileSync } from "node:fs"
import path from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { Button } from "./button"
import {
  SidebarMenuButton,
  SidebarMenuSubButton,
  SidebarProvider,
} from "./resizable-sidebar"

// Where touch is the main input (`data-touch` on <html>), the controls a
// finger hits most grow to about 40pt, as Discord's iPad app does.
describe("touch density", () => {
  it("declares the touch variant", () => {
    const css = readFileSync(path.resolve(__dirname, "../../styles.css"), "utf8")
    expect(css).toMatch(/@custom-variant touch \(&:where\(\[data-touch\] \*\)\);/)
  })

  it.each([
    ["icon-sm", "touch:size-10"],
    ["icon", "touch:size-10"],
    ["icon-xs", "touch:size-8"],
    ["sm", "touch:h-9"],
    ["default", "touch:h-10"],
    ["xs", "touch:h-8"],
  ] as const)("grows %s buttons", (size, touch) => {
    expect(renderToStaticMarkup(<Button size={size} />)).toContain(touch)
  })

  it("leaves large buttons alone", () => {
    expect(renderToStaticMarkup(<Button size="lg" />)).not.toContain("touch:")
    expect(renderToStaticMarkup(<Button size="icon-lg" />)).not.toContain("touch:")
  })

  const inSidebar = (node: React.ReactNode) =>
    renderToStaticMarkup(<SidebarProvider>{node}</SidebarProvider>)

  it("grows sidebar rows", () => {
    expect(inSidebar(<SidebarMenuButton />)).toContain("touch:h-10")
    expect(inSidebar(<SidebarMenuButton size="sm" />)).toContain("touch:h-9")
    expect(inSidebar(<SidebarMenuSubButton />)).toContain("touch:h-9")
  })
})
