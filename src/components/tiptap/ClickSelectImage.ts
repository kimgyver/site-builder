import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

export const ClickSelectImage = Extension.create({
  name: "clickSelectImage",
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          handleClickOn: (_view, _pos, node, nodePos, event) => {
            if (node.type.name !== "image") return false;
            editor.chain().focus().setNodeSelection(nodePos).run();
            event.preventDefault();
            return true;
          }
        }
      })
    ];
  }
});
