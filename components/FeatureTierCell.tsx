"use client";

import { useState, useTransition } from "react";
import { updateFeatureTierSettingAction } from "@/lib/actions";
import type { FeatureStatus, PricingModel } from "@/lib/data/catalog";

const STATUS_LABEL: Record<FeatureStatus, string> = {
  included: "Included",
  addon: "Paid add-on",
  unavailable: "Not available",
};

const PRICING_MODEL_LABEL: Record<PricingModel, string> = {
  fixed: "Fixed $/month",
  per_seat: "$/seat/month",
  percent_of_product: "% of product price",
};

export default function FeatureTierCell(props: {
  productId: string;
  featureId: string;
  tierId: string;
  initialStatus: FeatureStatus;
  initialPricingModel: PricingModel | null;
  initialPriceValue: number | null;
}) {
  const { productId, featureId, tierId } = props;
  const [status, setStatus] = useState<FeatureStatus>(props.initialStatus);
  const [pricingModel, setPricingModel] = useState<PricingModel>(
    props.initialPricingModel ?? "fixed"
  );
  const [priceValue, setPriceValue] = useState<string>(
    props.initialPriceValue != null ? String(props.initialPriceValue) : ""
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const dirty =
    status !== props.initialStatus ||
    (status === "addon" &&
      (pricingModel !== (props.initialPricingModel ?? "fixed") ||
        priceValue !== (props.initialPriceValue != null ? String(props.initialPriceValue) : "")));

  function save() {
    setSaved(false);
    startTransition(async () => {
      await updateFeatureTierSettingAction({
        productId,
        featureId,
        tierId,
        status,
        pricingModel: status === "addon" ? pricingModel : null,
        priceValue: status === "addon" ? Number(priceValue) || 0 : null,
      });
      setSaved(true);
    });
  }

  const accent =
    status === "included"
      ? "var(--ledger-green)"
      : status === "addon"
        ? "var(--amber)"
        : "var(--hairline-strong)";

  const tint =
    status === "included"
      ? "var(--ledger-green-tint)"
      : status === "addon"
        ? "var(--amber-tint)"
        : "var(--paper)";

  const selectClass =
    "w-full rounded-md border hairline bg-white px-2.5 py-1.5 text-xs outline-none transition-colors hover:border-[var(--hairline-strong)] focus:border-[var(--ledger-green)] focus:shadow-[0_0_0_2px_var(--ledger-green-ring)]";

  return (
    <div
      className="min-w-[180px] space-y-1.5 rounded-md p-2"
      style={{ background: tint, boxShadow: `inset 3px 0 0 ${accent}` }}
    >
      <select
        value={status}
        onChange={(e) => {
          setStatus(e.target.value as FeatureStatus);
          setSaved(false);
        }}
        className={selectClass}
      >
        {Object.entries(STATUS_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {status === "addon" && (
        <>
          <select
            value={pricingModel}
            onChange={(e) => {
              setPricingModel(e.target.value as PricingModel);
              setSaved(false);
            }}
            className={selectClass}
          >
            {Object.entries(PRICING_MODEL_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            step="0.01"
            value={priceValue}
            onChange={(e) => {
              setPriceValue(e.target.value);
              setSaved(false);
            }}
            placeholder={pricingModel === "percent_of_product" ? "e.g. 10" : "e.g. 200"}
            className={`${selectClass} font-mono-figures`}
          />
        </>
      )}

      {dirty && (
        <button
          onClick={save}
          disabled={isPending}
          className="w-full rounded-md bg-[var(--ledger-green)] px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--ledger-green-dark)] disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      )}
      {!dirty && saved && (
        <p className="flex items-center justify-center gap-1 text-[10px] font-medium text-[var(--ledger-green)]">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Saved
        </p>
      )}
    </div>
  );
}
