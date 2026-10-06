import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { Sidebar, SidebarProvider } from "./resizable-sidebar"

function render(collapsible: "icon" | "rail") {
  return renderToStaticMarkup(
    <SidebarProvider open={false}>
      <Sidebar collapsible={collapsible}>content</Sidebar>
    </SidebarProvider>
  )
}

describe("Sidebar collapsible rail", () => {
  it("marks itself rail, so icon-mode content rules never apply", () => {
    const html = render("rail")
    expect(html).toContain('data-collapsible="rail"')
    expect(html).not.toContain('data-collapsible="icon"')
  })

  it("narrows to the icon width, like icon mode", () => {
    const html = render("rail")
    expect(html).toContain("group-data-[collapsible=rail]:w-(--sidebar-width-icon)")
    expect(render("icon")).toContain('data-collapsible="icon"')
  })
})
