"use client";

import { useState, useMemo } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics";
import { NextStep } from "@/app/[locale]/_components/NextStep";
import { LeadCapture } from "@/app/[locale]/_components/LeadCapture";

// ── pricing per 1M tokens (May 2026, approximate) ──────────────────────

interface Model {
  name: string;
  provider: string;
  color: string;
  inputPer1M: number;
  outputPer1M: number;
  badge?: string;
}

const MODELS: Model[] = [
  { name: "GPT-5.5", provider: "OpenAI", color: "#10a37f", inputPer1M: 15, outputPer1M: 60 },
  { name: "GPT-4.1", provider: "OpenAI", color: "#10a37f", inputPer1M: 2, outputPer1M: 8 },
  { name: "GPT-4o", provider: "OpenAI", color: "#10a37f", inputPer1M: 2.5, outputPer1M: 10 },
  { name: "o4-mini", provider: "OpenAI", color: "#10a37f", inputPer1M: 1.1, outputPer1M: 4.4 },
  { name: "Claude Opus 4.7", provider: "Anthropic", color: "#d97706", inputPer1M: 15, outputPer1M: 75, badge: "Mythos" },
  { name: "Claude Sonnet 4.6", provider: "Anthropic", color: "#d97706", inputPer1M: 3, outputPer1M: 15 },
  { name: "Claude Haiku 4.5", provider: "Anthropic", color: "#d97706", inputPer1M: 0.8, outputPer1M: 4 },
  { name: "DeepSeek V4", provider: "DeepSeek", color: "#3b82f6", inputPer1M: 0.27, outputPer1M: 1.1, badge: "性价比王" },
  { name: "DeepSeek V4 Flash", provider: "DeepSeek", color: "#3b82f6", inputPer1M: 0.07, outputPer1M: 0.28 },
  { name: "Gemini 2.5 Pro", provider: "Google", color: "#ea4335", inputPer1M: 1.25, outputPer1M: 10 },
  { name: "Gemini 2.5 Flash", provider: "Google", color: "#ea4335", inputPer1M: 0.15, outputPer1M: 0.6 },
];

const PROVIDERS = [...new Set(MODELS.map((m) => m.provider))];

const PRESETS = [
  { zh: "个人尝鲜", en: "Personal", input: 100_000, output: 50_000 },
  { zh: "独立开发者", en: "Indie Dev", input: 1_200_000_000, output: 430_000_000 },
  { zh: "小团队", en: "Small Team", input: 5_000_000, output: 2_000_000 },
  { zh: "创业公司", en: "Startup", input: 50_000_000, output: 20_000_000 },
  { zh: "企业级", en: "Enterprise", input: 500_000_000, output: 200_000_000 },
];

// ── helpers ──────────────────────────────────────────────────────────────

function logSlider(value: number, min = 10_000, max = 100_000_000_000) {
  const minLog = Math.log10(min);
  const maxLog = Math.log10(max);
  return Math.round(10 ** (minLog + (value / 100) * (maxLog - minLog)));
}

function toSlider(tokens: number, min = 10_000, max = 100_000_000_000) {
  const minLog = Math.log10(min);
  const maxLog = Math.log10(max);
  return ((Math.log10(Math.max(tokens, min)) - minLog) / (maxLog - minLog)) * 100;
}

