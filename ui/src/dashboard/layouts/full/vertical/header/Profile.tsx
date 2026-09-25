import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
} from "../../../../components/ui/sheet";
import { Avatar, AvatarFallback } from "../../../../components/ui/avatar";
import { cn } from "../../../../lib/utils";
import { LifeBuoy, Settings, X } from "lucide-react";
import { Link } from "react-router";

const navItems = [
  { title: "Settings", href: "/next/settings", icon: Settings },
  { title: "Help", href: "https://github.com/getmaipai/home/blob/main/docs/user/README.md", icon: LifeBuoy },
];

// Home's account sheet uses the signed-in person's real name and its own
// destinations (owner ruling, ui-v0.5.60, 2026-09-25). The shipped
// Cameron/email/avatar and invoice/subscription links are the template's
// demo identity and navigation, the same branding-data-not-component-
// logic class as NavUser.tsx's existing Home override. Its Log Out link
// points to the template's nonexistent /auth/auth2/login route, so it is
// removed instead of presenting a control that cannot sign anyone out.
function initials(displayName: string): string {
  return displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

export default function ProfileSheet({ displayName = "" }: { displayName?: string }) {
  return (
    <Sheet>
      <SheetTrigger
        aria-label={displayName ? `Open account menu for ${displayName}` : "Open account menu"}
        className="cursor-pointer hover:bg-primary/5 flex items-center justify-center rounded-full h-10 w-10"
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback>{initials(displayName)}</AvatarFallback>
        </Avatar>
      </SheetTrigger>

      <SheetContent
        showCloseButton={false}
        side="right"
        className="border-s-0 w-full sm:max-w-80 max-w-60"
      >
        <SheetClose className="absolute top-5 end-5 p-2 hover:bg-primary/5 hover:text-primary rounded-full">
          <X width={20} height={20} />
        </SheetClose>
        <div className="p-6 py-6">
          <div className="flex flex-col gap-4 justify-center items-center pt-10">
            <Avatar className="h-16 w-16">
              <AvatarFallback>{initials(displayName)}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h6 className="text-lg font-semibold">{displayName}</h6>
            </div>
          </div>
        </div>

        <div className="border-t border-border">
          <ul className="flex flex-col gap-2 p-6">
            {navItems.map((item) => (
              <li key={item.title} className="group">
                <Link
                  to={item.href}
                  className={cn("flex gap-3 py-2 px-3 rounded-md group-hover:bg-primary/5 text-muted-foreground")}
                >
                  <item.icon width={20} height={20} className="group-hover:text-primary" />
                  <div className="flex gap-3 items-center">
                    <h6 className="text-sm group-hover:text-primary">{item.title}</h6>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
