import { loadEnv, tts, pcmToWav } from "./xf.mjs";
import { writeFileSync } from "node:fs";
loadEnv();
const TEXT = "I am in Grade Seven at Sunshine Middle School.";
// 标准在线合成端点上的英文发音人候选
const VOICES = ["catherine", "john", "henry", "mary", "x2_catherine", "x2_john", "x4_lucy", "aisjiuxu"];
for (const v of VOICES) {
  process.stdout.write(`  ${v.padEnd(16)} `);
  try {
    const pcm = await tts(TEXT, { vcn: v });
    writeFileSync(`voice-${v}.wav`, pcmToWav(pcm));
    console.log(`✅ ${(pcm.length/32000).toFixed(2)}s`);
  } catch (e) { console.log(`✗ ${e.message.slice(0, 60)}`); }
}
