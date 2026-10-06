// The default (unset prop, unset variant) markup of every kit part that
// KIT-SET-01 gave a new variant or size. settings-variants.test.tsx
// compares it with settings-default-markup.json, generated from the parts
// BEFORE the change, so "defaults unchanged" is a byte comparison.
import { renderToStaticMarkup } from "react-dom/server"
import { Button } from "./button"
import { Input } from "./input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "./item"
import { Select, SelectTrigger, SelectValue } from "./select"
import {
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "./sidebar"
import { Switch } from "./switch"

export function defaultMarkup(): Record<string, string> {
  const out: Record<string, string> = {}
  const put = (name: string, node: React.ReactElement) => {
    out[name] = renderToStaticMarkup(node).replace(/ id="[^"]*"/g, "")
  }
  put("item-group", <ItemGroup />)
  put("item-separator", <ItemSeparator />)
  for (const size of ["default", "sm", "xs"] as const) {
    put(`item-${size}`, <Item size={size} />)
  }
  put("item-outline", <Item variant="outline" />)
  put("item-content", <ItemContent />)
  put("item-title", <ItemTitle />)
  put("item-description", <ItemDescription />)
  put("item-actions", <ItemActions />)
  put("switch", <Switch />)
  put("switch-sm", <Switch size="sm" />)
  put("switch-checked", <Switch defaultChecked />)
  for (const variant of ["default", "outline", "secondary", "ghost", "destructive", "link"] as const) {
    for (const size of ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"] as const) {
      put(`button-${variant}-${size}`, <Button variant={variant} size={size} />)
    }
  }
  put("input", <Input />)
  put("input-text", <Input type="text" />)
  put(
    "select-trigger",
    <Select>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
    </Select>
  )
  put(
    "select-trigger-sm",
    <Select>
      <SelectTrigger size="sm">
        <SelectValue />
      </SelectTrigger>
    </Select>
  )
  put("sidebar-input", <SidebarInput />)
  put(
    "sidebar-menu-button",
    <SidebarProvider>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton>One</SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton isActive size="sm" variant="outline">Two</SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarProvider>
  )
  return out
}
