"use client";
import { ImageSectionEditor } from "./section-editors/ImageSectionEditor";

import FAQSectionEditor from "./section-editors/FAQSectionEditor";

import EmbedSectionEditor from "./section-editors/EmbedSectionEditor";

import PageStyleSectionEditor from "./section-editors/PageStyleSectionEditor";

import CalloutSectionEditor from "./section-editors/CalloutSectionEditor";

import AccordionSectionEditor from "./section-editors/AccordionSectionEditor";

import { useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "@/components/Toast";
// import { TiptapEditor } from "@/components/TiptapEditor";
import type { SectionBuilderProps } from "@/types/components";
import type { EditableSection, SectionType } from "@/types/sections";
import { HeroSectionEditor } from "./section-editors/HeroSectionEditor";
import { TextSectionEditor } from "./section-editors/TextSectionEditor";
import type { MediaItem, PageReferenceItem } from "@/types/references";

export function SectionBuilder({
  pageId,
  expectedUpdatedAt,
  initialSections,
  onSectionsChange
}: SectionBuilderProps & {
  onSectionsChange?: (sections: EditableSection[]) => void;
}) {
  const initialSorted = useMemo(
    () => [...initialSections].sort((a, b) => a.order - b.order),
    [initialSections]
  );

  const [sections, setSections] = useState<EditableSection[]>(initialSorted);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: ""
  });
  const sectionsRef = useRef<EditableSection[]>(initialSorted);
  const tempIdRef = useRef(0);
  const [libraryPages, setLibraryPages] = useState<PageReferenceItem[]>([]);
  const [libraryMedia, setLibraryMedia] = useState<MediaItem[]>([]);

  const setSectionsSynced = (
    updater: (prev: EditableSection[]) => EditableSection[]
  ) => {
    const next = updater(sectionsRef.current);
    sectionsRef.current = next;
    setSections(next);
    if (onSectionsChange) onSectionsChange(next);
  };

  // Remove autosave effect for admin usage; saving is now explicit via parent form

  useEffect(() => {
    let active = true;

    const loadLibrary = async () => {
      try {
        const response = await fetch("/api/admin/references", {
          method: "GET",
          cache: "no-store",
          credentials: "include"
        });
        if (!response.ok) return;
        const json = (await response.json()) as {
          pages?: PageReferenceItem[];
          media?: MediaItem[];
        };
        if (!active) return;
        setLibraryPages(Array.isArray(json.pages) ? json.pages : []);
        setLibraryMedia(Array.isArray(json.media) ? json.media : []);
      } catch {
        // no-op
      }
    };

    void loadLibrary();
    return () => {
      active = false;
    };
  }, []);

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
      baseProps.backgroundColor = "#18181b";
      baseProps.textColor = "#fafafa";
      baseProps.subtitleColor = "#d4d4d8";
    } else if (type === "text" || type === "richText") {
      baseProps.html = "<p>New text block</p>";
    } else if (type === "image") {
      baseProps.url = "https://placehold.co/1200x600";
      baseProps.alt = "Placeholder image";
    } else if (type === "faq") {
      baseProps.title = "Frequently asked questions";
      baseProps.items = [{ question: "Question", answer: "Answer" }];
    } else if (type === "embed") {
      baseProps.provider = "youtube";
      baseProps.url = "";
      baseProps.title = "";
    } else if (type === "pageStyle") {
      baseProps.backgroundColor = "#f8fafc";
    } else if (type === "callout") {
      baseProps.tone = "info";
      baseProps.title = "Notice";
      baseProps.body = "Add important note here.";
    } else if (type === "accordion") {
      baseProps.title = "Accordion";
      baseProps.items = [
        { question: "Accordion item", answer: "Accordion content" }
      ];
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
    setToast({ show: true, message: `Section added!` });
  };

  const updateProps = (index: number, props: Record<string, unknown>) => {
    setSectionsSynced(prev =>
      prev.map((s, i) => (i === index ? { ...s, props } : s))
    );
  };

  const patchProps = (index: number, patch: Record<string, unknown>) => {
    setSectionsSynced(prev =>
      prev.map((s, i) =>
        i === index
          ? {
              ...s,
              props: {
                ...(s.props ?? {}),
                ...patch
              }
            }
          : s
      )
    );
  };

  return (
    <>
      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
      />
      <div className="space-y-3">
        <input type="hidden" name="pageId" value={pageId} />
        <input
          type="hidden"
          name="expectedUpdatedAt"
          value={expectedUpdatedAt}
          readOnly
        />
        <input
          type="hidden"
          name="sections"
          value={JSON.stringify(sections)}
          readOnly
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
          <button
            type="button"
            onClick={() => addSection("embed")}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 hover:bg-zinc-100"
          >
            Embed
          </button>
          <button
            type="button"
            onClick={() => addSection("pageStyle")}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 hover:bg-zinc-100"
          >
            Page style
          </button>
          <button
            type="button"
            onClick={() => addSection("callout")}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 hover:bg-zinc-100"
          >
            Callout
          </button>
          <button
            type="button"
            onClick={() => addSection("accordion")}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 hover:bg-zinc-100"
          >
            Accordion
          </button>
        </div>

        {/* Autosave status UI removed (no longer used) */}

        {sections.length === 0 ? (
          <p className="text-xs text-zinc-500">
            No sections yet. Add a hero, text, image, or FAQ block.
          </p>
        ) : null}

        <div className="space-y-2">
          {sections.map((section, index) => {
            const props = (section.props || {}) as Record<string, unknown>;
            // items variable removed (was unused)

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
                    <HeroSectionEditor
                      props={props}
                      patchProps={patch => patchProps(index, patch)}
                    />
                  )}

                  {(section.type === "text" || section.type === "richText") && (
                    <TextSectionEditor
                      props={props}
                      updateProps={newProps => updateProps(index, newProps)}
                      type={section.type}
                    />
                  )}

                  {section.type === "image" && (
                    <ImageSectionEditor
                      props={props}
                      updateProps={newProps => updateProps(index, newProps)}
                      libraryMedia={libraryMedia}
                      libraryPages={libraryPages}
                    />
                  )}

                  {section.type === "faq" && (
                    <FAQSectionEditor
                      section={section}
                      patchProps={(patch: Partial<Record<string, unknown>>) =>
                        patchProps(index, patch)
                      }
                      updateProps={(newProps: Record<string, unknown>) =>
                        updateProps(index, newProps)
                      }
                    />
                  )}

                  {section.type === "embed" && (
                    <EmbedSectionEditor
                      section={section}
                      patchProps={(patch: Partial<Record<string, unknown>>) =>
                        patchProps(index, patch)
                      }
                      updateProps={(newProps: Record<string, unknown>) =>
                        updateProps(index, newProps)
                      }
                    />
                  )}

                  {section.type === "pageStyle" && (
                    <PageStyleSectionEditor
                      section={section}
                      patchProps={(patch: Partial<Record<string, unknown>>) =>
                        patchProps(index, patch)
                      }
                      updateProps={(newProps: Record<string, unknown>) =>
                        updateProps(index, newProps)
                      }
                    />
                  )}

                  {section.type === "callout" && (
                    <CalloutSectionEditor
                      section={section}
                      patchProps={(patch: Partial<Record<string, unknown>>) =>
                        patchProps(index, patch)
                      }
                      updateProps={(newProps: Record<string, unknown>) =>
                        updateProps(index, newProps)
                      }
                    />
                  )}

                  {section.type === "accordion" && (
                    <AccordionSectionEditor
                      section={section}
                      patchProps={(patch: Partial<Record<string, unknown>>) =>
                        patchProps(index, patch)
                      }
                      updateProps={(newProps: Record<string, unknown>) =>
                        updateProps(index, newProps)
                      }
                    />
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
    </>
  );
}
