# Instagram 自动抓取核心代码归档与拆分指南

本项目包含所有与 Instagram 数据自动抓取、代理转发、解析器与容错调度相关的完整代码实现。

---

## 目录结构与模块归类建议

为了方便后续进行更细致的拆分（例如按 **解析层 (Parsers)**、**网络/代理层 (Fetchers/Proxies)**、**策略路由 (Strategies)**、**数据模型 (Models/DTO)**、**UI调度器 (Schedulers)** ），建议参考如下归类结构：

`	ext
monitor-app/
├── cf-worker/
│   ├── worker.js              # [代理层] Cloudflare Edge 镜像代理抓取服务
│   └── wrangler.json
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── scrape/
│   │   │   │   └── route.ts   # [核心层] 服务端统一抓取入口 (策略分流 + 多重解析)
│   │   │   └── debug/
│   │   │       └── route.ts   # [测试层] 多爬虫 UA 连通性测试
│   │   ├── page.tsx           # [交互层] 客户端多 URL 批量调度、状态机与兜底
│   │   └── ...
└── INS_SCRAPING_CODE_ARCHIVE.md # 本归档文档
`

---

## 模块 1：服务端核心抓取 API (src/app/api/scrape/route.ts)

> **功能**：接收 URL，清洗入参，识别主页与帖子/Reels，利用 LD+JSON、内部 JS 状态正则与 Meta 标签三级回退策略提取数据。

