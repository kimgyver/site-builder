import React from "react";
import { EditableSection } from "../../types/sections";

interface EmbedSectionEditorProps {
  section: EditableSection;
  patchProps: (patch: Partial<Record<string, unknown>>) => void;
  updateProps: (newProps: Record<string, unknown>) => void;
}

const EmbedSectionEditor: React.FC<EmbedSectionEditorProps> = ({
  section,
  patchProps,
  updateProps
}) => {
  const props = (section.props || {}) as Record<string, unknown>;
  return (
    <div className="space-y-1">
      <select
        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
        value={
          props.provider === "maps" || props.provider === "youtube"
            ? String(props.provider)
            : "youtube"
        }
        onChange={e =>
          updateProps({
            ...props,
            provider: e.target.value === "maps" ? "maps" : "youtube"
          })
        }
      >
        <option value="youtube">YouTube</option>
        <option value="maps">Google Maps</option>
      </select>
      <input
        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
        value={typeof props.url === "string" ? props.url : ""}
        onChange={e =>
          updateProps({
            ...props,
            url: e.target.value
          })
        }
        placeholder="Paste YouTube/Google Maps URL"
      />
      <input
        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
        value={typeof props.title === "string" ? props.title : ""}
        onChange={e =>
          updateProps({
            ...props,
            title: e.target.value
          })
        }
        placeholder="Embed title (optional)"
      />
    </div>
  );
};

export default EmbedSectionEditor;
