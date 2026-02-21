import React from "react";
import { EditableSection } from "../../types/sections";

interface AccordionSectionEditorProps {
  section: EditableSection;
  patchProps: (patch: Partial<Record<string, unknown>>) => void;
  updateProps: (newProps: Record<string, unknown>) => void;
}

const AccordionSectionEditor: React.FC<AccordionSectionEditorProps> = ({
  section,
  patchProps,
  updateProps
}) => {
  const props = (section.props || {}) as Record<string, unknown>;
  const items = Array.isArray(props.items)
    ? (props.items as Array<{ question?: unknown; answer?: unknown }>)
    : [];

  return (
    <div className="space-y-1">
      <input
        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
        value={typeof props.title === "string" ? props.title : ""}
        onChange={e =>
          updateProps({
            ...props,
            title: e.target.value
          })
        }
        placeholder="Accordion section title"
      />
      <textarea
        className="h-24 w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px] font-mono"
        value={items
          .map(item => {
            const q = typeof item.question === "string" ? item.question : "";
            const a = typeof item.answer === "string" ? item.answer : "";
            return `${q}::${a}`;
          })
          .join("\n")}
        onChange={e => {
          const nextItems = e.target.value
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => {
              const [question, answer] = line
                .split("::")
                .map(part => part.trim());
              return {
                question: question ?? "",
                answer: answer ?? ""
              };
            });
          updateProps({
            ...props,
            items: nextItems
          });
        }}
        placeholder="Each line: question::answer"
      />
    </div>
  );
};

export default AccordionSectionEditor;
