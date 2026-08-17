<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---
title: "关于我"
created: 2026-08-17
tags: ["个人背景", "项目目标", "偏好"]
summary: "AI 每次对话都应了解的用户核心上下文：我是谁、我正在做什么、我的偏好与禁忌。"
---

# 👤 关于我（AI 必读的个人核心上下文）

> 💡 **核心原则**：保持短小精炼、真实准确。薄而精准的上下文远胜过又长又泛的自动生成内容。

---

## 1. 基本信息与当前目标

- **身份与背景**：研究生在读，同时在一家需要经常阅览、追踪与监控 Instagram 账号粉丝数及帖子点赞数的公司工作。
- **当前项目目标**：打造一个**同事也能直接下载使用的 Instagram 粉丝数 & 帖子点赞数自动采集与可视化监控桌面应用（exe 安装包）**。
- **为什么要自己做**：市面工具要么收费高昂、要么功能繁重且不支持团队定制共享；人工每天手动记录费时费力。

---

## 2. 沟通与偏好

- **语言**：母语为**中文**。除非我明确要求“用韩语 / 한국어로 해줘”，否则所有对话、代码注释和解释默认**100% 全程使用中文**。
- **解释风格**：通俗易懂，遇到专业名词（如 RLS、Token、MCP、Webhook 等）请在括号中用大白话解释，不要抛书袋。
- **节奏**：一次只做一件事，一步步推进。

---

## 3. 红线与禁忌（AI 不得违反的事项）

1. **不要一次性抛出过长代码或多个任务**：一步步引导，完成一步确认一步。
2. **严禁未经确认直接删除或大范围推翻现有代码**。
3. **禁止将 API Key、密码等机密明文硬编码**：必须使用环境变量（`.env`）。
4. **不要替我做主观决定**：在关键需求和方向上多向我提问，让我来做决定。
5. **所有代码修改前必须先提供测试/预览代码 (Test Code) 供我确认**：在正式修改任何已有代码前，必须先编写测试/对照代码，明确列出即将修改的都是哪些部分、各自有什么具体作用，待我确认后再行修改。

---

## 4. 运行环境与技术偏好

- **操作系统**：Windows
- **技术栈偏好**：Next.js + 现代轻量 UI + Supabase 数据存储（或轻量后端 API）

