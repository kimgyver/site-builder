import React from "react";
import { EditableSection } from "../../types/sections";

interface CalloutSectionEditorProps {
  section: EditableSection;
  patchProps: (patch: Partial<Record<string, unknown>>) => void;
  updateProps: (newProps: Record<string, unknown>) => void;
}

const CalloutSectionEditor: React.FC<CalloutSectionEditorProps> = ({
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
          props.tone === "success" ||
          props.tone === "warning" ||
          props.tone === "danger"
            ? String(props.tone)
            : "info"
        }
        onChange={e =>
          updateProps({
            ...props,
            tone: e.target.value
          })
        }
      >
        <option value="info">Info</option>
        <option value="success">Success</option>
        <option value="warning">Warning</option>
        <option value="danger">Danger</option>
      </select>
      <input
        className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
        value={typeof props.title === "string" ? props.title : ""}
        onChange={e =>
          updateProps({
            ...props,
            title: e.target.value
          })
        }
        placeholder="Callout title"
      />
      <textarea
        className="h-24 w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
        value={typeof props.body === "string" ? props.body : ""}
        onChange={e =>
          updateProps({
            ...props,
            body: e.target.value
          })
        }
        placeholder="Callout content"
      />
    </div>
  );
};

export default CalloutSectionEditor;
