import { afterEach, describe, expect, test } from "bun:test"
import { cleanup, render } from "@testing-library/react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion"

afterEach(cleanup)

function renderAccordion(typography?: "default" | "body") {
  const { container } = render(
    <Accordion defaultValue={["home"]} typography={typography}>
      <AccordionItem value="home">
        <AccordionTrigger>Where should we start?</AccordionTrigger>
        <AccordionContent>
          <p>Choose the kind of place you want to set up.</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>,
  )

  return {
    trigger: container.querySelector<HTMLElement>('[data-slot="accordion-trigger"]')!,
    content: container.querySelector<HTMLElement>('[data-slot="accordion-content"]')!,
    inner: container.querySelector<HTMLElement>(".cn-accordion-content-inner")!,
  }
}

describe("Accordion typography", () => {
  test("keeps the existing default look", () => {
    const { trigger, content, inner } = renderAccordion()

    expect({
      trigger: trigger.className,
      content: content.className,
      inner: inner.className,
    }).toMatchSnapshot()
  })

  test("body typography uses larger, comfortably spaced rows and muted detail", () => {
    const { trigger, content, inner } = renderAccordion("body")

    expect(trigger.className).toContain("text-base")
    expect(trigger.className).toContain("lg:text-lg")
    expect(trigger.className).toContain("font-medium")
    expect(trigger.className).toContain("py-4")
    expect(trigger.className).toContain("lg:py-5")
    expect(content.className).toContain("text-base")
    expect(content.className).toContain("lg:text-lg")
    expect(content.className).toContain("font-normal")
    expect(content.className).toContain("text-muted-foreground")
    expect(inner.className).toContain("pt-1")
    expect(inner.className).toContain("pb-5")
  })
})
