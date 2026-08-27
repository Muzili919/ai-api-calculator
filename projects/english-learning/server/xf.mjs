// 讯飞开放平台客户端(零依赖,Node >= 20 内置 WebSocket)
// 覆盖:语音评测 ISE(跟读/朗读打分)+ 在线语音合成 TTS(示范音备选)
// 凭证放 .env.local:XF_APPID / XF_API_KEY / XF_API_SECRET

import { createHmac } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));

export function loadEnv() {
  const p = join(ROOT, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// 讯飞 WebSocket 鉴权:HMAC-SHA256 签名拼进 URL query
function authUrl(host, path, apiKey, apiSecret) {
  const date = new Date().toUTCString();
  const base = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
  const signature = createHmac("sha256", apiSecret).update(base).digest("base64");
  const origin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const q = new URLSearchParams({
    authorization: Buffer.from(origin).toString("base64"),
    date,
    host,
  });
  return `wss://${host}${path}?${q}`;
}

function creds() {
  const { XF_APPID: appId, XF_API_KEY: apiKey, XF_API_SECRET: apiSecret } = process.env;
  if (!appId || !apiKey || !apiSecret) throw new Error("缺少 XF_APPID / XF_API_KEY / XF_API_SECRET");
  return { appId, apiKey, apiSecret };
}

// ── 在线语音合成:返回 16k/16bit/mono PCM ──────────────────
export function tts(text, { vcn = "x4_EnUs_Laura_education", speed = 45 } = {}) {
  const { appId, apiKey, apiSecret } = creds();
  const host = "tts-api.xfyun.cn", path = "/v2/tts";
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(authUrl(host, path, apiKey, apiSecret));
    const chunks = [];
    const timer = setTimeout(() => { ws.close(); reject(new Error("tts timeout")); }, 30000);
    ws.onopen = () => ws.send(JSON.stringify({
      common: { app_id: appId },
      business: { aue: "raw", auf: "audio/L16;rate=16000", vcn, speed, tte: "UTF8" },
      data: { status: 2, text: Buffer.from(text, "utf8").toString("base64") },
    }));
    ws.onmessage = (ev) => {
      const r = JSON.parse(ev.data);
      if (r.code !== 0) { clearTimeout(timer); ws.close(); return reject(new Error(`tts ${r.code}: ${r.message}`)); }
      if (r.data?.audio) chunks.push(Buffer.from(r.data.audio, "base64"));
      if (r.data?.status === 2) { clearTimeout(timer); ws.close(); resolve(Buffer.concat(chunks)); }
    };
    ws.onerror = (e) => { clearTimeout(timer); reject(new Error(`tts ws error: ${e.message || e.type}`)); };
  });
}

// ── 语音评测 ISE:PCM 进,五维得分出 ────────────────────────
// category: read_word(单词) / read_sentence(句子) / read_chapter(篇章)
// 实测:英文评测不可传 group 参数(中文专用),否则 48195
export function ise(pcm, text, { category = "read_sentence" } = {}) {
  const { appId, apiKey, apiSecret } = creds();
  const host = "ise-api.xfyun.cn", path = "/v2/open-ise";
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(authUrl(host, path, apiKey, apiSecret));
    let xml = "";
    const timer = setTimeout(() => { ws.close(); reject(new Error("ise timeout")); }, 40000);

    ws.onopen = () => {
      // 第一帧:参数 + 待评测文本(必须带 BOM 与 [content] 头)
      ws.send(JSON.stringify({
        common: { app_id: appId },
        business: {
          category, sub: "ise", ent: "en_vip", cmd: "ssb",
          auf: "audio/L16;rate=16000", aue: "raw", tte: "utf-8", rstcd: "utf8",
          ttp_skip: true, extra_ability: "multi_dimension",
          // ⚠️ 不能传 group:英文评测(en_vip)不接受该参数,会报 48195
          text: "﻿[content]\n" + text,
        },
        data: { status: 0, data: "" },
      }));
      // 音频分帧:1280 字节/帧(40ms)
      const FRAME = 1280;
      let sent = 0, first = true;
      const push = () => {
        if (ws.readyState !== 1) return;
        const end = Math.min(sent + FRAME, pcm.length);
        const slice = pcm.subarray(sent, end);
        const last = end >= pcm.length;
        ws.send(JSON.stringify({
          business: { cmd: "auw", aus: first ? 1 : (last ? 4 : 2), aue: "raw" },
          data: { status: last ? 2 : 1, data: slice.toString("base64"), data_type: 1, encoding: "raw" },
        }));
        first = false; sent = end;
        if (!last) setTimeout(push, 40); // 模拟实时流速
      };
      setTimeout(push, 60);
    };

    ws.onmessage = (ev) => {
      const r = JSON.parse(ev.data);
      if (r.code !== 0) { clearTimeout(timer); ws.close(); return reject(new Error(`ise ${r.code}: ${r.message}`)); }
      if (r.data?.data) xml += Buffer.from(r.data.data, "base64").toString("utf8");
      if (r.data?.status === 2) { clearTimeout(timer); ws.close(); resolve(parseIse(xml)); }
    };
    ws.onerror = (e) => { clearTimeout(timer); reject(new Error(`ise ws error: ${e.message || e.type}`)); };
  });
}

// 解析评测返回的 XML(取整句五维分 + 逐词得分)
export function parseIse(xml) {
  const attr = (seg, k) => {
    const m = seg.match(new RegExp(`${k}="([^"]*)"`));
    return m ? m[1] : null;
  };
  const sentence = xml.match(/<rec_paper>[\s\S]*?<read_[a-z]+[^>]*>/)?.[0] || xml;
  const num = (k) => { const v = attr(sentence, k); return v === null ? null : Number(v); };
  const words = [];
  for (const m of xml.matchAll(/<word[^>]*content="([^"]*)"[^>]*>/g)) {
    const seg = m[0];
    const c = attr(seg, "content");
    if (!c || c === "sil" || c === "silv") continue;
    words.push({ word: c, score: Number(attr(seg, "total_score") ?? attr(seg, "score") ?? 0) });
  }
  return {
    total: num("total_score"),          // 总分(0-5)
    accuracy: num("accuracy_score"),    // 语音准确性
    fluency: num("fluency_score"),      // 流利度
    integrity: num("integrity_score"),  // 完整度
    standard: num("standard_score"),    // 标准度/韵律
    words,
    raw: xml,
  };
}

// PCM → WAV(便于本地试听)
export function pcmToWav(pcm, rate = 16000) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
