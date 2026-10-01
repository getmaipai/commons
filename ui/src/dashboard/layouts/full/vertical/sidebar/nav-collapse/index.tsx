import { Link, useLocation } from "react-router";
import NavItem from "../nav-items/index";
import { cn } from "../../../../../lib/utils";
import { useSidebar } from "../../../../../components/ui/sidebar";
import { MenuItem, ChildItem } from "../sidebaritems";

interface NavCollapseProps {
  menu: MenuItem[];
  className?: string;
  sidebarItemStatus?: (item: { name: string; url?: string }) => { badge?: "amber" | "red"; title: string; ariaLabel: string } | undefined;
}

export default function NavCollapse({ menu, className, sidebarItemStatus }: NavCollapseProps) {
  const { pathname } = useLocation();
  const { state } = useSidebar();
  const isCollapse = state === "collapsed";

  const isActiveRoute = (item: ChildItem): boolean => {
    if (item.url && pathname === item.url) return true;
    if (item.items) return item.items.some(isActiveRoute);
    return false;
  };

  return (
    <>

      {menu.map((section, index) => (
        <div key={index}>
          {/* Heading */}


          <span className={cn(
            "text-xs uppercase block font-semibold text-muted-foreground mb-2 transition-all duration-200",
            isCollapse ? "text-center group-hover:text-start group-data-[state=expanded]:text-start" : ""
          )}>
            {isCollapse ? (
              <>
                <span className="group-hover:hidden group-data-[state=expanded]:hidden">...</span>
                <span className="hidden group-hover:inline group-data-[state=expanded]:inline">{section.heading ?? ""}</span>
              </>
            ) : (
              section.heading ?? ""
            )}
          </span>

          {section.items?.map((item: ChildItem, index) => {
            const hasChildren =
              Array.isArray(item.items) && item.items.length > 0;
            const active = isActiveRoute(item);
            const status = item.name ? sidebarItemStatus?.({ name: item.name, url: item.url }) : undefined;

            // 👉 No children → direct link
            if (!hasChildren)
              return (
                <Link
                  key={index}
                  to={item.url || "#"}
                  target={item.external ? "_blank" : undefined}
                  title={status?.title}
                  aria-label={status?.ariaLabel}
                  className={cn(
                    "relative flex min-h-12 items-center gap-3 rounded-md transition-all duration-200 ease-in-out",

                    className,
                  )}

                >

                  <NavItem item={item} hasChildren={false} isActive={active} badge={status?.badge} />
                </Link>




              );

            // 👉 With children → collapsible
            return (
              <details
                key={index}
                className="group/nav"
                open={active || item.isActive}
              >
                <summary
                  className={cn(
                    "cursor-pointer rounded-md flex items-center transition-all duration-200 ease-in-out",

                  )}
                >
                  <NavItem
                    item={item}
                    hasChildren={true}
                    className={className}
                    isActive={active}
                  />
                </summary>

                <div className="pl-3  ml-5  border-l border-border">
                  {item.items?.map((sub: ChildItem, index) =>
                    sub.items ? (
                        <NavCollapse
                          key={index}
                          menu={[{ items: [sub] }]}
                          className={className}
                          sidebarItemStatus={sidebarItemStatus}
                      />
                    ) : (
                      <Link
                        key={index}
                        to={sub.url || "#"}
                        target={sub.external ? "_blank" : undefined}
                        title={sub.name ? sidebarItemStatus?.({ name: sub.name, url: sub.url })?.title : undefined}
                        aria-label={sub.name ? sidebarItemStatus?.({ name: sub.name, url: sub.url })?.ariaLabel : undefined}
                      className={cn(
                          "relative flex min-h-12 items-center rounded-md transition-all duration-200 ease-in-out",

                          className,
                        )}
                      >
                        <NavItem item={sub} hasChildren={false} className={cn("px-2! py-1! my-1!", pathname === sub.url && "bg-primary/5 text-primary")} isActive={pathname === sub.url} badge={sub.name ? sidebarItemStatus?.({ name: sub.name, url: sub.url })?.badge : undefined} />
                      </Link>
                    )
                  )}
                </div>
              </details>
            );
          })}
        </div >
      ))
      }
    </>
  );
}
