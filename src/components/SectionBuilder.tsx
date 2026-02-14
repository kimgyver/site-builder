"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { TiptapEditor } from "@/components/TiptapEditor";

export type SectionType = "hero" | "text" | "image" | "faq" | "richText";

export interface EditableSection {
  id: string;
  type: SectionType;
  order: number;
  enabled: boolean;
  props: Record<string, unknown>;
}

interface SectionBuilderProps {
  pageId: string;
  initialSections: EditableSection[];
}

export function SectionBuilder({
  pageId,
  initialSections
}: SectionBuilderProps) {
  const initialSorted = useMemo(
    () => [...initialSections].sort((a, b) => a.order - b.order),
    [initialSections]
  );

  const [sections, setSections] = useState<EditableSection[]>(initialSorted);
  const sectionsRef = useRef<EditableSection[]>(initialSorted);
  const sectionsInputRef = useRef<HTMLInputElement | null>(null);
  const tempIdRef = useRef(0);

  const setSectionsSynced = (
    updater: (prev: EditableSection[]) => EditableSection[]
  ) => {
    setSections(prev => {
      const next = updater(prev);
      sectionsRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    // Keep the hidden input roughly in sync for debuggability,
    // but we still overwrite it at submit time to avoid stale submits.
    if (sectionsInputRef.current) {
      sectionsInputRef.current.value = JSON.stringify(sectionsRef.current);
    }
  }, [sections]);

  const updateOrder = (next: EditableSection[]) => {
    setSectionsSynced(() =>
      next.map((s, index) => ({
        ...s,
        order: index
      }))
    );
  };

  const move = (index: number, delta: number) => {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= sections.length) return;
    const next = [...sections];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    updateOrder(next);
  };

  const toggleEnabled = (index: number) => {
    setSectionsSynced(prev =>
      prev.map((s, i) => (i === index ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const removeSection = (index: number) => {
    setSectionsSynced(prev => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((s, i) => ({ ...s, order: i }));
    });
  };

  const duplicateSection = (index: number) => {
    setSectionsSynced(prev => {
      const source = prev[index];
      if (!source) return prev;

      tempIdRef.current += 1;
      const copy: EditableSection = {
        ...source,
        id: `temp-${tempIdRef.current}`,
        props: JSON.parse(JSON.stringify(source.props)) as Record<
          string,
          unknown
        >
      };

      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next.map((section, order) => ({ ...section, order }));
    });
  };

  const addSection = (type: SectionType) => {
    tempIdRef.current += 1;
    const id = `temp-${tempIdRef.current}`;
    const baseProps: Record<string, unknown> = {};
    if (type === "hero") {
      baseProps.title = "Hero title";
      baseProps.subtitle = "Hero subtitle";
    } else if (type === "text" || type === "richText") {
      baseProps.html = "<p>New text block</p>";
    } else if (type === "image") {
      baseProps.url = "https://placehold.co/1200x600";
      baseProps.alt = "Placeholder image";
    } else if (type === "faq") {
      baseProps.title = "Frequently asked questions";
      baseProps.items = [{ question: "Question", answer: "Answer" }];
    }

    setSectionsSynced(prev => [
      ...prev,
      {
        id,
        type,
        enabled: true,
        order: prev.length,
        props: baseProps
      }
    ]);
  };

  const updateProps = (index: number, props: Record<string, unknown>) => {
    setSectionsSynced(prev =>
      prev.map((s, i) => (i === index ? { ...s, props } : s))
    );
  };

  return (
    <div
      className="space-y-3"
      onSubmitCapture={() => {
        // Critical: ensure the submitted JSON includes the most recent editor changes
        // (drag-resize and other fast interactions may not re-render before submit).
        if (sectionsInputRef.current) {
          sectionsInputRef.current.value = JSON.stringify(sectionsRef.current);
        }
      }}
    >
      <input type="hidden" name="pageId" value={pageId} />
      <input
        ref={sectionsInputRef}
        type="hidden"
        name="sections"
        defaultValue={JSON.stringify(initialSorted)}
      />

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-zinc-500">Add section:</span>
        <button
          type="button"
          onClick={() => addSection("hero")}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 hover:bg-zinc-100"
        >
          Hero
        </button>
        <button
          type="button"
          onClick={() => addSection("text")}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 hover:bg-zinc-100"
        >
          Text
        </button>
        <button
          type="button"
          onClick={() => addSection("richText")}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 hover:bg-zinc-100"
        >
          Rich text
        </button>
        <button
          type="button"
          onClick={() => addSection("image")}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 hover:bg-zinc-100"
        >
          Image
        </button>
        <button
          type="button"
          onClick={() => addSection("faq")}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 hover:bg-zinc-100"
        >
          FAQ
        </button>
      </div>

      {sections.length === 0 ? (
        <p className="text-xs text-zinc-500">
          No sections yet. Add a hero, text, image, or FAQ block.
        </p>
      ) : null}

      <div className="space-y-2">
        {sections.map((section, index) => {
          const props = (section.props || {}) as Record<string, unknown>;
          const items = Array.isArray(props.items)
            ? (props.items as Array<{ question?: unknown; answer?: unknown }>)
            : [];

          return (
            <div
              key={section.id}
              className="flex items-start justify-between gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-700">
                    {section.type}
                  </span>
                  {!section.enabled && (
                    <span className="text-[10px] uppercase tracking-wide text-zinc-400">
                      hidden
                    </span>
                  )}
                </div>

                {section.type === "hero" && (
                  <div className="space-y-1">
                    <input
                      className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
                      value={typeof props.title === "string" ? props.title : ""}
                      onChange={e =>
                        updateProps(index, {
                          ...props,
                          title: e.target.value
                        })
                      }
                      placeholder="Hero title"
                    />
                    <input
                      className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
                      value={
                        typeof props.subtitle === "string" ? props.subtitle : ""
                      }
                      onChange={e =>
                        updateProps(index, {
                          ...props,
                          subtitle: e.target.value
                        })
                      }
                      placeholder="Hero subtitle"
                    />
                  </div>
                )}

                {(section.type === "text" || section.type === "richText") && (
                  <div className="space-y-1">
                    <TiptapEditor
                      defaultValue={
                        typeof props.html === "string" ? props.html : ""
                      }
                      defaultDoc={props.doc as JSONContent | undefined}
                      placeholder={
                        section.type === "richText"
                          ? "Write and format rich text for this block"
                          : "Write text for this block (you can format with the toolbar)"
                      }
                      onChangeHtml={(html, doc) =>
                        updateProps(index, {
                          ...props,
                          html,
                          doc
                        })
                      }
                    />
                  </div>
                )}

                {section.type === "image" && (
                  <div className="space-y-1">
                    <input
                      className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
                      value={typeof props.url === "string" ? props.url : ""}
                      onChange={e =>
                        updateProps(index, {
                          ...props,
                          url: e.target.value
                        })
                      }
                      placeholder="Image URL"
                    />
                    <input
                      className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
                      value={typeof props.alt === "string" ? props.alt : ""}
                      onChange={e =>
                        updateProps(index, {
                          ...props,
                          alt: e.target.value
                        })
                      }
                      placeholder="Alt text"
                    />
                  </div>
                )}

                {section.type === "faq" && (
                  <div className="space-y-1">
                    <input
                      className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
                      value={typeof props.title === "string" ? props.title : ""}
                      onChange={e =>
                        updateProps(index, {
                          ...props,
                          title: e.target.value
                        })
                      }
                      placeholder="FAQ section title"
                    />
                    <textarea
                      className="h-20 w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px] font-mono"
                      value={items
                        .map(
                          (item: { question?: unknown; answer?: unknown }) => {
                            const q =
                              typeof item.question === "string"
                                ? item.question
                                : "";
                            const a =
                              typeof item.answer === "string"
                                ? item.answer
                                : "";
                            return `${q}::${a}`;
                          }
                        )
                        .join("\n")}
                      onChange={e => {
                        const items = e.target.value
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
                        updateProps(index, {
                          ...props,
                          items
                        });
                      }}
                      placeholder={"Each line: question::answer"}
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  className="rounded border border-zinc-300 bg-white px-1 py-0.5 hover:bg-zinc-100"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  className="rounded border border-zinc-300 bg-white px-1 py-0.5 hover:bg-zinc-100"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => toggleEnabled(index)}
                  className="mt-1 rounded border border-zinc-300 bg-white px-1 py-0.5 hover:bg-zinc-100"
                >
                  {section.enabled ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  onClick={() => duplicateSection(index)}
                  className="mt-1 rounded border border-zinc-300 bg-white px-1 py-0.5 hover:bg-zinc-100"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => removeSection(index)}
                  className="mt-1 rounded border border-red-200 bg-white px-1 py-0.5 text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
