import { LifeBuoy, Settings } from 'lucide-react';
import { Link } from 'react-router';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroupContent, SidebarGroup } from "../../../../components/ui/sidebar"


// Home's own bottom-of-rail items, as data (owner ruling, ui-v0.5.23) -
// the template's own "Help Center"/"Documentation" here pointed at
// shadcndashboard's own demo FAQ and docs site, the same
// branding-data-not-component-logic class `sidebaritems.ts` already is.
// Settings moved down here from the SYSTEM group above (now gone, with
// nothing left in it); Help opens Home's own user guide - HELP-AI-01
// (docs/BACKLOG.md) is the AI-assisted version this row is a placeholder
// for, not yet built.
export function NavUser() {
    const navItems = [
        {
            title: "Settings",
            url: "/next/settings",
            icon: Settings,
        },
        {
            title: "Help",
            url: "https://github.com/getmaipai/home/blob/main/docs/user/README.md",
            icon: LifeBuoy,
        },
    ]

    return (
        <SidebarGroup className="mt-auto p-0">
            <SidebarGroupContent>
                <SidebarMenu className=" ">
                    {navItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton size="lg" className="h-full cursor-pointer">
                                <Link to={item.url}>
                                    <div className="flex items-center gap-3 w-full">
                                        <item.icon className="shadow-none size-5 shrink-0" />
                                        <div className="flex flex-col flex-1 text-left text-sm leading-tight hide-menu whitespace-nowrap">
                                            <span className="truncate font-medium">{item.title}</span>
                                        </div>
                                    </div>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}
