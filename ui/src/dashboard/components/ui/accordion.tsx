import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"
import { createContext, useContext } from "react"

import { cn } from "../../lib/utils"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

type AccordionTypography = "default" | "body"

const AccordionTypographyContext = createContext<AccordionTypography>("default")

function Accordion({
  className,
  typography = "default",
  ...props
}: AccordionPrimitive.Root.Props & { typography?: AccordionTypography }) {
  return (
    <AccordionTypographyContext.Provider value={typography}>
      <AccordionPrimitive.Root
        data-slot="accordion"
        className={cn("flex w-full flex-col", className)}
        {...props}
      />
    </AccordionTypographyContext.Provider>
  )
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("cn-accordion-item not-last:border-b", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  const bodyTypography = useContext(AccordionTypographyContext) === "body"

  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "cn-accordion-trigger group/accordion-trigger relative flex flex-1 items-start justify-between rounded-lg border border-transparent py-2.5 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:after:border-ring aria-disabled:pointer-events-none aria-disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground",
          bodyTypography && "py-4 text-base lg:py-5 lg:text-lg",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon data-slot="accordion-trigger-icon" className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden" />
        <ChevronUpIcon data-slot="accordion-trigger-icon" className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  const bodyTypography = useContext(AccordionTypographyContext) === "body"

  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className={cn(
        "cn-accordion-content overflow-hidden text-sm data-open:animate-accordion-down data-closed:animate-accordion-up",
        bodyTypography && "text-base font-normal text-muted-foreground lg:text-lg",
      )}
      {...props}
    >
      <div
        className={cn(
          "cn-accordion-content-inner h-(--accordion-panel-height) pt-0 pb-2.5 data-ending-style:h-0 data-starting-style:h-0 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
          bodyTypography && "pt-1 pb-5",
          className
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
