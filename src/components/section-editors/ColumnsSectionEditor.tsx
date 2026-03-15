import React from "react";
import { TiptapEditor } from "@/components/TiptapEditor";

const DESKTOP_LEFT_TEMPLATE = `NZQA
© 2022 - 2026 DUKE Institute of Studies.
12/14 Huron St, Takapuna Beach, Auckland 09 488 0505.
Powered by Web Genius.`;

const DESKTOP_CENTER_TEMPLATE = `CONTACT DETAILS
Phone: 099411696
Hours: Monday to Friday 8am-6pm
Address: 12/14 Huron St, Takapuna Beach, Auckland
Follow us on Facebook
QR CODE`;

const DESKTOP_RIGHT_TEMPLATE = `QUICK LINKS
Home
About
Courses
High School Pathways
Homestay
Enrol Now
Contact`;

const MOBILE_TEMPLATE = `Home
About
Courses
High School Pathways
Homestay
Enrol Now
Contact

QR CODE
© 2022 - 2026 DUKE Institute of Studies. 12/14 Huron St, Takapuna Beach, Auckland 09 488 0505.`;

export default function ColumnsSectionEditor({
  props,
  updateProps
}: {
  props: Record<string, unknown>;
  updateProps: (props: Record<string, unknown>) => void;
}) {
  const desktopColumns = props.desktopColumns === 3 ? 3 : 2;
  const ratio =
    props.ratio === "2:1" ||
    props.ratio === "1:2" ||
    props.ratio === "2:1:1" ||
    props.ratio === "1:2:1" ||
    props.ratio === "1:1:2"
      ? props.ratio
      : desktopColumns === 3
        ? "1:1:1"
        : "1:1";
  const mobileMode =
    props.mobileMode === "customHtml" ? "customHtml" : "stack";

  const applyDesktopMobileTemplate = () => {
    updateProps({
      ...props,
      desktopColumns: 3,
      ratio: "1:1:1",
      reverseOnMobile: false,
      mobileMode: "customHtml",
      leftHtml: DESKTOP_LEFT_TEMPLATE,
      rightHtml: DESKTOP_CENTER_TEMPLATE,
      thirdHtml: DESKTOP_RIGHT_TEMPLATE,
      mobileHtml: MOBILE_TEMPLATE
    });
  };

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-2 text-[10px] text-zinc-600">
        <div className="mb-1 font-medium text-zinc-700">Responsive presets</div>
        <button
          type="button"
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-[10px] text-zinc-700 hover:bg-zinc-100"
          onClick={applyDesktopMobileTemplate}
        >
          Apply desktop + mobile nav/footer template
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
          Desktop columns
          <select
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
            value={String(desktopColumns)}
            onChange={e => {
              const nextColumns = e.target.value === "3" ? 3 : 2;
              const nextRatio =
                nextColumns === 3
                  ? ratio === "2:1:1" || ratio === "1:2:1" || ratio === "1:1:2"
                    ? ratio
                    : "1:1:1"
                  : ratio === "2:1" || ratio === "1:2"
                    ? ratio
                    : "1:1";
              updateProps({
                ...props,
                desktopColumns: nextColumns,
                ratio: nextRatio
              });
            }}
          >
            <option value="2">2 columns</option>
            <option value="3">3 columns</option>
          </select>
        </label>
        <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
          Column ratio
          <select
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
            value={ratio}
            onChange={e =>
              updateProps({
                ...props,
                ratio: e.target.value
              })
            }
          >
            {desktopColumns === 2 ? (
              <>
                <option value="1:1">1:1</option>
                <option value="2:1">2:1</option>
                <option value="1:2">1:2</option>
              </>
            ) : (
              <>
                <option value="1:1:1">1:1:1</option>
                <option value="2:1:1">2:1:1</option>
                <option value="1:2:1">1:2:1</option>
                <option value="1:1:2">1:1:2</option>
              </>
            )}
          </select>
        </label>
        <label className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] text-zinc-600">
          Mobile mode
          <select
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px]"
            value={mobileMode}
            onChange={e =>
              updateProps({
                ...props,
                mobileMode: e.target.value === "customHtml" ? "customHtml" : "stack"
              })
            }
          >
            <option value="stack">Stack desktop columns</option>
            <option value="customHtml">Use custom mobile HTML</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-2 text-[10px] text-zinc-600">
          <input
            type="checkbox"
            checked={props.reverseOnMobile === true}
            disabled={mobileMode === "customHtml"}
            onChange={e =>
              updateProps({
                ...props,
                reverseOnMobile: e.target.checked
              })
            }
          />
          <span>
            Reverse column order on mobile
            {mobileMode === "customHtml" ? " (stack mode only)" : ""}
          </span>
        </label>
      </div>

      <div className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-2 text-[10px] text-zinc-600">
        <div className="mb-1 font-medium text-zinc-700">Left column text</div>
        <div className="mb-2 text-zinc-500">
          Desktop left area content. One line per sentence/item.
        </div>
        <TiptapEditor
          defaultValue={typeof props.leftHtml === "string" ? props.leftHtml : ""}
          placeholder="e.g. Company intro, address, copyright"
          onChangeHtml={leftHtml => {
            const current = typeof props.leftHtml === "string" ? props.leftHtml : "";
            if (current === leftHtml) {
              return;
            }
            updateProps({
              ...props,
              leftHtml
            });
          }}
        />
      </div>

      <div className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-2 text-[10px] text-zinc-600">
        <div className="mb-1 font-medium text-zinc-700">Right column text</div>
        <div className="mb-2 text-zinc-500">
          Desktop right area content. Use line breaks to separate entries.
        </div>
        <TiptapEditor
          defaultValue={typeof props.rightHtml === "string" ? props.rightHtml : ""}
          placeholder="e.g. Contact details, business hours"
          onChangeHtml={rightHtml => {
            const current = typeof props.rightHtml === "string" ? props.rightHtml : "";
            if (current === rightHtml) {
              return;
            }
            updateProps({
              ...props,
              rightHtml
            });
          }}
        />
      </div>

      {desktopColumns === 3 ? (
        <div className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-2 text-[10px] text-zinc-600">
          <div className="mb-1 font-medium text-zinc-700">Third column text</div>
          <div className="mb-2 text-zinc-500">
            Desktop third area content. Usually used for quick links or extra info.
          </div>
          <TiptapEditor
            defaultValue={typeof props.thirdHtml === "string" ? props.thirdHtml : ""}
            placeholder="e.g. Quick links, notices"
            onChangeHtml={thirdHtml => {
              const current = typeof props.thirdHtml === "string" ? props.thirdHtml : "";
              if (current === thirdHtml) {
                return;
              }
              updateProps({
                ...props,
                thirdHtml
              });
            }}
          />
        </div>
      ) : null}

      {mobileMode === "customHtml" ? (
        <div className="block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-2 text-[10px] text-zinc-600">
          <div className="mb-1 font-medium text-zinc-700">Mobile-only text</div>
          <div className="mb-2 text-zinc-500">
            This content is shown only on mobile when Mobile mode is set to custom.
          </div>
          <TiptapEditor
            defaultValue={typeof props.mobileHtml === "string" ? props.mobileHtml : ""}
            placeholder="e.g. Compact mobile footer/navigation text"
            onChangeHtml={mobileHtml => {
              const current = typeof props.mobileHtml === "string" ? props.mobileHtml : "";
              if (current === mobileHtml) {
                return;
              }
              updateProps({
                ...props,
                mobileHtml
              });
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
