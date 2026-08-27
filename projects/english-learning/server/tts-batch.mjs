// 书山英语 · 示范音批量预生成(教育内容固定 → 一次生成,永久复用)
// 用法:
//   node tts-batch.mjs --dry-run              统计字符量与各引擎成本(无需 key)
//   node tts-batch.mjs --provider=azure       实际生成到 ./audio/(需 .env.local 配 key)
// 设计见 04-speech-decision.md:统一英式 en-GB,与译林教材配套录音口音一致

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));

// ── 内容清单:优先读 content.json,否则从原型页提取演示内容 ──
function loadItems() {
  const cj = join(ROOT, "content.json");
  if (existsSync(cj)) return JSON.parse(readFileSync(cj, "utf8"));

  const html = readFileSync(join(ROOT, "..", "prototype.html"), "utf8");
  const grab = (name) => {
    const i = html.indexOf(`var ${name} = {`);
    if (i < 0) return null;
    const start = html.indexOf("{", i);
    let depth = 0, end = start;
    for (let j = start; j < html.length; j++) {
      if (html[j] === "{") depth++;
      else if (html[j] === "}") { depth--; if (depth === 0) { end = j + 1; break; } }
    }
    return new Function(`return ${html.slice(start, end)}`)();
  };
  const WORDS = grab("WORDS") || {}, PASSAGES = grab("PASSAGES") || {};
  const items = [];
  for (const [g, list] of Object.entries(WORDS))
    for (const w of list) {
      items.push({ id: `g${g}/word/${w.w}`, text: w.w, kind: "word" });
      items.push({ id: `g${g}/example/${w.w}`, text: w.ex, kind: "example" });
    }
  for (const [g, lines] of Object.entries(PASSAGES))
    lines.forEach((t, i) => items.push({ id: `g${g}/passage/${i}`, text: t, kind: "passage" }));
  return items;
}

// ── 成本口径(公开资料,采购前按控制台实价复核)──
const PRICING = [
  { name: "Azure Neural HD (en-GB)", usdPerM: 22, note: "音质最好;生成在流水线,播放走境内 CDN" },
  { name: "Azure 标准 Neural",       usdPerM: 16, note: "够用,更便宜" },
  { name: "火山引擎豆包 TTS",         cnyPerK: 0.003, note: "全境内;流式低延迟,适合 AI 对话实时合成" },
];
const USD_CNY = 7.1;

const items = loadItems();
const chars = items.reduce((n, it) => n + [...it.text].length, 0);
const byKind = items.reduce((m, it) => (m[it.kind] = (m[it.kind] || 0) + 1, m), {});

if (args["dry-run"] || !args.provider) {
  console.log("── 示范音批量生成 · 成本试算 ──────────────────");
  console.log(`条目:${items.length} 条  ${JSON.stringify(byKind)}`);
  console.log(`字符:${chars.toLocaleString()}`);
  console.log("");
  for (const p of PRICING) {
    const cny = p.usdPerM ? (chars / 1e6) * p.usdPerM * USD_CNY : (chars / 1000) * p.cnyPerK;
    console.log(`  ${p.name.padEnd(26)} ≈ ¥${cny.toFixed(2).padStart(8)}   ${p.note}`);
  }
  console.log("");
  const SCALE = 170000; // 04 文档口径:7-9 年级全量约 17 万字符
  console.log(`全量投产估算(约 ${SCALE.toLocaleString()} 字符,7-9 年级单词/例句/课文/24篇朗读/情景句):`);
  for (const p of PRICING) {
    const cny = p.usdPerM ? (SCALE / 1e6) * p.usdPerM * USD_CNY : (SCALE / 1000) * p.cnyPerK;
    console.log(`  ${p.name.padEnd(26)} ≈ ¥${cny.toFixed(2).padStart(8)}  (一次性,非年费)`);
  }
  console.log("\n※ 生成后存对象存储 + CDN,学生端预下载,弱网离线可播,后续零成本。");
  process.exit(0);
}

// ── 实际生成(需 key;适配器未经真实 key 验证,接入时先小批量试跑)──
function loadEnv() {
  const p = join(ROOT, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

const VOICE = process.env.TTS_VOICE ||
  (args.provider === "xf" ? (process.env.XF_TTS_VCN || "henry") : "en-GB-SoniaNeural"); // 默认英式,匹配译林教材
const PROVIDERS = {
  // Azure Speech REST:需 AZURE_SPEECH_KEY 与 AZURE_SPEECH_REGION
  async azure(text) {
    const key = process.env.AZURE_SPEECH_KEY, region = process.env.AZURE_SPEECH_REGION;
    if (!key || !region) throw new Error("缺少 AZURE_SPEECH_KEY / AZURE_SPEECH_REGION");
    const ssml = `<speak version='1.0' xml:lang='en-GB'><voice name='${VOICE}'>${
      text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</voice></speak>`;
    const r = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      },
      body: ssml,
    });
    if (!r.ok) throw new Error(`azure ${r.status}: ${(await r.text()).slice(0, 160)}`);
    return Buffer.from(await r.arrayBuffer());
  },
};

// 讯飞在线合成(全境内备选;老一代英文音色,音质一般,仅作管线联调用)
PROVIDERS.xf = async (text) => {
  const { tts, pcmToWav } = await import("./xf.mjs");
  return pcmToWav(await tts(text, { vcn: VOICE, speed: 42 }));
};

const gen = PROVIDERS[args.provider];
if (!gen) { console.error(`未知 provider: ${args.provider}(可用:${Object.keys(PROVIDERS).join(", ")})`); process.exit(1); }

const outDir = join(ROOT, "audio");
mkdirSync(outDir, { recursive: true });
const EXT = args.provider === "xf" ? "wav" : "mp3";
// manifest 以「原文 → 文件名」索引,前端拿到文本即可查表播放
const manifest = existsSync(join(outDir, "manifest.json"))
  ? JSON.parse(readFileSync(join(outDir, "manifest.json"), "utf8")) : {};
const manifestPath = join(outDir, "manifest.json");
const flush = () => writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
let done = 0, skipped = 0, failed = 0;
for (const it of items) {
  const hash = createHash("sha1").update(`${args.provider}|${VOICE}|${it.text}`).digest("hex").slice(0, 16);
  const name = `${hash}.${EXT}`;
  const file = join(outDir, name);
  if (existsSync(file)) { manifest[it.text] = name; skipped++; continue; }   // 幂等
  let lastErr = null;
  for (let tryN = 1; tryN <= 3; tryN++) {                                    // 重试:云端 TTS 偶发超时是常态
    try {
      writeFileSync(file, await gen(it.text));
      manifest[it.text] = name;
      done++; lastErr = null;
      if (done % 5 === 0) { flush(); console.log(`  已生成 ${done}…`); }     // 边跑边写盘,中断不丢映射
      break;
    } catch (e) {
      lastErr = e;
      if (tryN < 3) await new Promise((r) => setTimeout(r, tryN * 1500));     // 退避 1.5s / 3s
    }
  }
  if (lastErr) { failed++; console.error(`FAIL ${it.id}: ${lastErr.message}`); }
}
flush();
console.log(`完成:新生成 ${done} / 复用 ${skipped} / 失败 ${failed} → ${outDir}`);
console.log(`音色 ${VOICE}(${args.provider});换引擎后删除 audio/ 重跑即可全量替换`);
