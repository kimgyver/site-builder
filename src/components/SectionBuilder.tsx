"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import SlashMenu from "@/tiptap/SlashMenu";
import { getSlashCommands } from "@/tiptap/slashCommands";
import { Toast } from "@/components/Toast";
// import { TiptapEditor } from "@/components/TiptapEditor";
import type { SectionBuilderProps } from "@/types/components";
import type { EditableSection, SectionType } from "@/types/sections";
import { SECTION_CATALOG, SECTION_TYPES_IN_ORDER } from "@/lib/sectionCatalog";
import type { MediaItem, PageReferenceItem } from "@/types/references";
import { SectionItemRow } from "./section-builder/SectionItemRow";

export function SectionBuilder({
  pageId,
  expectedUpdatedAt,
  initialSections,
  onSectionsChange
}: SectionBuilderProps & {
  onSectionsChange?: (sections: EditableSection[]) => void;
}) {
  // 드래그 핸들 상태 (섹션 전체에서 공유)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const initialSorted = useMemo(
    () => [...initialSections].sort((a, b) => a.order - b.order),
    [initialSections]
  );

  // Slash menu state
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [slashMenuQuery, setSlashMenuQuery] = useState("");
  const [slashMenuFocusedIndex, setSlashMenuFocusedIndex] = useState<
    number | null
  >(null);
  const [slashMenuCommands, setSlashMenuCommands] = useState(
    [] as ReturnType<typeof getSlashCommands>
  );
  const sectionBuilderRef = useRef<HTMLDivElement>(null);

  const [sections, setSections] = useState<EditableSection[]>(initialSorted);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: ""
  });
  const sectionsRef = useRef<EditableSection[]>(initialSorted);
  const tempIdRef = useRef(0);
  const [libraryPages, setLibraryPages] = useState<PageReferenceItem[]>([]);
  const [libraryMedia, setLibraryMedia] = useState<MediaItem[]>([]);
  const [libraryMediaMeta, setLibraryMediaMeta] = useState<{
    total: number;
    limit: number;
  }>({ total: 0, limit: 0 });
  const [isReferenceLibraryLoading, setIsReferenceLibraryLoading] =
    useState(true);

  const serializeSections = (items: EditableSection[]) =>
    JSON.stringify(
      items.map(section => ({
        id: section.id,
        type: section.type,
        order: section.order,
        enabled: section.enabled,
        props: section.props
      }))
    );

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
    const incoming = initialSorted;
    const currentSerialized = serializeSections(sectionsRef.current);
    const incomingSerialized = serializeSections(incoming);

    if (currentSerialized === incomingSerialized) {
      return;
    }

    sectionsRef.current = incoming;
    setSections(incoming);
  }, [initialSorted]);

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
          mediaTotal?: number;
          mediaLimit?: number;
        };
        if (!active) return;
        setLibraryPages(Array.isArray(json.pages) ? json.pages : []);
        setLibraryMedia(Array.isArray(json.media) ? json.media : []);
        setLibraryMediaMeta({
          total:
            typeof json.mediaTotal === "number"
              ? json.mediaTotal
              : Array.isArray(json.media)
                ? json.media.length
                : 0,
          limit: typeof json.mediaLimit === "number" ? json.mediaLimit : 0
        });
      } catch {
        // no-op
      } finally {
        if (active) {
          setIsReferenceLibraryLoading(false);
        }
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

  const convertSectionType = (index: number, newType: SectionType) => {
    const meta = SECTION_CATALOG[newType];
    if (!meta) return;

    setSectionsSynced(prev => {
      const section = prev[index];
      if (!section) return prev;
      const currentProps = (section.props || {}) as Record<string, unknown>;
      const nextProps = meta.convertProps
        ? meta.convertProps(currentProps)
        : meta.createDefaultProps();
      const next = [...prev];
      next[index] = {
        ...section,
        type: newType,
        props: nextProps
      };
      return next;
    });
    setToast({ show: true, message: `Section converted to ${newType}!` });
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
    const meta = SECTION_CATALOG[type];
    if (!meta) return;
    tempIdRef.current += 1;
    const id = `temp-${tempIdRef.current}`;
    const baseProps = meta.createDefaultProps();
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

  const patchProps = (
    index: number,
    patch: Partial<Record<string, unknown>>
  ) => {
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

  const getFocusedIndexFromActiveElement = () => {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return null;
    const attr = active.getAttribute("data-section-index");
    if (!attr) return null;
    const parsed = Number(attr);
    return Number.isFinite(parsed) ? parsed : null;
  };

  useEffect(() => {
    if (!slashMenuOpen) return;
    setSlashMenuCommands(
      getSlashCommands({
        addSection,
        sections: sectionsRef.current,
        focusedIndex: slashMenuFocusedIndex,
        convertSectionType
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slashMenuOpen, slashMenuFocusedIndex]);

  return (
    <>
      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
      />
      <div
        ref={sectionBuilderRef}
        className="mx-auto w-full max-w-5xl space-y-3"
        tabIndex={0}
        onKeyDown={e => {
          // Slash menu trigger
          if (e.key === "/") {
            e.preventDefault();
            const rect = sectionBuilderRef.current?.getBoundingClientRect();
            setSlashMenuOpen(true);
            setSlashMenuFocusedIndex(getFocusedIndexFromActiveElement());
            setSlashMenuPosition(
              rect
                ? { top: rect.top + 40, left: rect.left + 20 }
                : { top: 40, left: 20 }
            );
            setSlashMenuQuery("");
          }
          // 섹션 이동: Ctrl+ArrowUp/ArrowDown
          if (e.ctrlKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            const focused = document.activeElement;
            // 현재 포커스된 섹션 index 찾기
            const sectionEls = sectionBuilderRef.current?.querySelectorAll(
              "[data-section-index]"
            );
            let currentIndex = -1;
            if (sectionEls) {
              sectionEls.forEach((el, idx) => {
                if (el === focused) currentIndex = idx;
              });
            }
            if (currentIndex >= 0) {
              if (e.key === "ArrowUp") move(currentIndex, -1);
              if (e.key === "ArrowDown") move(currentIndex, 1);
            }
          }
          // 섹션 추가: Ctrl+Alt+N
          if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "n") {
            addSection("text");
          }
          // block 변환 메뉴: Ctrl+Alt+B
          if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "b") {
            e.preventDefault();
            setSlashMenuOpen(true);
            setSlashMenuFocusedIndex(getFocusedIndexFromActiveElement());
            setSlashMenuPosition({ top: 40, left: 20 });
            setSlashMenuQuery("block");
          }
        }}
      >
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

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-zinc-500">Add section:</span>
          {SECTION_TYPES_IN_ORDER.map(type => {
            const meta = SECTION_CATALOG[type];
            return (
              <button
                key={type}
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                onClick={() => addSection(type)}
              >
                {meta?.icon ? <span>{meta.icon}</span> : null}
                <span>{meta?.label ?? type}</span>
              </button>
            );
          })}
        </div>

        {/* Autosave status UI removed (no longer used) */}

        {sections.length === 0 ? (
          <p className="text-xs text-zinc-500">
            No sections yet. Add hero/text blocks, or use HTML Structure for
            external CMS markup.
          </p>
        ) : null}

        <div className="space-y-2">
          {sections.map((section, index) => (
            <SectionItemRow
              key={section.id}
              section={section}
              sectionIndex={index}
              draggedIndex={draggedIndex}
              dragOverIndex={dragOverIndex}
              sections={sections}
              setDraggedIndex={setDraggedIndex}
              setDragOverIndex={setDragOverIndex}
              updateOrder={updateOrder}
              patchProps={patchProps}
              updateProps={updateProps}
              move={move}
              duplicateSection={duplicateSection}
              toggleEnabled={toggleEnabled}
              removeSection={removeSection}
              libraryMedia={libraryMedia}
              libraryPages={libraryPages}
              isReferenceLibraryLoading={isReferenceLibraryLoading}
              libraryMediaMeta={libraryMediaMeta}
            />
          ))}
        </div>

        {slashMenuOpen && (
          <SlashMenu
            position={slashMenuPosition}
            query={slashMenuQuery}
            commands={slashMenuCommands}
            onClose={() => setSlashMenuOpen(false)}
          />
        )}
      </div>
    </>
  );
}
