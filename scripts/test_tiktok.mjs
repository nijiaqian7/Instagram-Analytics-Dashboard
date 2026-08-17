// scripts/test_tiktok.mjs
// 独立测试脚本：验证 TikTok 主页粉丝数与视频点赞数抓取

function parseCompactNumber(str) {
  if (typeof str === "number") return Math.round(str);
  if (!str) return 0;

  const clean = str.toString().trim().replace(/,/g, "");
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;

  const lower = clean.toLowerCase();
  if (lower.endsWith("k")) return Math.round(num * 1000);
  if (lower.endsWith("m")) return Math.round(num * 1000000);
  if (lower.endsWith("b")) return Math.round(num * 1000000000);
  if (lower.endsWith("万")) return Math.round(num * 10000);
  if (lower.endsWith("亿")) return Math.round(num * 100000000);

  return Math.round(num);
}

export async function fetchTikTok(targetUrl) {
  console.log(`\n======================================================`);
  console.log(`🔍 正在测试解析: ${targetUrl}`);
  console.log(`======================================================`);

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,ko;q=0.8,zh-CN;q=0.7",
  };

  try {
    const res = await fetch(targetUrl, {
      headers,
      redirect: "follow",
    });

    if (!res.ok) {
      console.error(`❌ 请求失败，HTTP 状态码: ${res.status}`);
      return;
    }

    const html = await res.text();
    const finalUrl = res.url;
    const isVideo = targetUrl.includes("/video/") || finalUrl.includes("/video/");
    const isProfile = !isVideo;

    let followerCount = null;
    let likesCount = null;
    let titleOrAccount = "";
    let identifier = "";

    // 1. 尝试从 <script id="api-data"> 提取视频数据
    if (isVideo) {
      const apiDataMatch = html.match(/<script\s+id="api-data"[^>]*>([\s\S]*?)<\/script>/i);
      if (apiDataMatch && apiDataMatch[1]) {
        try {
          const apiData = JSON.parse(apiDataMatch[1]);
          const itemStruct = apiData?.videoDetail?.itemInfo?.itemStruct || apiData?.itemInfo?.itemStruct;
          if (itemStruct) {
            likesCount = itemStruct.stats?.diggCount ?? null;
            identifier = itemStruct.author?.uniqueId ? `@${itemStruct.author.uniqueId}` : "";
            titleOrAccount = itemStruct.desc || (itemStruct.author?.nickname ? `${itemStruct.author.nickname} 的视频` : "");
            console.log(`✨ [提取成功 - api-data 结构] 视频点赞数精准命中`);
          }
        } catch (e) {
          console.warn(`[api-data 解析微调]: ${e.message}`);
        }
      }
    }

    // 2. 尝试从 <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"> 提取主页/视频数据
    const universalMatch = html.match(/<script\s+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/i);
    if (universalMatch && universalMatch[1]) {
      try {
        const jsonData = JSON.parse(universalMatch[1]);
        const defaultScope = jsonData?.["__DEFAULT_SCOPE__"] || {};

        if (isProfile && followerCount === null) {
          const userDetail = defaultScope?.["webapp.user-detail"];
          if (userDetail && userDetail.userInfo) {
            const user = userDetail.userInfo.user;
            const stats = userDetail.userInfo.stats;
            identifier = `@${user?.uniqueId || ""}`;
            titleOrAccount = user?.nickname || identifier;
            followerCount = stats?.followerCount ?? null;
            console.log(`✨ [提取成功 - Universal Data] 主页粉丝数精准命中`);
          }
        } else if (isVideo && likesCount === null) {
          const videoDetail = defaultScope?.["webapp.video-detail"]?.itemInfo?.itemStruct;
          if (videoDetail) {
            identifier = `@${videoDetail.author?.uniqueId || ""}`;
            titleOrAccount = videoDetail.desc || `${identifier} 的 TikTok 视频`;
            likesCount = videoDetail.stats?.diggCount ?? null;
            console.log(`✨ [提取成功 - Universal Data] 视频点赞数精准命中`);
          }
        }
      } catch (e) {
        console.warn(`[Universal Data 解析微调]: ${e.message}`);
      }
    }

    // 3. 兜底正则匹配：直接从 HTML 中搜索 diggCount / followerCount
    if (isProfile && followerCount === null) {
      const match = html.match(/"followerCount"\s*:\s*(\d+)/i);
      if (match && match[1]) {
        followerCount = parseInt(match[1], 10);
        console.log(`✨ [提取成功 - JSON 正则兜底] 粉丝数: ${followerCount}`);
      }
    }
    if (isVideo && likesCount === null) {
      const match = html.match(/"diggCount"\s*:\s*(\d+)/i);
      if (match && match[1]) {
        likesCount = parseInt(match[1], 10);
        console.log(`✨ [提取成功 - JSON 正则兜底] 点赞数: ${likesCount}`);
      }
    }

    // 4. 降级兜底方案：从 OpenGraph / Meta 描述标签提取
    if ((isProfile && followerCount === null) || (isVideo && likesCount === null)) {
      console.log(`ℹ️ 启动方案 4 (Meta 标签兜底匹配)...`);
      const metaMatch =
        html.match(/<meta\s+(?:name|property)="og:description"\s+content="([^"]*)"/i) ||
        html.match(/<meta\s+(?:name|property)="description"\s+content="([^"]*)"/i);

      if (metaMatch && metaMatch[1]) {
        const desc = metaMatch[1];
        if (isProfile) {
          const fansMatch =
            desc.match(/([\d\.,KMBkmb万亿]+)\s*(?:Fans|Followers|粉丝|팔로워)/i) ||
            desc.match(/([0-9\.,]+[KMBkmb万亿]?)\s*(?:Fans|Followers)/i);
          if (fansMatch && fansMatch[1]) {
            followerCount = parseCompactNumber(fansMatch[1]);
          }
          const nameMatch = desc.match(/^(.*?)\s*\(@/);
          if (nameMatch && nameMatch[1] && !titleOrAccount) {
            titleOrAccount = nameMatch[1].trim();
          }
        } else {
          const likesMatch =
            desc.match(/([\d\.,KMBkmb万亿]+)\s*(?:Likes|个赞|赞|좋아요)/i) ||
            desc.match(/^([\d\.,KMBkmb万亿]+)\s*Likes/i);
          if (likesMatch && likesMatch[1]) {
            likesCount = parseCompactNumber(likesMatch[1]);
          }
        }
      }
    }

    // 补全标识
    if (!identifier) {
      const handle = finalUrl.split("@")[1]?.split("/")[0]?.split("?")[0] || "";
      if (handle) identifier = `@${handle}`;
    }
    if (!titleOrAccount) {
      titleOrAccount = isProfile ? `${identifier} TikTok 主页` : `TikTok 视频 (${identifier})`;
    }

    console.log(`\n----------------- 📊 解析结果 -----------------`);
    console.log(`平台: TikTok`);
    console.log(`类型: ${isProfile ? "账号主页 (Profile)" : "具体视频 (Video)"}`);
    console.log(`账号标识: ${identifier}`);
    console.log(`创作者昵称 / 标题: ${titleOrAccount}`);
    if (isProfile) {
      console.log(`主页粉丝数: ${followerCount !== null ? `${followerCount.toLocaleString()} (约 ${(followerCount / 10000).toFixed(1)} 万)` : "❌ 未提取到"}`);
    } else {
      console.log(`视频点赞数: ${likesCount !== null ? `${likesCount.toLocaleString()} (约 ${(likesCount / 10000).toFixed(1)} 万)` : "❌ 未提取到"}`);
    }
    console.log(`------------------------------------------------\n`);
  } catch (err) {
    console.error(`💥 请求或解析出现错误:`, err);
  }
}

async function runTests() {
  const url = "https://www.tiktok.com/@fundaykorea";
  await fetchTikTok(url);
}

runTests();
