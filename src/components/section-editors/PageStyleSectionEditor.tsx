import React from "react";
import { EditableSection } from "../../types/sections";

interface PageStyleSectionEditorProps {
  section: EditableSection;
  patchProps: (patch: Partial<Record<string, unknown>>) => void;
  updateProps: (newProps: Record<string, unknown>) => void;
}

const PageStyleSectionEditor: React.FC<PageStyleSectionEditorProps> = ({
  section,
  updateProps
}) => {
  const props = (section.props || {}) as Record<string, unknown>;
  return (
    <div className="space-y-1">
      <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
        Document background color
        <input
          type="color"
          className="mt-1 h-7 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0"
          value={
            typeof props.backgroundColor === "string"
              ? props.backgroundColor
              : "#f8fafc"
          }
          onChange={e =>
            updateProps({
              ...props,
              backgroundColor: e.target.value
            })
          }
        />
      </label>
      <p className="text-[10px] text-zinc-500">
        Applies to whole page background. Keep one enabled Page style section.
      </p>
    </div>
  );
};

export default PageStyleSectionEditor;
