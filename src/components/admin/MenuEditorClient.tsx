"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

type MenuItemInput = {
  label: string;
  href: string;
  openInNewTab: boolean;
};

type SaveState =
  | { status: "idle" }
  | { status: "saved"; savedAt: number }
  | { status: "error"; message: string };

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      disabled={disabled || pending}
    >
      {pending ? "Saving..." : "Save menu"}
    </button>
  );
}

export default function MenuEditorClient({
  menuId,
  location,
  initialName,
  initialItems,
  saveAction,
  canEdit
}: {
  menuId: string;
  location: string;
  initialName: string;
  initialItems: MenuItemInput[];
  saveAction: (prevState: SaveState, formData: FormData) => Promise<SaveState>;
  canEdit: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [state, formAction] = useFormState<SaveState, FormData>(saveAction, {
    status: "idle"
  });
  const [items, setItems] = useState<MenuItemInput[]>(
    Array.isArray(initialItems) && initialItems.length
      ? initialItems
      : [{ label: "Home", href: "/", openInNewTab: false }]
  );

  const itemsJson = useMemo(() => JSON.stringify(items), [items]);

  const move = (index: number, delta: number) => {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    setItems(prev => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const patchItem = (index: number, patch: Partial<MenuItemInput>) => {
    setItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems(prev => [...prev, { label: "Link", href: "/", openInNewTab: false }]);
  };

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="id" value={menuId} />
      <input type="hidden" name="itemsJson" value={itemsJson} />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-800">Name</label>
        <input
          name="name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          required
          disabled={!canEdit}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-zinc-900">Items</div>
            <div className="text-xs text-zinc-600">Location: {location}</div>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-60"
            disabled={!canEdit}
          >
            Add item
          </button>
        </div>

        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="rounded-md border border-zinc-200 bg-white px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-zinc-700">
                        Label
                      </label>
                      <input
                        value={item.label}
                        onChange={e =>
                          patchItem(index, { label: e.target.value })
                        }
                        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        placeholder="About"
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-zinc-700">
                        Href
                      </label>
                      <input
                        value={item.href}
                        onChange={e =>
                          patchItem(index, { href: e.target.value })
                        }
                        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-mono focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        placeholder="/about or https://example.com"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs text-zinc-700">
                    <input
                      type="checkbox"
                      checked={item.openInNewTab}
                      onChange={e =>
                        patchItem(index, { openInNewTab: e.target.checked })
                      }
                      disabled={!canEdit}
                    />
                    Open in new tab
                  </label>
                </div>

                <div className="flex flex-col items-end gap-1 pt-5 text-[10px]">
                  <button
                    type="button"
                    className="rounded border border-zinc-200 px-1.5 py-0.5 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-60"
                    onClick={() => move(index, -1)}
                    disabled={!canEdit}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="rounded border border-zinc-200 px-1.5 py-0.5 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-60"
                    onClick={() => move(index, 1)}
                    disabled={!canEdit}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="rounded border border-red-200 px-1.5 py-0.5 text-red-600 hover:border-red-300 hover:bg-red-50 disabled:opacity-60"
                    onClick={() => removeItem(index)}
                    disabled={!canEdit}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton disabled={!canEdit} />
        {state.status === "saved" ? (
          <span className="text-xs text-emerald-700">Saved</span>
        ) : null}
        {state.status === "error" ? (
          <span className="text-xs text-red-700">{state.message}</span>
        ) : null}
      </div>

      {!canEdit ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You don&apos;t have permission to edit menus.
        </div>
      ) : null}
    </form>
  );
}
