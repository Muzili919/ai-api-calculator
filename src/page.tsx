import type { Metadata } from "next";
import Calculator from "./calculator";
import { JsonLd } from "@/lib/json-ld";
import { toolSchema } from "@/lib/schema";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isZh = locale === "zh";
  return {
    title: isZh
      ? "AI API 价格对比 2026 | muzi.studio"
      : "AI API Price Calculator 2026 | muzi.studio",
    description: isZh
      ? "OpenAI / Claude / DeepSeek / Gemini 实时价格对比，按 Token 用量算月成本。免费、免登录。"
      : "Compare API costs across OpenAI GPT-5.5, Claude Opus 4.7, DeepSeek V4, Gemini 2.5. See monthly pricing at a glance.",
    openGraph: {
      title: isZh
        ? "AI API 价格对比 2026"
        : "AI API Price Calculator 2026",
      description: isZh
        ? "哪个 AI API 最便宜？GPT-5.5 / Claude / DeepSeek / Gemini 价格一览。"
        : "Which AI API is cheapest? Compare GPT-5.5, Claude Opus, DeepSeek V4, Gemini 2.5 pricing side by side.",
      images: [
        `https://muzi.studio/api/og?title=${encodeURIComponent(isZh ? "AI API 价格对比" : "AI API Price Calculator")}&desc=${encodeURIComponent(isZh ? "实时价格对比，按Token用量算月成本" : "Compare API costs across major providers")}&accent=%23D4B872`,
      ],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isZh = locale === "zh";
  return (
    <>
      <JsonLd
        data={toolSchema({
          slug: "ai-api-calculator",
          name: isZh ? "AI API 价格对比" : "AI API Price Calculator",
          description: isZh
            ? "OpenAI / Claude / DeepSeek / Gemini 实时价格对比"
            : "Compare AI API pricing across major providers",
          locale,
        })}
      />
      <Calculator />
    </>
  );
}
