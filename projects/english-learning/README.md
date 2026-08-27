# 客户项目 · 初中英语学习平台「萌宠英语岛」(工作名)

> 客户需求:基于江苏初中英语教材(牛津译林版)做一个部署在网站上的英语学习软件。
> 7/8/9 年级分级;寓教于乐、场景中练英语;每日任务得积分,积分抽宠物粮盲盒;
> 参考 ChineseLearn 的宠物 + 宠物好友体系;课文单词学习;全英文动画区(独立开关,仅寒暑假与周末开放)。
>
> 交互原型:[`prototype.html`](prototype.html)(自包含单文件,浏览器直接打开,可完整点玩核心循环)

## 文件索引

| 文件 | 内容 |
|---|---|
| [`00-STATUS.md`](00-STATUS.md) | ⭐ **进度存档**:盘面、完成度、API 状态、阻塞与待办、里程碑对照(先读这个) |
| 本 README | 产品结构、开源借鉴、版权合规、技术方案、里程碑(V1) |
| [`02-battle-plan.md`](02-battle-plan.md) | **对标科大讯飞作战方案**:功能对标矩阵、差异化八张牌、中考模考规格、架构与单位经济、视觉三方向 |
| [`03-quote-plan.md`](03-quote-plan.md) | **报价与交付测算(内部)**:8 班/平板/10 万盘面的成本模型、报价结构、范围清单、平板技术要点、里程碑 |
| [`05-api-onboarding.md`](05-api-onboarding.md) | **API 账号开通清单**:讯飞三件套获取步骤、企业认证前置条件、账号归属建议 |
| [`04-speech-decision.md`](04-speech-decision.md) | **语音选型决策**:示范音(英式/预生成)与评测(讯飞 ISE)分开选型、引擎对比、成本修正、对甲方话术 |
| [`research/`](research/) | 8 组调研原始资料(讯飞功能/痛点、初中生审美、学习App设计、语音评测API、DeepSeek、江苏中考口语、缺口批判),含全部来源链接 |
| [`prototype.html`](prototype.html) | 学生端交互原型 V2(岛屿版) |
| [`proposal.html`](proposal.html) | 甲方汇报页(方案书评审版,含三个视觉方向风格小样) |
| [`server/`](server/) | AI 对话演示服务端(DeepSeek 代理)+ 示范音批量生成脚本 `tts-batch.mjs` |

## 本地运行 AI 真对话

```bash
cd projects/english-learning/server
cp .env.example .env.local   # 填入 DEEPSEEK_API_KEY(.env.local 已被 gitignore,绝不提交)
node server.mjs              # → http://localhost:3210
```

打开后进「情景」页,「AI 自由对话」显示已连接即可开聊:自由输入英文,AI 扮演店员并实时纠错(JSON 结构:reply/correction/tip)。
在线 Artifact 预览无服务端,该入口自动降级为提示态。

## 1. 产品结构

### 分级(与教材同步)

| 年级 | 教材册次 | 示例单元 |
|---|---|---|
| 七年级 | 译林 7A / 7B | 7A Unit 1 *This is me!* … |
| 八年级 | 译林 8A / 8B | 8A Unit 1 *Friends* … |
| 九年级 | 译林 9A / 9B | 9A Unit 1 *Know yourself* … |

- 单元内学习闭环:**新学单词 → 间隔复习 → 拼写挑战 → 课文跟读 → 情景对话 → 单元小测**
- 复习由 SRS(间隔重复)驱动,跨单元滚动;可选入学摸底,自动定位起始单元

### 核心循环(玩法经济)

```
每日任务(学/复习/对话/小测)──→ 积分 ──→ 盲盒(50 分/抽)──→ 宠物粮/玩具
      ↑                                                        │
      └────────── 宠物成长、连续打卡、宠物好友互动 ←──────────┘
```

- **每日任务**:新学 8 词 (+20) / 复习 12 词 (+15) / 情景对话 1 场 (+25) / 单元小测 (+20);连续打卡有加成
- **盲盒**:普通粮 60% / 风味粮 25% / 豪华粮 10% / 稀有玩具 5%;**10 抽保底**出豪华及以上(概率公示,家长可见)
- **宠物**:喂食得经验 → 升级解锁装扮/岛屿装饰;沿用 ChineseLearn 宠物设定
- **宠物好友**:同班同学宠物互访、送小鱼干。⚠️ 未成年人社交默认关闭,仅班级内、仅点赞类轻互动,需家长/教师开启
- 防沉迷内建:学习模块不限,**娱乐模块(动画、好友)有时段与时长控制**——这是合规卖点,写进家长端

### 动画片区(独立开关)

- 内容:全英文动画(客户提到小猪佩奇或国内热门动画)
- 门禁逻辑:`家长总开关 && (周末 || 寒暑假日历) && 当日时长余额`;假期日历可配置(按江苏校历每年更新)
- 观看模式:全英文音轨,可选英文字幕;看完可接 1 道趣味理解题(把娱乐拉回学习)
- ⚠️ **版权红线**:小猪佩奇版权在 Hasbro/eOne,不能自行嵌播。三条路给客户选:
  1. 接入持牌平台的正版内容合作(优先)
  2. 客户自行采购内容版权
  3. 换用可授权的国产动画内容方
  原型中动画区为占位卡片,不含真实内容。

