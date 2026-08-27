# Ollama AI 翻译应用 — 实施计划

## 概述

在 `d:\1\sb\1\web\Translate` 目录下开发一个基于 TypeScript + React + Ollama 的 AI 翻译应用。支持 12 种语言互译、流式实时预览、3 秒超时保护、完整错误处理，单元测试覆盖率 ≥80%。

## 当前状态分析

- **Translate/ 目录**：已存在 `package.json`（`type: module`，仅含 typescript + vite 依赖）和 `pnpm-lock.yaml`，无任何源码
- **Ollama**：本机未安装，需在 README 中提供安装指引；应用通过 `http://localhost:11434` 调用
- **父项目约定**：React 19 + Vite 8 + Ant Design 6 + TypeScript strict（`@/*` 路径别名、`verbatimModuleSyntax`、`noUnusedLocals`），ESLint flat config

## 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| UI 框架 | React 19 + Vite 8 | 与父项目一致 |
| 组件库 | Ant Design 6 | Select / Button / Input / message / Spin |
| 语言 | TypeScript 7 (strict) | 完整类型定义 |
| 测试 | Vitest 3 + @vitest/coverage-v8 | 覆盖率 ≥80% |
| Lint | ESLint flat config | 与父项目一致 |
| AI 接口 | Ollama `/api/chat` (streaming NDJSON) | Vite dev proxy 代理到 localhost:11434 |

## 项目结构

```
Translate/
├── src/
│   ├── components/              # UI 组件
│   │   ├── Translator.tsx       # 主布局：左输入 / 右结果 + 语言栏
│   │   ├── LanguageSelector.tsx # 语言下拉选择（源/目标 + 交换按钮）
│   │   ├── TextInputPanel.tsx   # 源文本输入区（字符计数 + 清空）
│   │   └── ResultPanel.tsx      # 翻译结果展示（流式 + 复制 + 状态）
│   ├── services/
│   │   └── ollama.ts            # Ollama API 封装（fetch streaming + abort）
│   ├── hooks/
│   │   └── useTranslation.ts    # 翻译状态管理（loading/result/error/abort）
│   ├── constants/
│   │   └── languages.ts         # 12 种语言定义
│   ├── types/
│   │   └── index.ts             # 全局类型
│   ├── utils/
│   │   ├── prompt.ts            # 构建 system/user prompt
│   │   └── clipboard.ts         # 复制到剪贴板
│   ├── __tests__/               # 单元测试
│   │   ├── ollama.test.ts       # Ollama 服务（mock fetch + ReadableStream）
│   │   ├── prompt.test.ts       # prompt 构建
│   │   ├── languages.test.ts    # 语言常量完整性
│   │   ├── useTranslation.test.ts # 翻译 hook 状态机
│   │   └── clipboard.test.ts    # 剪贴板工具
│   ├── App.tsx                  # 根组件
│   ├── App.css                  # 全局样式
│   └── main.tsx                 # 入口
├── index.html
├── vite.config.ts               # 含 Ollama 代理 + Vitest 配置
├── tsconfig.json                # 项目引用
├── tsconfig.app.json            # 应用 TS 配置
├── vitest.config.ts             # 测试配置（或合并到 vite.config）
├── eslint.config.js
├── package.json
└── README.md                    # 安装/使用/API 文档
```

## 详细实施步骤

### 步骤 1：项目脚手架与依赖

**文件**：`package.json`、`vite.config.ts`、`tsconfig.json`、`tsconfig.app.json`、`eslint.config.js`、`index.html`

- 更新 `package.json`，添加依赖：
  - `dependencies`：`react`、`react-dom`、`antd`、`@ant-design/icons`
  - `devDependencies`：`@vitejs/plugin-react`、`@types/react`、`@types/react-dom`、`@types/node`、`vitest`、`@vitest/coverage-v8`、`@testing-library/react`、`@testing-library/jest-dom`、`jsdom`、`typescript-eslint`、`eslint`、`@eslint/js`、`globals`、`eslint-plugin-react-hooks`、`eslint-plugin-react-refresh`
  - `scripts`：`dev`、`build`（`tsc -b && vite build`）、`lint`、`test`（`vitest run`）、`test:coverage`（`vitest run --coverage`）、`preview`
- `vite.config.ts`：
  - `@vitejs/plugin-react` 插件
  - 路径别名 `@` → `./src`
  - `server.proxy`：`/ollama-api` → `http://localhost:11434`（rewrite 去掉前缀）
  - `test` 配置（Vitest）：`environment: jsdom`、`globals: true`、`setupFiles`、`coverage` 阈值 80%
- `tsconfig.json`：项目引用（参考父项目 `tsconfig.json` + `tsconfig.app.json` 结构）
  - `strict: true`、`noUnusedLocals`、`noUnusedParameters`、`verbatimModuleSyntax`
  - `@/*` 路径别名
