import { cn } from "../../lib/utils"
import { Loader2Icon } from "lucide-react"
import { i18n } from "@/kit/i18n";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon role="status" aria-label={i18n._({ id: "ui.Loading", message: "Loading" })} className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
