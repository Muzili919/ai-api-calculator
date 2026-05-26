# AI API Calculator

> Compare API costs across **OpenAI GPT-5.5/4.1/4o**, **Claude Opus 4.7 / Sonnet 4.6 / Haiku 4.5**, **DeepSeek V4 / V4 Flash**, **Gemini 2.5 Pro / Flash**. See monthly cost at a glance.

**🔗 Live demo:** [muzi.studio/tools/ai-api-calculator](https://muzi.studio/tools/ai-api-calculator)

---

## Why this exists

Every major AI provider lists pricing on a different page, in a different format, and uses different "per-1M-tokens" denominators. Switching between OpenAI and Anthropic's pricing pages just to know "if I run this prompt, which is cheapest?" wastes hours.

This tool puts **11 leading models** on one page, with sliders for token volume and a sorted result list.

## Features

- 📊 **11 models** across 4 providers (OpenAI / Anthropic / DeepSeek / Google)
- 🎚️ **Log-scale slider** for token volume (10K → 100B)
- 🏷️ **5 presets** — Personal / Indie Dev / Small Team / Startup / Enterprise
- 🔍 **Provider filter** — compare only the ones you care about
- 💰 **Sorted result** — cheapest first, with bar chart visualization
- 🌐 **i18n** — English + Chinese
- 🎯 **Cheapest vs priciest savings** highlighted

## Models covered (May 2026 pricing)

| Provider | Models |
|---|---|
| OpenAI | GPT-5.5, GPT-4.1, GPT-4o, o4-mini |
| Anthropic | Claude Opus 4.7, Sonnet 4.6, Haiku 4.5 |
| DeepSeek | V4, V4 Flash |
| Google | Gemini 2.5 Pro, 2.5 Flash |

## Math

```
cost = (input_tokens / 1M) × input_price_per_1M
     + (output_tokens / 1M) × output_price_per_1M
```

Standard per-token pricing — no caching discounts in this calc (see [claude-code-cost-estimator](https://github.com/Muzili919/claude-code-cost-estimator) for that).

## How to use this code

This source powers the live demo on [muzi.studio](https://muzi.studio). Two files:

- [`src/page.tsx`](src/page.tsx) — Next.js page (SEO metadata + JSON-LD)
- [`src/calculator.tsx`](src/calculator.tsx) — the calculator (`"use client"`, ~500 lines)

To use in your own Next.js project:

1. Copy both files to `app/[locale]/tools/ai-api-calculator/`
2. Replace muzi.studio-internal imports:
   - `@/lib/json-ld` / `@/lib/schema` — your SEO helpers
   - `@/lib/analytics` `track()` — your analytics
   - `@/i18n/navigation` `<Link>` — or `next/link`
   - `next-intl` `useLocale()` — or hard-code locale
   - `<NextStep>` / `<LeadCapture>` — your CTAs (or remove)
3. Update `MODELS` array in `calculator.tsx` when vendors change prices

## Pricing data freshness

Last updated: **2026-05** (when this repo was created)

Spotted outdated numbers? [Open an issue](https://github.com/Muzili919/ai-api-calculator/issues) or send a PR.

## License

MIT — see [LICENSE](LICENSE).

## About

Built by [Muzi](https://muzi.studio). Other open-source AI tools:

- [Claude Code Cost Estimator](https://github.com/Muzili919/claude-code-cost-estimator) — Subscription vs API for Claude Code users
- [Chinese AI Model Pricing Comparison](https://github.com/Muzili919/ai-model-compare) — Doubao / DeepSeek / Kimi / Qwen / GLM / Hunyuan

Find me: [muzi.studio](https://muzi.studio) · [X @MUZILI28919](https://x.com/MUZILI28919) · [GitHub @Muzili919](https://github.com/Muzili919)
