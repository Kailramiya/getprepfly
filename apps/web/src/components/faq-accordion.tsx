"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface FAQItem {
  question: string;
  answer: string;
}

export function FaqAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {items.map((item, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:shadow-sm">
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="flex w-full items-center justify-between p-6 text-left"
          >
            <span className="text-lg font-medium text-foreground">{item.question}</span>
            <ChevronDown
              className={`h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${
                openIndex === index ? "rotate-180" : ""
              }`}
            />
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              openIndex === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="px-6 pb-6 pt-0 text-base leading-relaxed text-muted-foreground">
              {item.answer}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
