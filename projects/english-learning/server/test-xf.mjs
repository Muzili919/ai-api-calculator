import { loadEnv, tts, ise, pcmToWav } from "./xf.mjs";
import { writeFileSync } from "node:fs";
loadEnv();
const TEXT = process.argv[2] || "I am in Grade Seven at Sunshine Middle School.";
const VCNS = ["x4_EnUs_Laura_education", "x4_enus_laura_formal", "catherine", "x2_catherine", "john"];
let pcm = null;
for (const vcn of VCNS) {
  try {
    process.stdout.write(`TTS 试音色 ${vcn} … `);
    pcm = await tts(TEXT, { vcn });
    console.log(`✅ ${pcm.length} 字节 PCM`);
    writeFileSync("sample.wav", pcmToWav(pcm));
    break;
  } catch (e) { console.log(`✗ ${e.message}`); }
}
if (!pcm) { console.log("\nTTS 全部音色失败(可能未开通在线语音合成)。仅测 ISE 协议…"); process.exit(1); }
console.log(`\nISE 评测:「${TEXT}」`);
const r = await ise(pcm, TEXT, { category: "read_sentence", group: "youth" });
console.log(JSON.stringify({ total: r.total, accuracy: r.accuracy, fluency: r.fluency, integrity: r.integrity, standard: r.standard }, null, 2));
console.log("逐词:", r.words.map(w => `${w.word}:${w.score}`).join("  "));
