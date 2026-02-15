"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TiptapEditor } from "@/components/TiptapEditor";
import type { SectionBuilderProps } from "@/types/components";
import type { EditableSection, SectionType } from "@/types/sections";
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
  const sectionsKey = useMemo(() => JSON.stringify(sections), [sections]);
  const sectionsRef = useRef<EditableSection[]>(initialSorted);
  const tempIdRef = useRef(0);
  const autosaveTimerRef = useRef<number | null>(null);
  const skipFirstAutosaveRef = useRef(true);
  const [expectedUpdatedAtValue, setExpectedUpdatedAtValue] =
    useState(expectedUpdatedAt);
  const [autosaveState, setAutosaveState] = useState<
    "idle" | "saving" | "saved" | "conflict" | "db-unavailable" | "error"
  >("idle");
  const [lastSavedAtText, setLastSavedAtText] = useState<string>("");
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
    <div className="space-y-3">
      <input type="hidden" name="pageId" value={pageId} />
      <input
        type="hidden"
        name="expectedUpdatedAt"
        value={expectedUpdatedAtValue}
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

      <div className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-600">
        {autosaveState === "idle" || autosaveState === "saved"
          ? `Autosave ready${lastSavedAtText ? ` · last saved ${lastSavedAtText}` : ""}`
          : null}
        {autosaveState === "saving" ? "Autosaving…" : null}
        {autosaveState === "conflict"
          ? "Autosave conflict: another editor changed this page. Reload before saving."
          : null}
        {autosaveState === "db-unavailable"
          ? "Autosave paused: database is temporarily unavailable."
          : null}
        {autosaveState === "error"
          ? "Autosave failed. You can still save manually."
          : null}
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
                        patchProps(index, { title: e.target.value })
                      }
                      placeholder="Hero title"
                    />
                    <input
                      className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
                      value={
                        typeof props.subtitle === "string" ? props.subtitle : ""
                      }
                      onChange={e =>
                        patchProps(index, { subtitle: e.target.value })
                      }
                      placeholder="Hero subtitle"
                    />
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <label className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
                        BG color
                        <input
                          type="color"
                          className="mt-1 h-7 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0"
                          value={
                            typeof props.backgroundColor === "string"
                              ? props.backgroundColor
                              : "#18181b"
                          }
                          onInput={e =>
                            patchProps(index, {
                              backgroundColor: (e.target as HTMLInputElement)
                                .value
                            })
                          }
                          onChange={e =>
                            patchProps(index, {
                              backgroundColor: e.target.value
                            })
                          }
                          onBlur={e =>
                            patchProps(index, {
                              backgroundColor: e.currentTarget.value
                            })
                          }
                          onPointerUp={e =>
                            patchProps(index, {
                              backgroundColor: e.currentTarget.value
                            })
                          }
                        />
                      </label>
                      <label className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
                        Text color
                        <input
                          type="color"
                          className="mt-1 h-7 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0"
                          value={
                            typeof props.textColor === "string"
                              ? props.textColor
                              : "#fafafa"
                          }
                          onInput={e =>
                            patchProps(index, {
                              textColor: (e.target as HTMLInputElement).value
                            })
                          }
                          onChange={e =>
                            patchProps(index, {
                              textColor: e.target.value
                            })
                          }
                          onBlur={e =>
                            patchProps(index, {
                              textColor: e.currentTarget.value
                            })
                          }
                          onPointerUp={e =>
                            patchProps(index, {
                              textColor: e.currentTarget.value
                            })
                          }
                        />
                      </label>
                      <label className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
                        Subtitle color
                        <input
                          type="color"
                          className="mt-1 h-7 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0"
                          value={
                            typeof props.subtitleColor === "string"
                              ? props.subtitleColor
                              : "#d4d4d8"
                          }
                          onInput={e =>
                            patchProps(index, {
                              subtitleColor: (e.target as HTMLInputElement)
                                .value
                            })
                          }
                          onChange={e =>
                            patchProps(index, {
                              subtitleColor: e.target.value
                            })
                          }
                          onBlur={e =>
                            patchProps(index, {
                              subtitleColor: e.currentTarget.value
                            })
                          }
                          onPointerUp={e =>
                            patchProps(index, {
                              subtitleColor: e.currentTarget.value
                            })
                          }
                        />
                      </label>
                    </div>
                  </div>
                )}

                {(section.type === "text" || section.type === "richText") && (
                  <div className="space-y-1">
                    <TiptapEditor
                      defaultValue={
                        typeof props.html === "string" ? props.html : ""
                      }
                      placeholder={
                        section.type === "richText"
                          ? "Write and format rich text for this block"
                          : "Write text for this block (you can format with the toolbar)"
                      }
                      onChangeHtml={html =>
                        updateProps(index, {
                          ...props,
                          html
                        })
                      }
                    />
                  </div>
                )}

                {section.type === "image" && (
                  <div className="space-y-1">
                    <div className="mb-2 grid grid-cols-2 gap-2">
                      {libraryMedia.map(item => {
                        // 간단한 이미지 URL 판별
                        const isImage =
                          (typeof item.url === "string" &&
                            /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(
                              item.url
                            )) ||
                          item.url.startsWith("https://placehold.co/") ||
                          item.url.startsWith("https://imgnews") ||
                          item.url.startsWith("https://images") ||
                          item.url.startsWith("https://pstatic") ||
                          item.url.startsWith("https://cdn") ||
                          item.url.startsWith("/public/");
                        return (
                          <button
                            key={item.url}
                            type="button"
                            className={`flex flex-col items-center rounded border border-zinc-300 bg-white p-2 text-[11px] hover:bg-zinc-100 ${props.url === item.url ? "ring-2 ring-blue-400" : ""}`}
                            onClick={() =>
                              updateProps(index, {
                                ...props,
                                url: item.url
                              })
                            }
                          >
                            {isImage ? (
                              <img
                                src={item.url}
                                alt={item.label || "Preview"}
                                className="mb-1 h-16 w-full object-cover rounded"
                                style={{ maxWidth: 120 }}
                              />
                            ) : (
                              <div className="mb-1 flex h-16 w-full items-center justify-center bg-zinc-100 rounded">
                                <span className="text-xs text-zinc-500">
                                  {item.url.includes("youtube")
                                    ? "YouTube"
                                    : item.url.includes("maps")
                                      ? "Google Maps"
                                      : "Link"}
                                </span>
                              </div>
                            )}
                            <span className="truncate w-full text-center">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
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
                    <select
                      className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
                      value={typeof props.href === "string" ? props.href : ""}
                      onChange={e =>
                        updateProps(index, {
                          ...props,
                          href: e.target.value || null
                        })
                      }
                    >
                      <option value="">No internal link</option>
                      {libraryPages.map(item => (
                        <option key={item.id} value={`/${item.slug}`}>
                          /{item.slug} · {item.title}
                        </option>
                      ))}
                    </select>
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

                {section.type === "embed" && (
                  <div className="space-y-1">
                    <select
                      className="w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px]"
                      value={
                        props.provider === "maps" ||
                        props.provider === "youtube"
                          ? String(props.provider)
                          : "youtube"
                      }
                      onChange={e =>
                        updateProps(index, {
                          ...props,
                          provider:
                            e.target.value === "maps" ? "maps" : "youtube"
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
                        updateProps(index, {
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
                        updateProps(index, {
                          ...props,
                          title: e.target.value
                        })
                      }
                      placeholder="Embed title (optional)"
                    />
                  </div>
                )}

                {section.type === "pageStyle" && (
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
                          updateProps(index, {
                            ...props,
                            backgroundColor: e.target.value
                          })
                        }
                      />
                    </label>
                    <p className="text-[10px] text-zinc-500">
                      Applies to whole page background. Keep one enabled Page
                      style section.
                    </p>
                  </div>
                )}

                {section.type === "callout" && (
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
                        updateProps(index, {
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
                        updateProps(index, {
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
                        updateProps(index, {
                          ...props,
                          body: e.target.value
                        })
                      }
                      placeholder="Callout content"
                    />
                  </div>
                )}

                {section.type === "accordion" && (
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
                      placeholder="Accordion section title"
                    />
                    <textarea
                      className="h-24 w-full rounded-md border border-zinc-300 px-2 py-1 text-[11px] font-mono"
                      value={items
                        .map(item => {
                          const q =
                            typeof item.question === "string"
                              ? item.question
                              : "";
                          const a =
                            typeof item.answer === "string" ? item.answer : "";
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
                        updateProps(index, {
                          ...props,
                          items: nextItems
                        });
                      }}
                      placeholder="Each line: question::answer"
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
