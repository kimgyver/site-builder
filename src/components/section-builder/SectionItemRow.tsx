import { ImageSectionEditor } from "../section-editors/ImageSectionEditor";
import FAQSectionEditor from "../section-editors/FAQSectionEditor";
import HtmlStructureSectionEditor from "../section-editors/HtmlStructureSectionEditor";
import ColumnsSectionEditor from "../section-editors/ColumnsSectionEditor";
import EmbedSectionEditor from "../section-editors/EmbedSectionEditor";
import PageStyleSectionEditor from "../section-editors/PageStyleSectionEditor";
import CalloutSectionEditor from "../section-editors/CalloutSectionEditor";
import AccordionSectionEditor from "../section-editors/AccordionSectionEditor";
import { HeroSectionEditor } from "../section-editors/HeroSectionEditor";
import { TextSectionEditor } from "../section-editors/TextSectionEditor";
import { SECTION_CATALOG } from "@/lib/sectionCatalog";
import type { EditableSection } from "@/types/sections";
import type { MediaItem, PageReferenceItem } from "@/types/references";

type SectionItemRowProps = {
  section: EditableSection;
  sectionIndex: number;
  draggedIndex: number | null;
  dragOverIndex: number | null;
  sections: EditableSection[];
  setDraggedIndex: (index: number | null) => void;
  setDragOverIndex: (index: number | null) => void;
  updateOrder: (nextSections: EditableSection[]) => void;
  patchProps: (
    sectionIndex: number,
    patch: Partial<Record<string, unknown>>
  ) => void;
  updateProps: (sectionIndex: number, props: Record<string, unknown>) => void;
  move: (sectionIndex: number, delta: number) => void;
  duplicateSection: (sectionIndex: number) => void;
  toggleEnabled: (sectionIndex: number) => void;
  removeSection: (sectionIndex: number) => void;
  libraryMedia: MediaItem[];
  libraryPages: PageReferenceItem[];
  isReferenceLibraryLoading: boolean;
  libraryMediaMeta: {
    total: number;
    limit: number;
  };
};

export function SectionItemRow({
  section,
  sectionIndex,
  draggedIndex,
  dragOverIndex,
  sections,
  setDraggedIndex,
  setDragOverIndex,
  updateOrder,
  patchProps,
  updateProps,
  move,
  duplicateSection,
  toggleEnabled,
  removeSection,
  libraryMedia,
  libraryPages,
  isReferenceLibraryLoading,
  libraryMediaMeta
}: SectionItemRowProps) {
  const sectionProps = (section.props || {}) as Record<string, unknown>;
  const isTextSection = section.type === "text" || section.type === "richText";

  return (
    <div
      key={section.id}
      data-section-index={sectionIndex}
      tabIndex={0}
      className={`flex w-full items-start justify-between gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs ${draggedIndex === sectionIndex ? "opacity-50" : ""}`}
      draggable
      onDragStart={event => {
        const target = event.target;
        const dragHandle =
          target instanceof HTMLElement
            ? target.closest('[data-section-drag-handle="true"]')
            : null;
        if (!dragHandle) {
          event.preventDefault();
          return;
        }
        setDraggedIndex(sectionIndex);
      }}
      onDragOver={event => {
        event.preventDefault();
        setDragOverIndex(sectionIndex);
      }}
      onDrop={() => {
        if (
          draggedIndex !== null &&
          dragOverIndex !== null &&
          draggedIndex !== dragOverIndex
        ) {
          const nextSections = [...sections];
          const [movedSection] = nextSections.splice(draggedIndex, 1);
          nextSections.splice(dragOverIndex, 0, movedSection);
          updateOrder(nextSections);
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
      }}
      onDragEnd={() => {
        setDraggedIndex(null);
        setDragOverIndex(null);
      }}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-700">
            {SECTION_CATALOG[section.type]?.label ?? section.type}
          </span>
          {!section.enabled && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-700">
              hidden (public)
            </span>
          )}
          <span
            data-section-drag-handle="true"
            className="ml-2 cursor-grab text-zinc-400"
            title="Drag to reorder"
          >
            ↕
          </span>
        </div>
        <div className={isTextSection ? "mt-2 overflow-x-auto" : "mt-2"}>
          {section.type === "hero" ? (
            <HeroSectionEditor
              props={sectionProps}
              patchProps={patch => patchProps(sectionIndex, patch)}
            />
          ) : section.type === "text" || section.type === "richText" ? (
            <div className="min-w-fit">
              <TextSectionEditor
                props={sectionProps}
                updateProps={nextProps => updateProps(sectionIndex, nextProps)}
                type={section.type}
              />
            </div>
          ) : section.type === "rawHtml" ? (
            <HtmlStructureSectionEditor
              props={sectionProps}
              updateProps={nextProps => updateProps(sectionIndex, nextProps)}
            />
          ) : section.type === "columns" ? (
            <ColumnsSectionEditor
              props={sectionProps}
              updateProps={nextProps => updateProps(sectionIndex, nextProps)}
            />
          ) : section.type === "image" ? (
            <ImageSectionEditor
              props={sectionProps}
              updateProps={nextProps => updateProps(sectionIndex, nextProps)}
              libraryMedia={libraryMedia}
              libraryPages={libraryPages}
              isLibraryLoading={isReferenceLibraryLoading}
              mediaTotal={libraryMediaMeta.total}
              mediaLimit={libraryMediaMeta.limit}
            />
          ) : section.type === "faq" ? (
            <FAQSectionEditor
              section={section}
              patchProps={patch => patchProps(sectionIndex, patch)}
              updateProps={nextProps => updateProps(sectionIndex, nextProps)}
            />
          ) : section.type === "embed" ? (
            <EmbedSectionEditor
              section={section}
              patchProps={patch => patchProps(sectionIndex, patch)}
              updateProps={nextProps => updateProps(sectionIndex, nextProps)}
            />
          ) : section.type === "pageStyle" ? (
            <PageStyleSectionEditor
              section={section}
              patchProps={patch => patchProps(sectionIndex, patch)}
              updateProps={nextProps => updateProps(sectionIndex, nextProps)}
            />
          ) : section.type === "callout" ? (
            <CalloutSectionEditor
              section={section}
              patchProps={patch => patchProps(sectionIndex, patch)}
              updateProps={nextProps => updateProps(sectionIndex, nextProps)}
            />
          ) : section.type === "accordion" ? (
            <AccordionSectionEditor
              section={section}
              patchProps={patch => patchProps(sectionIndex, patch)}
              updateProps={nextProps => updateProps(sectionIndex, nextProps)}
            />
          ) : null}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 text-[10px]">
        <button
          type="button"
          className="rounded border border-zinc-200 px-1.5 py-0.5 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
          onClick={() => move(sectionIndex, -1)}
        >
          ↑
        </button>
        <button
          type="button"
          className="rounded border border-zinc-200 px-1.5 py-0.5 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
          onClick={() => move(sectionIndex, 1)}
        >
          ↓
        </button>
        <button
          type="button"
          className="rounded border border-zinc-200 px-1.5 py-0.5 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
          onClick={() => duplicateSection(sectionIndex)}
        >
          Duplicate
        </button>
        <button
          type="button"
          className="rounded border border-zinc-200 px-1.5 py-0.5 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
          onClick={() => toggleEnabled(sectionIndex)}
        >
          {section.enabled ? "Hide (public)" : "Show (public)"}
        </button>
        <button
          type="button"
          className="rounded border border-red-200 px-1.5 py-0.5 text-red-600 hover:border-red-300 hover:bg-red-50"
          onClick={() => removeSection(sectionIndex)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