function fmtTokens(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(0)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

function fmtCost(cost: number) {
  if (cost >= 10_000) return `$${cost.toLocaleString("en", { maximumFractionDigits: 0 })}`;
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.01) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(4)}`;
}

// ── component ────────────────────────────────────────────────────────────

export default function Calculator() {
  const locale = useLocale();
  const zh = locale === "zh";

  const [inputTokens, setInputTokens] = useState(1_000_000);
  const [outputTokens, setOutputTokens] = useState(500_000);
  const [activePreset, setActivePreset] = useState(1);
  const [providers, setProviders] = useState<Set<string>>(new Set(PROVIDERS));
  const [showReport, setShowReport] = useState(false);

  const results = useMemo(() => {
    return MODELS
      .filter((m) => providers.has(m.provider))
      .map((m) => ({
        ...m,
        cost: (inputTokens / 1_000_000) * m.inputPer1M + (outputTokens / 1_000_000) * m.outputPer1M,
      }))
      .sort((a, b) => a.cost - b.cost);
  }, [inputTokens, outputTokens, providers]);

  const maxCost = results.length > 0 ? Math.max(...results.map((r) => r.cost)) : 1;
  const cheapest = results[0];
  const priciest = results[results.length - 1];

  function applyPreset(i: number) {
    setInputTokens(PRESETS[i].input);
    setOutputTokens(PRESETS[i].output);
    setActivePreset(i);
  }

  function toggleProvider(p: string) {
    setProviders((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* ── nav ── */}
      <nav className="border-b border-border/80 px-6 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-sm text-muted hover:text-text transition">
            &larr; muzi.studio
          </Link>
          <span className="text-[10px] font-mono text-muted tracking-wider">
            PRICING · MAY 2026
          </span>
        </div>
      </nav>

      {/* ── hero ── */}
      <header className="max-w-4xl mx-auto px-6 pt-16 pb-6">
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
          {zh ? "AI API 价格计算器" : "AI API Price Calculator"}
        </h1>
        <p className="mt-4 text-muted max-w-xl leading-relaxed">
          {zh
            ? "对比 GPT-5.5、Claude Opus、DeepSeek V4、Gemini 2.5 的 API 调用成本。输入你的月度 Token 用量，立刻算出每家多少钱。"
            : "Compare API costs across GPT-5.5, Claude Opus, DeepSeek V4, Gemini 2.5. Enter your monthly token usage and see what each provider charges."}
        </p>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-24">
        {/* ── presets ── */}
        <div className="flex flex-wrap gap-2 mb-8">
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => applyPreset(i)}
              className={`px-4 py-2 rounded-lg text-sm transition cursor-pointer ${
                activePreset === i
                  ? "bg-accent text-black font-medium"
                  : "bg-surface-2 border border-border-strong text-muted hover:border-accent/40"
              }`}
            >
              {zh ? p.zh : p.en}
            </button>
          ))}
        </div>

        {/* ── token inputs ── */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <TokenInput
            label={zh ? "月输入 Token" : "Monthly Input Tokens"}
            value={inputTokens}
            onChange={setInputTokens}
            onInteract={() => setActivePreset(-1)}
          />
          <TokenInput
            label={zh ? "月输出 Token" : "Monthly Output Tokens"}
            value={outputTokens}
            onChange={setOutputTokens}
            onInteract={() => setActivePreset(-1)}
          />
        </div>

        {/* ── provider filter ── */}
        <div className="flex flex-wrap gap-2 mb-10">
          {PROVIDERS.map((p) => {
            const c = MODELS.find((m) => m.provider === p)!.color;
            const active = providers.has(p);
            return (
              <button
                key={p}
                onClick={() => toggleProvider(p)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border"
                style={
                  active
                    ? { borderColor: c, backgroundColor: `${c}18`, color: c }
                    : { borderColor: "#2a2b30", color: "#8b8c92" }
                }
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* ── results ── */}
        <div className="space-y-3">
          {results.map((r, i) => {
            const bar = maxCost > 0 ? (r.cost / maxCost) * 100 : 0;
            const top = i === 0;
            return (
              <div
                key={r.name}
                className={`rounded-xl p-5 transition ${
                  top
                    ? "bg-gradient-to-r from-accent/10 to-transparent border border-accent/30"
                    : "bg-surface border border-border hover:border-border-strong"
                }`}
              >
                {/* row 1: name + cost */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                    <span className="font-medium text-sm">{r.name}</span>
                    <span className="text-xs text-muted">{r.provider}</span>
                    {r.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent/15 text-accent">
                        {r.badge}
                      </span>
                    )}
                    {top && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-400/15 text-green-400">
                        {zh ? "最便宜" : "Cheapest"}
                      </span>
                    )}
                  </div>
                  <span className={`font-mono text-sm shrink-0 ml-4 ${top ? "text-accent font-semibold" : ""}`}>
                    {fmtCost(r.cost)}
                    <span className="text-muted text-xs">/mo</span>
                  </span>
                </div>

                {/* bar */}
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${bar}%`, backgroundColor: r.color, opacity: top ? 1 : 0.5 }}
                  />
                </div>

                {/* per-unit pricing */}
                <div className="flex justify-between mt-2 text-[10px] text-muted">
                  <span>
                    {zh ? "输入" : "In"} ${r.inputPer1M}/1M
                  </span>
                  <span>
                    {zh ? "输出" : "Out"} ${r.outputPer1M}/1M
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── summary ── */}
        {cheapest && priciest && cheapest !== priciest && (
          <div className="mt-8 p-6 rounded-xl bg-surface border border-border">
            <p className="text-sm text-muted leading-relaxed">
              {zh ? (
                <>
                  最便宜 <span className="text-accent font-medium">{cheapest.name}</span>（{fmtCost(cheapest.cost)}/月）
                  {" · "}最贵 <span className="text-text">{priciest.name}</span>（{fmtCost(priciest.cost)}/月）
                  {" · "}月差价{" "}
                  <span className="text-green-400">
                    {fmtCost(priciest.cost - cheapest.cost)}
                  </span>
                </>
              ) : (
                <>
                  Cheapest <span className="text-accent font-medium">{cheapest.name}</span> ({fmtCost(cheapest.cost)}/mo)
                  {" · "}Priciest <span className="text-text">{priciest.name}</span> ({fmtCost(priciest.cost)}/mo)
                  {" · "}Monthly gap{" "}
                  <span className="text-green-400">
                    {fmtCost(priciest.cost - cheapest.cost)}
                  </span>
                </>
              )}
            </p>
          </div>
        )}

        {/* ── report button ── */}
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              if (!showReport) track("calculator_report_generated");
              setShowReport(!showReport);
            }}
            className="px-6 py-3 rounded-full bg-accent text-black font-medium text-sm hover:bg-accent-glow transition cursor-pointer shadow-[0_8px_32px_rgba(251,191,36,0.3)]"
          >
            {showReport
              ? zh ? "收起报告" : "Hide Report"
              : zh ? "生成分享报告 →" : "Generate Shareable Report →"}
          </button>
        </div>

        {/* ── shareable report card ── */}
        {showReport && (
          <div className="mt-10 flex justify-center">
            <div
              id="report-card"
              className="w-full max-w-[420px] rounded-3xl overflow-hidden"
              style={{
                background: "linear-gradient(160deg, #0d0d10 0%, #111118 40%, #0d0d10 100%)",
                border: "1px solid rgba(251, 191, 36, 0.2)",
                boxShadow: "0 0 80px rgba(251, 191, 36, 0.08)",
              }}
            >
              {/* header */}
              <div className="px-6 pt-8 pb-4 text-center">
                <div className="text-[10px] font-mono tracking-[0.3em] text-accent/80 mb-2">MUZI.STUDIO</div>
                <h2 className="text-xl font-semibold text-text tracking-tight">
                  {zh ? "AI API 月度成本报告" : "AI API Monthly Cost Report"}
                </h2>
                <div className="text-[10px] text-muted mt-1.5 font-mono">2026.05</div>
              </div>

              {/* usage stats */}
              <div className="px-6 pb-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-surface-2 border border-border p-4">
                    <div className="text-[10px] text-muted mb-1">{zh ? "月输入" : "Input"}</div>
                    <div className="text-lg font-semibold text-accent">{fmtTokens(inputTokens)}</div>
                    <div className="text-[10px] text-muted">tokens</div>
                  </div>
                  <div className="rounded-xl bg-surface-2 border border-border p-4">
                    <div className="text-[10px] text-muted mb-1">{zh ? "月输出" : "Output"}</div>
                    <div className="text-lg font-semibold text-accent">{fmtTokens(outputTokens)}</div>
                    <div className="text-[10px] text-muted">tokens</div>
                  </div>
                </div>
              </div>

              {/* divider */}
              <div className="mx-6 h-px bg-gradient-to-r from-transparent via-[#2a2b30] to-transparent" />

              {/* chart bars — sorted expensive → cheapest */}
              <div className="px-6 py-5 space-y-3">
                {[...results].reverse().map((r, i, arr) => {
                  const bar = maxCost > 0 ? (r.cost / maxCost) * 100 : 0;
                  const isCheapest = i === arr.length - 1;
                  return (
                    <div key={r.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: r.color }} />
                          <span className={`text-xs ${isCheapest ? "text-text font-medium" : "text-muted"}`}>
                            {r.name}
                          </span>
                          {isCheapest && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-green-400/15 text-green-400 font-medium">
                              {zh ? "最优" : "BEST"}
                            </span>
                          )}
                        </div>
                        <span className={`text-xs font-mono ${isCheapest ? "text-accent font-medium" : "text-text"}`}>
                          {fmtCost(r.cost)}<span className="text-muted">/mo</span>
                        </span>
                      </div>
                      <div className="h-1 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.max(bar, 2)}%`, backgroundColor: r.color, opacity: isCheapest ? 1 : 0.4 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* insight box */}
              {cheapest && priciest && cheapest !== priciest && (
                <div className="mx-6 mb-5 p-4 rounded-xl" style={{
                  background: "linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.02))",
                  border: "1px solid rgba(251,191,36,0.2)",
                }}>
                  <div className="text-[10px] text-accent mb-1">
                    {zh ? "选择建议" : "Recommendation"}
                  </div>
                  <div className="text-base font-semibold text-text">
                    {cheapest.name}
                  </div>
                  <div className="text-xs text-muted mt-1">
                    {zh
                      ? `月费 ${fmtCost(cheapest.cost)}，比最贵（${priciest.name}）省 ${fmtCost(priciest.cost - cheapest.cost)}/月`
                      : `${fmtCost(cheapest.cost)}/mo — save ${fmtCost(priciest.cost - cheapest.cost)}/mo vs ${priciest.name}`}
                  </div>
                </div>
              )}

              {/* promo strip */}
              <div className="mx-6 mb-4 p-4 rounded-xl bg-gradient-to-r from-accent/10 via-accent/5 to-transparent border border-accent/20">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-black text-sm font-bold shrink-0">M</div>
                  <div>
                    <div className="text-xs font-medium text-text">muzi.studio</div>
                    <div className="text-[10px] text-muted mt-0.5 leading-relaxed">
                      {zh
                        ? "免费 AI 工具 + 定制开发。落地页 ¥1,999 起，AI SaaS ¥19,999 起。"
                        : "Free AI tools + custom dev. Landing pages from $299, AI SaaS from $2,999."}
                    </div>
                    <div className="text-[10px] text-accent/80 mt-1 font-mono">muzi.studio</div>
                  </div>
                </div>
              </div>

              {/* footer */}
              <div className="px-6 py-3 text-center border-t border-border">
                <div className="text-[9px] text-muted/60 font-mono">
                  muzi.studio/tools/ai-api-calculator · {zh ? "价格仅供参考，以厂商官网为准" : "Prices for reference only"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── conversion funnel: 算完价格 → 接单服务 ── */}
        <NextStep
          kind="service"
          eyebrow={zh ? "算完账了" : "Done crunching numbers"}
          title={
            zh
              ? "需要自定义 AI 集成方案？"
              : "Need a custom AI integration?"
          }
          description={
            zh
              ? "我帮过 6 家中小团队做 AI 落地——从 prompt 优化到 LLM 接入到工程化部署。$800 起，3 天交付，源码归你。"
              : "Helped 6 small teams ship AI features — from prompt engineering to LLM integration to production deploy. From $800, 3-day turnaround, source code yours."
          }
          ctaText={zh ? "聊聊你的项目" : "Talk about your project"}
          ctaUrl="/?utm_source=muzi.studio&utm_medium=tool_funnel&utm_campaign=api_calculator#booking"
          secondaryText={zh ? "或先看 Field Notes" : "Or read Field Notes first"}
          secondaryUrl="/?utm_source=muzi.studio&utm_medium=tool_funnel&utm_campaign=api_calculator#about"
        />

        <LeadCapture
          source="ai-api-calculator"
          title={zh ? "关注 API 价格变化？" : "Track API price changes?"}
          subtitle="We'll notify you when prices drop."
          ctaText={zh ? "价格变动时通知我" : "Notify me on price drops"}
          accent="#D4B872"
        />

        {/* ── footer ── */}
        <div className="mt-16 text-center text-xs text-muted space-y-1">
          <p>{zh ? "价格来源于各厂商官网，可能随时变动，仅供参考。" : "Pricing sourced from official provider pages, subject to change. For reference only."}</p>
          <p>
            Built by <a href="https://muzi.studio" className="text-accent hover:underline">muzi.studio</a>
          </p>
        </div>
      </main>
    </div>
  );
}

// ── reusable token input ──────────────────────────────────────────────

function TokenInput({
  label,
  value,
  onChange,
  onInteract,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onInteract: () => void;
}) {
  return (
    <div>
      <label className="text-xs text-muted mb-2 block">{label}</label>
      <input
        type="text"
        value={value.toLocaleString()}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
          if (!isNaN(n) && n > 0) onChange(n);
          onInteract();
        }}
        className="w-full px-4 py-3 rounded-lg bg-surface-2 border border-border-strong text-text font-mono text-sm focus:outline-none focus:border-accent/60 transition"
      />
      <input
        type="range"
        min={0}
        max={100}
        value={toSlider(value)}
        onChange={(e) => {
          onChange(logSlider(Number(e.target.value)));
          onInteract();
        }}
        className="w-full mt-2 accent-accent cursor-pointer"
      />
      <div className="text-xs text-muted mt-1 font-mono">{fmtTokens(value)} tokens</div>
    </div>
  );
}
