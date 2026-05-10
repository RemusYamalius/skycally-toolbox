interface FAQItem {
  question: string;
  answer: string;
}

interface ToolSeoContentProps {
  title: string;
  description: string;
  body: string[];
  faqs: FAQItem[];
}

export default function ToolSeoContent({ title, description, body, faqs }: ToolSeoContentProps) {
  return (
    <section className="max-w-2xl mx-auto mt-16 px-1 pb-4 border-t border-border pt-10">
      <h2 className="text-xl font-semibold text-foreground mb-3">{title}</h2>
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{description}</p>

      <div className="space-y-4 mb-10">
        {body.map((paragraph, i) => (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>

      {faqs.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-foreground mb-4">Frequently Asked Questions</h3>
          <div className="space-y-5">
            {faqs.map((faq, i) => (
              <div key={i}>
                <h4 className="text-sm font-medium text-foreground mb-1.5">{faq.question}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
