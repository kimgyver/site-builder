import type { EditableSection, SectionType } from "@/types/sections";
import { SECTION_CATALOG, SECTION_TYPES_IN_ORDER } from "@/lib/sectionCatalog";
import type { SectionSlashCommand } from "./SlashMenu";

export function getSlashCommands({
  addSection,
  sections,
  focusedIndex,
  convertSectionType
}: {
  addSection: (type: SectionType) => void;
  sections: EditableSection[];
  focusedIndex: number | null;
  convertSectionType: (index: number, newType: SectionType) => void;
}): SectionSlashCommand[] {
  const base = SECTION_TYPES_IN_ORDER.map(type => {
    const meta = SECTION_CATALOG[type];
    return {
      id: `/${type}`,
      label: meta?.label ?? type,
      keywords: meta?.keywords ?? [],
      onRun: () => addSection(type)
    } satisfies SectionSlashCommand;
  });

  // If a section is focused, provide conversion commands as well.
  if (focusedIndex !== null && sections[focusedIndex]) {
    const convert = SECTION_TYPES_IN_ORDER.map(type => {
      const meta = SECTION_CATALOG[type];
      return {
        id: `convert:${type}`,
        label: `Convert to ${meta?.label ?? type}`,
        keywords: ["convert", "type", ...(meta?.keywords ?? [])],
        onRun: () => convertSectionType(focusedIndex, type)
      } satisfies SectionSlashCommand;
    });
    return [...base, ...convert];
  }

  return base;
}