- `eslint.config.js`：复用父项目 flat config
- `index.html`：root div + module script

### 步骤 2：类型定义与常量

**文件**：`src/types/index.ts`、`src/constants/languages.ts`

`types/index.ts`：
```typescript
/** 支持的语言 */
export interface Language {
  code: string        // ISO 639-1，如 'zh'
  name: string        // 中文名，如 '中文'
  enName: string      // 英文名，如 'Chinese'
  flag: string        // emoji 国旗
}

/** 翻译请求参数 */
export interface TranslateParams {
  text: string
  sourceLang: string  // Language.code
  targetLang: string
  model?: string      // 默认 'qwen2.5'
}

/** 翻译状态 */
export type TranslateStatus = 'idle' | 'loading' | 'streaming' | 'success' | 'error'

/** Ollama chat 请求体 */
export interface OllamaChatRequest {
  model: string
  messages: { role: 'system' | 'user'; content: string }[]
  stream: true
}

/** Ollama 流式响应单行 */
export interface OllamaChatChunk {
  model: string
  message: { role: string; content: string }
  done: boolean
}

/** 翻译错误类型 */
export type TranslateErrorKind =
  | 'NETWORK_ERROR'    // Ollama 不可达
  | 'TIMEOUT'          // 超时
  | 'MODEL_NOT_FOUND'  // 模型不存在
  | 'EMPTY_INPUT'      // 空输入
  | 'PARSE_ERROR'      // 响应解析失败
  | 'ABORTED'          // 用户取消

export interface TranslateError {
  kind: TranslateErrorKind
  message: string      // 用户可读的中文提示
}
```

`constants/languages.ts`：12 种语言
- 中文(zh)、英文(en)、日文(ja)、韩文(ko)、法文(fr)、德文(de)、西班牙文(es)、俄文(ru)、阿拉伯文(ar)、葡萄牙文(pt)、意大利文(it)、泰文(th)

### 步骤 3：Prompt 构建工具

**文件**：`src/utils/prompt.ts`

```typescript
import type { Language } from '@/types'

/** 构建 system prompt：指导模型仅输出译文 */
export function buildSystemPrompt(source: Language, target: Language): string

/** 构建 user prompt：源文本 */
export function buildUserPrompt(text: string, source: Language, target: Language): string
```

- System prompt 策略：`"You are a professional translator. Translate from {source.enName} to {target.enName}. Output ONLY the translated text, no explanations, no quotes."`
- 当 source.code === 'auto' 时提示模型自动检测源语言

### 步骤 4：Ollama 服务封装

**文件**：`src/services/ollama.ts`

核心函数：
```typescript
/**
 * 流式翻译：逐 chunk 回调，支持 abort 和 timeout
 * @returns 完整译文
 */
export async function streamTranslate(
  params: TranslateParams,
  onChunk: (partial: string) => void,
  signal?: AbortSignal,
): Promise<string>
```

实现要点：
- 调用 `POST /ollama-api/api/chat`（dev 下被 Vite 代理到 localhost:11434）
- 请求体：`{ model, messages: [system, user], stream: true }`
- 读取 `response.body` ReadableStream，按行分割 NDJSON
- 每行 `JSON.parse` → 提取 `message.content` → 调用 `onChunk(accumulated)`
- **3 秒超时**：内部创建 `AbortController`，与外部 signal 合并（`AbortSignal.any()`），`setTimeout(3000)` 后 abort
- 错误分类：
  - `fetch` 抛出 → `NETWORK_ERROR`（提示"无法连接 Ollama 服务，请确认已安装并运行"）
  - `AbortError` + 超时标志 → `TIMEOUT`（提示"翻译超时，请尝试更短的文本或更小的模型"）
  - HTTP 404 → `MODEL_NOT_FOUND`（提示"模型不存在，请运行 ollama pull {model}"）
  - JSON 解析失败 → `PARSE_ERROR`

### 步骤 5：翻译状态 Hook

**文件**：`src/hooks/useTranslation.ts`

```typescript
export function useTranslation() {
  // 状态：status, result, error, partial
  // 操作：translate(params), abort(), reset()
  // 内部管理 AbortController ref，避免重复请求
}
```

- `translate`：调用 `streamTranslate`，`onChunk` 更新 partial + status='streaming'，完成后 status='success'
- `abort`：调用 AbortController.abort()，status 回到 idle
- 防抖：输入变化后 500ms 无新输入才触发翻译（实时预览）
- 使用 `useRef` 跟踪最新请求，丢弃过时响应

### 步骤 6：UI 组件

**文件**：`src/components/LanguageSelector.tsx`、`TextInputPanel.tsx`、`ResultPanel.tsx`、`Translator.tsx`

**LanguageSelector**：
- Ant Design `Select`，源语言含"自动检测"选项 + 目标语言
- 中间"交换"按钮（`SwapOutlined`），点击交换源/目标语言
- 受控组件，`value` = `{ source, target }`，`onChange` 回调