`	ypescript
import { NextRequest, NextResponse } from next/server;

// 1. 数量单位清洗与紧凑缩写解析 (支持 1.2k / 3.4M / 5.6万 / 逗号分隔)
function parseCompactNumber(str: string | number): number {
  if (typeof str === number) return Math.round(str);
  if (!str) return 0;

  const clean = str.toString().trim().replace(/,/g, ");
 const num = parseFloat(clean);
 if (isNaN(num)) return 0;

 const lower = clean.toLowerCase();
 if (lower.endsWith(k)) return Math.round(num * 1000);
 if (lower.endsWith(m)) return Math.round(num * 1000000);
 if (lower.endsWith(b)) return Math.round(num * 1000000000);
 if (lower.endsWith(万)) return Math.round(num * 10000);
 if (lower.endsWith(亿)) return Math.round(num * 100000000);

 return Math.round(num);
}

export async function POST(req: NextRequest) {
 try {
 const { url } = await req.json();

 if (!url || typeof url !== string) {
 return NextResponse.json({ error: 请提供有效的链接 }, { status: 400 });
 }

 const rawUrl = url.replace(/['' ”'`]/g, ").trim();

 // 平台合法性校验
 const isInstagram = rawUrl.includes(instagram.com) || rawUrl.includes(instagr.am);

 if (!isInstagram) {
 return NextResponse.json({
 success: false,
 isInvalidPlatform: true,
 url: rawUrl,
 error: 非 Instagram 链接,
 });
 }

 // 净化 URL：去除跟踪参数 (?igsh=..., ?utm_source=...)
 const cleanUrl = rawUrl.split(?)[0].split(#)[0].replace(/\/+$/, ");

    // 区分帖子/Reels/视频 与 个人主页
    const isPostOrReel =
      cleanUrl.includes("/p/) ||
 cleanUrl.includes(/reel/) ||
 cleanUrl.includes(/reels/) ||
 cleanUrl.includes(/tv/);
 const isProfile = !isPostOrReel;

 let likesCount: number | null = null;
 let followerCount: number | null = null;
 let titleOrAccount = ";
    let identifier = ";

 // ----------------------------------------------------
 // 策略 A：个人主页抓取 (Profile Scraping)
 // ----------------------------------------------------
 if (isProfile) {
 const username = cleanUrl.split(instagram.com/).pop()?.split(/)[0]?.replace(@, ").trim() || ";
 identifier = `@${username}`;

 if (username) {
 try {
 const directRes = await fetch(`https://www.instagram.com/${username}/`, {
 headers: {
 User-Agent:
 Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1,
 Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8,
 Accept-Language: en-US,en;q=0.9,
 },
 cache: no-store,
 });

 if (directRes.ok) {
 const html = await directRes.text();
 const metaMatch =
 html.match(/<meta\s+(?:name|property)=og:description\s+content=([^]*)/i) ||
 html.match(/<meta\s+(?:name|property)=description\s+content=([^]*)/i);

 if (metaMatch && metaMatch[1]) {
 const desc = metaMatch[1];
 const isLoginWall =
 desc.toLowerCase().includes(create an account or log in) ||
 desc.toLowerCase().includes(sign up);

 if (!isLoginWall) {
 // 提取多语言粉丝数 (支持: Followers / 팔로워 / 关注者)
 const followerMatch =
 desc.match(/(\d[\d\.,]*)\s*Followers/i) ||
 desc.match(/(\d[\d\.,]*)\s*팔로워/i) ||
 desc.match(/(\d[\d\.,]*)\s*关注者/i) ||
 desc.match(/([\d\.]+[KMBkmb])\s*Followers/i);

 if (followerMatch && followerMatch[1]) {
 followerCount = parseCompactNumber(followerMatch[1]);
 }

 // 提取展示昵称
 const nameMatch =
 desc.match(/from\s+([^(&@\n]+?)\s*(?:\(|&#064;|@)/i) ||
 desc.match(/(?:photos and videos from)\s+([^(&]+)/i);
 if (nameMatch && nameMatch[1] && !titleOrAccount) {
 titleOrAccount = nameMatch[1].replace(/&#[^;]+;/g, ").trim();
                }
              }
            }
          }
        } catch (err: any) {
          console.error("Profile scrape error:, err);
 }
 }

 if (!titleOrAccount) titleOrAccount = `@${username} 官方主页`;
 likesCount = null; // 主页不填充点赞
 }

 // ----------------------------------------------------
 // 策略 B：帖子 / Reel / TV 抓取 (Post/Reel Scraping)
 // ----------------------------------------------------
 else {
 let shortcode = post;
 if (cleanUrl.includes(/reel/)) shortcode = cleanUrl.split(/reel/)[1]?.split(/)[0] || reel;
 else if (cleanUrl.includes(/reels/)) shortcode = cleanUrl.split(/reels/)[1]?.split(/)[0] || reel;
 else if (cleanUrl.includes(/p/)) shortcode = cleanUrl.split(/p/)[1]?.split(/)[0] || post;

 identifier = `ID: ${shortcode}`;

 try {
 const directRes = await fetch(`${cleanUrl}/`, {
 headers: {
 User-Agent:
 Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1,
 Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8,
 Accept-Language: en-US,en;q=0.9,
 },
 cache: no-store,
 });

 if (directRes.ok) {
 const html = await directRes.text();

 // 1. 优先尝试解析结构化 LD+JSON
 const ldJsonMatches = html.match(/<script\s+type=application\/ld\+json>([\s\S]*?)<\/script>/gi);
 if (ldJsonMatches) {
 for (const match of ldJsonMatches) {
 try {
 const jsonText = match.replace(/<script[^>]*>/i, ").replace(/<\/script>/i, ");
 const parsed = JSON.parse(jsonText);
 if (parsed) {
 if (parsed.name) titleOrAccount = parsed.name;
 
 // 作者名提取 (兼容 Collab 联名发帖首位主发作者)
 if (parsed.author) {
 const authorObj = Array.isArray(parsed.author) ? parsed.author[0] : parsed.author;
 if (authorObj && (authorObj.alternateName || authorObj.name)) {
 const rawAuthor = authorObj.alternateName || authorObj.name;
 identifier = rawAuthor.startsWith(@) ? rawAuthor : `@${rawAuthor}`;
 }
 } else if (parsed.alternateName) {
 identifier = parsed.alternateName;
 }

 const stats = parsed.interactionStatistic;
 if (Array.isArray(stats)) {
 for (const stat of stats) {
 if (stat.interactionType?.includes(LikeAction) && stat.userInteractionCount) {
 likesCount = parseCompactNumber(stat.userInteractionCount);
 }
 }
 }
 }
 } catch {
 // 忽略异常 JSON
 }
 }
 }

 // 2. 正则回退：匹配内部 JS 状态
 if (likesCount === null) {
 const likesRegexMatch =
 html.match(/edge_liked_by\s*:\s*\{\s*count\s*:\s*(\d+)\s*\}/i) ||
 html.match(/edge_media_preview_like\s*:\s*\{\s*count\s*:\s*(\d+)\s*\}/i) ||
 html.match(/like_count\s*:\s*(\d+)/i);
 if (likesRegexMatch && likesRegexMatch[1]) {
 likesCount = parseInt(likesRegexMatch[1], 10);
 }
 }

 // 3. 正则回退：匹配 Meta og:description 描述内容
 if (likesCount === null) {
 const metaMatch =
 html.match(/<meta\s+(?:name|property)=og:description\s+content=([^]*)/i) ||
 html.match(/<meta\s+(?:name|property)=description\s+content=([^]*)/i);

 if (metaMatch && metaMatch[1]) {
 const desc = metaMatch[1];
 const likesMatch =
 desc.match(/([\d\.,KMBkmb万亿]+)\s*likes?/i) ||
 desc.match(/([\d\.,KMBkmb万亿]+)\s*个?赞/i) ||
 desc.match(/([\d\.,KMBkmb万亿]+)\s*次赞/i) ||
 desc.match(/([\d\.,KMBkmb万亿]+)\s*개/i);

 if (likesMatch && likesMatch[1]) {
 likesCount = parseCompactNumber(likesMatch[1]);
 }

 // 联名帖作者提取
 const authorMatch =
 desc.match(/-\s*([a-zA-Z0-9_\.\s\&]+?)\s+on\s+/i) ||
 desc.match(/@([a-zA-Z0-9_\.]+)/i);

 if (authorMatch && authorMatch[1] && (identifier.includes(reel) || identifier.includes(post))) {
 let primaryAuthor = authorMatch[1].trim();
 if (primaryAuthor.includes( and )) {
 primaryAuthor = primaryAuthor.split( and )[0].trim();
 }
 identifier = primaryAuthor.startsWith(@) ? primaryAuthor : `@${primaryAuthor}`;
 }

 const cleanDesc = desc.replace(/^[\d\.,KMBkmb万亿]+\s*(?:likes|Followers|关注者|팔로워),?\s*[\d\.,KMBkmb万亿]*\s*(?:comments|Following|关注|팔로잉)?,?\s*[\d\.,KMBkmb万亿]*\s*(?:Posts|帖子|게시物)?\s*-\s*/i, ").trim();
              if (!titleOrAccount || titleOrAccount.includes("likes,)) {
 titleOrAccount = cleanDesc || desc;
 }
 }
 }
 }
 } catch (err: any) {
 console.error(Post scrape error:, err);
 }

 if (!titleOrAccount || titleOrAccount.toLowerCase().includes(log in)) titleOrAccount = `Instagram 动态 (${shortcode})`;
 followerCount = null; // 帖子不填充粉丝
 }

 const hasRealData = (isProfile && followerCount !== null) || (!isProfile && likesCount !== null);

 return NextResponse.json({
 success: true,
 hasRealData,
 url: rawUrl,
 type: isProfile ? profile : post,
 identifier,
 titleOrAccount,
 likesCount,
 followerCount,
 fetchedAt: new Date().toLocaleTimeString(),
 });
 } catch (err: any) {
 return NextResponse.json(
 { error: err.message || 抓取异常, success: false },
 { status: 500 }
 );
 }
}
```

---

## 模块 2：Cloudflare Worker 代理层 (`cf-worker/worker.js`)

> **功能**：部署于 Cloudflare Edge 网络，绕过机房 IP 封锁代理访问第三方镜像（Imginn），并自动解析粉丝数与昵称。

```javascript
/**
 * Cloudflare Worker: Instagram Profile Follower Proxy
 * 部署于 Cloudflare 边缘网络，代理访问 Imginn 镜像
 * 
 * 使用方式: GET /?u=adidaskr
 * 返回: { username: adidaskr, displayName: ..., followerCount: 99000, success: true }
 */

const BOT_UA = Twitterbot/1.0;

function parseCompactNumber(str) {
 if (!str) return 0;
 const clean = str.toString().trim().replace(/,/g, ");
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  const lower = clean.toLowerCase();
  if (lower.endsWith("k)) return Math.round(num * 1000);
 if (lower.endsWith(m)) return Math.round(num * 1000000);
 if (lower.endsWith(b)) return Math.round(num * 1000000000);
 return Math.round(num);
}

export default {
 async fetch(request) {
 const url = new URL(request.url);
 const username = url.searchParams.get(u);

 const corsHeaders = {
 Access-Control-Allow-Origin: *,
 Content-Type: application/json,
 };

 if (!username) {
 return new Response(JSON.stringify({ error: Missing ?u= parameter }), {
 status: 400,
 headers: corsHeaders,
 });
 }

 const cleanUsername = username.replace(@, ").trim();

    try {
      const res = await fetch(`https://imginn.com/${cleanUsername}/`, {
        headers: {
          "User-Agent: BOT_UA,
 Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8,
 Accept-Language: en-US,en;q=0.9,
 },
 });

 if (!res.ok) {
 return new Response(JSON.stringify({
 username: cleanUsername,
 success: false,
 error: `Imginn returned ${res.status}`,
 }), { status: 200, headers: corsHeaders });
 }

 const html = await res.text();

 // Cloudflare 验证盾检测
 if (html.includes(Just a moment) || html.includes(challenges.cloudflare.com)) {
 return new Response(JSON.stringify({
 username: cleanUsername,
 success: false,
 error: Cloudflare challenge,
 }), { status: 200, headers: corsHeaders });
 }

 // 提取粉丝数与昵称
 const followerMatch =
 html.match(/([\d\.,KMBkmb]+)\s*Followers/i) ||
 html.match(/([\d\.,KMBkmb]+)\s*팔로워/i) ||
 html.match(/([\d\.,KMBkmb]+)\s*关注者/i);

 const nameMatch =
 html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
 html.match(/class=name[\s\S]*?<h2>([\s\S]*?)<\/h2>/i);

 const followerRaw = followerMatch ? followerMatch[1] : null;
 const followerCount = followerRaw !== null ? parseCompactNumber(followerRaw) : null;
 const displayName = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, ").trim() : null;

      return new Response(JSON.stringify({
        username: cleanUsername,
        displayName,
        followerRaw,
        followerCount,
        success: followerCount !== null,
      }), { status: 200, headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({
        username: cleanUsername,
        success: false,
        error: err.message,
      }), { status: 200, headers: corsHeaders });
    }
  },
};
```

---

## 模块 3：爬虫 UA 连通性测试工具 (`src/app/api/debug/route.ts`)

> **功能**：模拟各种搜索引擎 / 社交媒体 Bot 的 User-Agent，测试目标网站或镜像站的返回状态与验证盾触发情况。

```typescript
import { NextRequest, NextResponse } from "next/server;

export async function GET(req: NextRequest) {
 const results: Record<string, any> = {};
 const handle = adidaskr;
 
 const uaTests = [
 { name: Twitterbot, ua: Twitterbot/1.0 },
 { name: LinkedInBot, ua: LinkedInBot/1.0 (compatible; Mozilla/5.0; Jakarta Commons-HttpClient/3.1 +http://www.linkedin.com) },
 { name: Googlebot, ua: Googlebot/2.1 (+http://www.google.com/bot.html) },
 { name: Bingbot, ua: Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) },
 { name: Slackbot, ua: Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots) },
 ];

 for (const { name, ua } of uaTests) {
 try {
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), 8000);
 const res = await fetch(`https://imginn.com/${handle}/`, {
 headers: {
 User-Agent: ua,
 Accept: text/html,application/xhtml+xml,
 Accept-Language: en-US,en;q=0.9,
 },
 signal: controller.signal,
 cache: no-store,
 });
 clearTimeout(timer);
 const html = await res.text();
 const hasChallenge = html.includes(Just a moment) || html.includes(challenges.cloudflare.com);
 const followerMatch = html.match(/([\d\.,KMBkmb]+)\s*Followers/i);
 
 results[name] = {
 status: res.status,
 len: html.length,
 cloudflareBlocked: hasChallenge,
 followers: followerMatch ? followerMatch[1] : null,
 snippet: html.substring(0, 200),
 };
 } catch(e: any) {
 results[name] = { error: e.message || timeout };
 }
 }

 return NextResponse.json({
 testedHandle: handle,
 results,
 serverRegion: process.env.VERCEL_REGION || unknown,
 });
}
```

---

## 模块 4：前端批量抓取与状态调度器 (`src/app/page.tsx` 核心提取)

> **功能**：管理多链接并发/串行批量请求、前置格式校验、自动提取 Handle 与失败 Fallback 逻辑。

```typescript
// 数据行模型定义
export interface DataRow {
 id: string;
 url: string;
 type: post | profile;
 identifier: string; // 例如 @username 或 ID: shortcode
 titleOrAccount: string; // 标题、发帖作者或主页昵称
 likesCount: number | null;
 followerCount: number | null;
 status: success | pending_input | invalid_platform;
 updatedAt: string;
}

// 批量抓取调度函数
export async function batchFetchUrls(
 urls: string[],
 onItemUpdated: (item: DataRow) => void,
 onProgress?: (current: number, total: number) => void
) {
 for (let i = 0; i < urls.length; i++) {
 const rawUrl = urls[i];
 const url = rawUrl.replace(/['“ ‘']/g, ).trim();
 if (!url) continue;

 const isInstagram = url.includes(instagram.com) || url.includes(instagr.am);

 // 1. 非 Instagram 链接前置拦截与标记
 if (!isInstagram) {
 let domain = 非 Ins 域名;
 try { domain = new URL(url).hostname.replace(www., ); } catch { /* ignore */ }
 
 onItemUpdated({
 id: invalid--,
 url,
 type: post,
 identifier: domain,
 titleOrAccount: 非 Instagram 网页 (),
 likesCount: null,
 followerCount: null,
 status: invalid_platform,
 updatedAt: new Date().toLocaleTimeString()
 });
 continue;
 }

 // 2. 发起 API 请求抓取
 try {
 const res = await fetch(/api/scrape, {
 method: POST,
 headers: { Content-Type: application/json },
 body: JSON.stringify({ url }),
 });

 const data = await res.json();

 if (res.ok && data.success) {
 onItemUpdated({
 id: item--,
 url: data.url,
 type: data.type,
 identifier: data.identifier,
 titleOrAccount: data.titleOrAccount,
 likesCount: data.likesCount,
 followerCount: data.followerCount,
 status: data.hasRealData ? success : data.type === profile ? pending_input : success,
 updatedAt: data.fetchedAt || new Date().toLocaleTimeString(),
 });
 } else {
 // 兜底降级处理
 const isPostOrReel = url.includes(/p/) || url.includes(/reel/) || url.includes(/reels/) || url.includes(/tv/);
 const handle = url.split(instagram.com/).pop()?.split(/)[0]?.split(?)[0]?.replace(@, ) || user_;

 onItemUpdated({
 id: item--,
 url,
 type: isPostOrReel ? post : profile,
 identifier: @,
 titleOrAccount: @ Instagram,
 likesCount: null,
 followerCount: null,
 status: isPostOrReel ? success : pending_input,
 updatedAt: new Date().toLocaleTimeString()
 });
 }
 } catch {
 const isPostOrReel = url.includes(/p/) || url.includes(/reel/) || url.includes(/reels/) || url.includes(/tv/);
 const handle = url.split(instagram.com/).pop()?.split(/)[0]?.split(?)[0]?.replace(@, ) || user_;

 onItemUpdated({
 id: item--,
 url,
 type: isPostOrReel ? post : profile,
 identifier: @,
 titleOrAccount: @ Instagram,
 likesCount: null,
 followerCount: null,
 status: isPostOrReel ? success : pending_input,
 updatedAt: new Date().toLocaleTimeString()
 });
 }

 if (onProgress) onProgress(i + 1, urls.length);
 }
}
`
