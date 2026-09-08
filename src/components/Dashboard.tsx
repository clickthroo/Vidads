"use client";

import { useEffect, useState } from "react";
import type { Product, Script } from "@/lib/types";
import { SCRIPT_FORMATS, type ScriptFormat } from "@/lib/formats";

export default function Dashboard({
  products,
  initialScripts,
}: {
  products: Product[];
  initialScripts: Script[];
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [angle, setAngle] = useState("");
  const [format, setFormat] = useState<ScriptFormat>("ugc_hook");
  const [scripts, setScripts] = useState<Script[]>(initialScripts);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleGenerate() {
    if (!productId || !angle.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/scripts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, angle, format }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate scripts");
      setScripts((prev) => [...data.scripts, ...prev]);
      setAngle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  async function handleTextChange(id: string, full_script: string) {
    setScripts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, full_script } : s))
    );
  }

  async function handleSave(id: string, full_script: string) {
    setBusyId(id);
    try {
      await fetch(`/api/scripts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_script }),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/scripts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      const data = await res.json();
      if (res.ok) {
        setScripts((prev) => prev.map((s) => (s.id === id ? data.script : s)));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/scripts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setScripts((prev) => prev.filter((s) => s.id !== id));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function pollRenderStatus(id: string) {
    const res = await fetch(`/api/scripts/${id}/render/status`);
    const data = await res.json();
    if (data.script) {
      setScripts((prev) => prev.map((s) => (s.id === id ? data.script : s)));
    }
    if (data.error) {
      setError(data.error);
    }
    if (data.script?.status === "rendering") {
      setTimeout(() => pollRenderStatus(id), 5000);
    }
  }

  useEffect(() => {
    initialScripts.forEach((s) => {
      if (s.status === "rendering") pollRenderStatus(s.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRender(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/scripts/${id}/render`, { method: "POST" });
      const data = await res.json();
      if (data.script) {
        setScripts((prev) => prev.map((s) => (s.id === id ? data.script : s)));
      }
      if (!res.ok) {
        setError(data.error ?? "Rendering failed to start");
        return;
      }
      pollRenderStatus(id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Vidads — TikTok Script Generator</h1>

      <section className="space-y-3 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Product</label>
          <select
            className="border border-gray-300 rounded px-3 py-2"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Angle</label>
          <input
            className="border border-gray-300 rounded px-3 py-2"
            placeholder='e.g. "cash amount hook"'
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Format</label>
          <select
            className="border border-gray-300 rounded px-3 py-2"
            value={format}
            onChange={(e) => setFormat(e.target.value as ScriptFormat)}
          >
            {SCRIPT_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <button
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
          disabled={generating || !productId || !angle.trim()}
          onClick={handleGenerate}
        >
          {generating ? "Generating…" : "Generate scripts"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </section>

      <section className="space-y-4">
        {scripts.map((script) => (
          <div
            key={script.id}
            className="bg-white p-4 rounded-lg border border-gray-200 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {script.angle} · {formatLabel(script.format)} ·{" "}
                <StatusBadge status={script.status} />
              </span>
            </div>

            <textarea
              className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm min-h-[160px]"
              value={script.full_script}
              onChange={(e) => handleTextChange(script.id, e.target.value)}
              onBlur={(e) => handleSave(script.id, e.target.value)}
              disabled={script.status !== "draft"}
            />

            <div className="flex gap-2">
              {script.status === "draft" && (
                <>
                  <button
                    className="bg-green-600 text-white rounded px-3 py-1.5 text-sm disabled:opacity-50"
                    disabled={busyId === script.id}
                    onClick={() => handleApprove(script.id)}
                  >
                    Approve
                  </button>
                  <button
                    className="bg-red-600 text-white rounded px-3 py-1.5 text-sm disabled:opacity-50"
                    disabled={busyId === script.id}
                    onClick={() => handleReject(script.id)}
                  >
                    Reject
                  </button>
                </>
              )}
              {(script.status === "approved" || script.status === "failed") && (
                <button
                  className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={busyId === script.id}
                  onClick={() => handleRender(script.id)}
                >
                  {script.status === "failed" ? "Retry render" : "Render"}
                </button>
              )}
              {script.status === "rendering" && (
                <p className="text-sm text-gray-500">
                  Rendering… this usually takes 1–3 minutes.
                </p>
              )}
            </div>

            {script.status === "ready" && script.video_url && (
              <video
                controls
                className="w-full rounded"
                src={script.video_url}
              />
            )}
          </div>
        ))}

        {scripts.length === 0 && (
          <p className="text-sm text-gray-500">
            No scripts yet. Pick a product, enter an angle, and generate some.
          </p>
        )}
      </section>
    </main>
  );
}

function formatLabel(format: ScriptFormat): string {
  return SCRIPT_FORMATS.find((f) => f.value === format)?.label ?? format;
}

function StatusBadge({ status }: { status: Script["status"] }) {
  const colors: Record<Script["status"], string> = {
    draft: "text-gray-500",
    approved: "text-green-600",
    rendering: "text-blue-600",
    ready: "text-purple-600",
    failed: "text-red-600",
  };
  return <span className={colors[status]}>{status}</span>;
}