**TextInputPanel**：
- Ant Design `Input.TextArea`，自适应高度
- 底部：字符计数 `{n}/5000`，超过限制红色提示
- 清空按钮（`DeleteOutlined`）
- `onChange` 实时回调父组件

**ResultPanel**：
- 上半：翻译状态指示（idle 提示 / loading Spin / streaming 逐字显示 + 光标 / error Alert）
- 下半：译文文本（可选中）
- 操作栏：复制按钮（`CopyOutlined`），复制成功 message 提示
- 空状态：占位提示"翻译结果将显示在这里"

**Translator**（主容器）：
- 顶部：标题"AI 智能翻译" + 模型选择（默认 qwen2.5）
- 中间：LanguageSelector
- 下方：左右分栏（TextInputPanel | ResultPanel），响应式（移动端纵向堆叠）
- 底部：翻译按钮（手动触发）+ 自动翻译开关（Switch，默认开）
- 集成 `useTranslation` hook

### 步骤 7：App 根组件与样式

**文件**：`src/App.tsx`、`src/App.css`、`src/main.tsx`

- `App.tsx`：`ConfigProvider`（中文 locale）+ `Translator` 组件
- `App.css`：渐变背景、卡片容器居中、响应式布局
- `main.tsx`：`createRoot` + `StrictMode`

### 步骤 8：单元测试

**文件**：`src/__tests__/*.test.ts`

**prompt.test.ts**：
- `buildSystemPrompt` 返回包含源/目标语言英文名
- `buildUserPrompt` 返回包含源文本
- "自动检测"场景的 prompt

**languages.test.ts**：
- 12 种语言全部有 code/name/enName/flag
- code 唯一性
- 包含必需的 6 种语言（zh/en/ja/ko/fr/de）

**ollama.test.ts**（mock fetch + ReadableStream）：
- 正常流式响应：逐 chunk 拼接，返回完整译文
- 网络错误：fetch reject → `NETWORK_ERROR`
- 超时：3s 后 abort → `TIMEOUT`
- 模型不存在：HTTP 404 → `MODEL_NOT_FOUND`
- 用户取消：外部 abort → `ABORTED`
- 空输入 → `EMPTY_INPUT`

**useTranslation.test.ts**（@testing-library/react renderHook）：
- 初始状态 idle
- translate 触发 loading → streaming → success
- abort 回到 idle
- 错误状态正确设置

**clipboard.test.ts**：
- `navigator.clipboard.writeText` mock，验证调用
- 不支持 clipboard API 时的降级（execCommand fallback）

### 步骤 9：README 文档

**文件**：`README.md`

包含：
1. 项目简介 + 功能列表
2. 环境要求（Node 20+、Ollama）
3. Ollama 安装指引（Windows/Mac/Linux）+ 模型拉取（`ollama pull qwen2.5`）
4. 快速开始（`pnpm install` → `pnpm dev`）
5. 使用说明（语言选择、输入翻译、自动翻译、复制结果）
6. API 文档（`streamTranslate` 函数签名、`TranslateParams`、`OllamaChatChunk` 等）
7. 项目结构说明
8. 测试说明（`pnpm test:coverage`）
9. 支持的语言列表
10. 常见问题（Ollama 连接失败、模型拉取慢、超时处理）

## 验证步骤

1. **安装与构建**：`pnpm install` → `pnpm build`（tsc + vite build 零错误）
2. **Lint**：`pnpm lint`（零 error/warning）
3. **测试覆盖率**：`pnpm test:coverage`（≥80%）
4. **开发运行**：`pnpm dev`，浏览器打开应用
5. **功能验证**（需 Ollama 运行 + 模型已拉取）：
   - 输入"你好世界"，选 zh→en，点翻译，3s 内返回 "Hello World"
   - 自动翻译开关打开，输入文本 500ms 后自动翻译
   - 流式预览：翻译过程中逐字显示
   - 交换语言按钮工作正常
   - 复制按钮将译文写入剪贴板
   - Ollama 未运行时显示明确错误提示
   - 超长文本（>5000 字）显示限制提示
6. **浏览器控制台**：无 error/warning

## 假设与决策

1. **默认模型**：`qwen2.5`（体积小、多语言能力强），用户可在 UI 切换
2. **Vite proxy** 仅在 dev 模式生效；生产环境需用户自行配置 Ollama 的 CORS 或反向代理
3. **自动检测源语言**：通过 prompt 让模型自动检测，不依赖外部 API
4. **防抖**：500ms，平衡响应速度与请求频率
5. **超时**：3s（用户要求），大文本可能不够，通过错误提示引导用户缩短输入或换小模型
6. **测试不含真实 Ollama 调用**：全部 mock，确保 CI 可重复
7. **不集成到父项目路由**：Translate 是独立项目，有自己的 package.json 和构建流程
