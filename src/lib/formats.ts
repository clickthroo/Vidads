export type ScriptFormat =
  | "ugc_hook"
  | "testimonial"
  | "unboxing"
  | "before_after"
  | "day_in_life";

interface FormatDef {
  value: ScriptFormat;
  label: string;
  promptGuidance: string;
}

export const SCRIPT_FORMATS: FormatDef[] = [
  {
    value: "ugc_hook",
    label: "Classic UGC (hook → proof → CTA)",
    promptGuidance: `Structure, with timestamps:
- Hook (0-3s): a scroll-stopping opening line
- Context (3-7s): quick relatable setup for why the viewer should care
- How it works (7-11s): a simple explanation of the product mechanic
- Proof (11-15s): a believable, specific detail that builds trust
- Payout proof (15-19s): a concrete result (e.g. a cash-out or reward moment)
- CTA (19-22s): a clear, casual call to action`,
  },
  {
    value: "testimonial",
    label: "Testimonial / Review",
    promptGuidance: `Structure, with timestamps:
- Hook (0-2s): lead with the result up front, e.g. "I've tried 5 of these and this is the only one that worked"
- Experience (2-10s): brief, specific walkthrough of actually using it
- Result (10-16s): a concrete, specific proof point or number
- CTA (16-20s): a soft, personal direct ask`,
  },
  {
    value: "unboxing",
    label: "Unboxing / First Impression",
    promptGuidance: `Structure, with timestamps:
- Hook (0-2s): genuine excitement about receiving/opening it
- First impression (2-8s): describe the physical reveal and immediate reaction
- How it works (8-14s): quick, casual explanation of using it for the first time
- Verdict + CTA (14-18s): first-use verdict and a direct call to action`,
  },
  {
    value: "before_after",
    label: "Before / After Transformation",
    promptGuidance: `Structure, with timestamps:
- Hook (0-2s): bluntly state the "before" problem
- Before state (2-6s): describe the struggle in relatable detail
- The shift (6-10s): introduce the product as the turning point
- After state (10-16s): describe the concrete after-result
- CTA (16-20s): a direct call to action`,
  },
  {
    value: "day_in_life",
    label: "Day-in-the-Life",
    promptGuidance: `Structure, with timestamps:
- Hook (0-2s): a relatable daily moment
- Context (2-8s): the product woven naturally into the routine, not pitched
- Payoff (8-14s): the benefit shows up organically within the day
- Soft CTA (14-18s): mention it casually as an aside, not a hard sell`,
  },
];

export function isScriptFormat(value: unknown): value is ScriptFormat {
  return SCRIPT_FORMATS.some((f) => f.value === value);
}

export function getFormatDef(value: ScriptFormat): FormatDef {
  return SCRIPT_FORMATS.find((f) => f.value === value) ?? SCRIPT_FORMATS[0];
}