## 2. 开源借鉴清单(调研结论)

| 项目 | 许可 | 怎么用 |
|---|---|---|
| [sanidhyy/duolingo-clone (Lingo)](https://github.com/sanidhyy/duolingo-clone) | **MIT** | ✅ **做底子**:Next.js + Drizzle + PostgreSQL + Clerk,任务/积分/商店/爱心/彩带等游戏化组件现成,与我们主站同栈 |
| [open-spaced-repetition / ts-fsrs](https://github.com/open-spaced-repetition/awesome-fsrs) | MIT | ✅ 复习调度引擎(FSRS 算法 TS 实现),直接引入 |
| [skywind3000/ECDICT](https://github.com/skywind3000/ECDICT) | 开放词典库 | ✅ 音标/释义底层数据源(入库前复核其数据来源声明) |
| [RealKai42/qwerty-learner](https://github.com/realkai42/qwerty-learner) | **GPL-3.0** | ⚠️ **只借鉴玩法**(拼写肌肉记忆、默写模式、词库组织方式,含人教 3-9 年级词库先例);代码不可并入闭源产品(前端 JS 属分发,GPL 会传染) |
| [baturyilmaz/wordpecker-app](https://github.com/baturyilmaz/wordpecker-app) | 见仓库 | 借鉴:LLM 生成课程/词表复习的交互设计 |
| [bryanjenningz/react-duolingo](https://github.com/bryanjenningz/react-duolingo) | 见仓库 | 借鉴:T3 栈的练习题型组件拆法 |
| [LibreLingo](https://github.com/LibreLingo/LibreLingo) | AGPL-3.0(已归档) | 借鉴:YAML 课程描述格式的思路,代码不引入 |
| [LinXueyuanStdio/DictionaryData](https://github.com/LinXueyuanStdio/DictionaryData) / [kajweb/dict](https://github.com/kajweb/dict) / [mahavivo/english-wordlists](https://github.com/mahavivo/english-wordlists) | 数据来源存疑 | ⚠️ 多为第三方 App 词书爬取,商用不碰;仅作词表结构参考。中考词汇表(教育部门公布)可用 |

**结论**:Lingo(MIT)当骨架 + ts-fsrs 当复习引擎 + ECDICT 当词典底料,玩法抄 qwerty-learner 和我们自己的 ChineseLearn,课程数据自建。

## 3. 内容与版权(必须和客户对齐)

1. **教材文本**:牛津译林教材课文、配套录音版权在译林出版社。方案:
   - 单词表:按单元自建词库(词汇+音标+释义用开放词典数据,例句**全部原创**)
   - 课文:不整篇复制。用「原创同主题短文」做跟读材料,或由**客户取得出版社授权**后接入原文与配套音频(报价分开列)
2. **发音**:MVP 用 TTS(浏览器 Web Speech / 云 TTS);跟读评测接讯飞/腾讯云语音评测 SDK(商用授权,预算单列)
3. **AI 情景对话**:规则化选择题起步(原型已演示),二期接 Claude API 做自由对话 + 纠错,内容过安全审核层
4. **资质**:面向中小学生的学习类网站/App → 教育移动应用备案、ICP、未成年人个人信息保护规则;若客户以培训机构身份运营,提示其自查「双减」学科类培训边界(我们是软件交付方,业务定性由客户确认)

## 4. 技术方案

- **前端/后端**:Next.js(App Router)+ Drizzle + PostgreSQL,基于 Lingo 改造;部署 Vercel 或客户服务器
- **账号体系**:学生(手机号/学号)+ 家长绑定 + (可选)教师/班级维度;Clerk 换成国内可用的自建 auth
- **内容管线**:单元 → 词表/短文/情景脚本/题目,JSON Schema 定义,后台可维护;寒暑假日历表按年配置
- **关键模块**:SRS 调度(ts-fsrs)/ 积分与盲盒(服务端判定 + 概率公示 + 保底计数)/ 时段门禁(服务端校验,防改本地时间)/ 家长端(开关、周报、时长)
- **埋点**:沿用 track() 方案,核心漏斗:任务完成率、连续打卡、盲盒参与率、单元通过率

## 5. 里程碑建议

| 阶段 | 内容 | 产出 |
|---|---|---|
| M1(原型确认) | 本原型 + 方案评审,客户定内容版权路线 | 需求冻结 |
| M2(MVP) | 7 年级 × 2 个单元全闭环:单词/复习/拼写/情景×2/小测 + 积分盲盒宠物 + 家长端 | 可试用站 |
| M3(全量) | 7-9 年级全单元、宠物好友、动画区接入、语音评测 | 上线版 |
| M4(运营) | 班级/教师端、数据周报、内容年更(词库/校历) | 维保合同 |

---
*本目录为客户项目方案,不含客户名称与商务信息;原型内所有内容均为演示用原创示例。*
