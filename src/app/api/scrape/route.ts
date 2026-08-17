import { NextRequest, NextResponse } from "next/server";

function parseCompactNumber(str: string | number): number {
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

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "请提供有效的链接" }, { status: 400 });
    }

    const rawUrl = url.replace(/["'“”‘’`]/g, "").trim();

    // 平台识别
    const isInstagram = rawUrl.includes("instagram.com") || rawUrl.includes("instagr.am");
    const isTikTok = rawUrl.includes("tiktok.com") || rawUrl.includes("vt.tiktok.com");

    if (!isInstagram && !isTikTok) {
      return NextResponse.json({
        success: false,
        isInvalidPlatform: true,
        url: rawUrl,
        error: "非 Instagram 或 TikTok 链接",
      });
    }

    // 清理 URL 参数
    const cleanUrl = rawUrl.split("?")[0].split("#")[0].replace(/\/+$/, "");

    // =========================================================================
    // 🎵 平台 1: TikTok 抓取引擎
    // =========================================================================
    if (isTikTok) {
      const headers = {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ko;q=0.8,zh-CN;q=0.7",
      };

      let followerCount: number | null = null;
      let likesCount: number | null = null;
      let titleOrAccount = "";
      let identifier = "";
      let isProfile = !cleanUrl.includes("/video/");

      try {
        const res = await fetch(rawUrl, {
          headers,
          redirect: "follow",
          cache: "no-store",
        });

        if (res.ok) {
          const html = await res.text();
          const finalUrl = res.url || rawUrl;
          const isVideo = cleanUrl.includes("/video/") || finalUrl.includes("/video/");
          isProfile = !isVideo;

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
                }
              } catch {
                // ignore
              }
            }
          }

          // 2. 尝试从 <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"> 提取
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
                }
              } else if (isVideo && likesCount === null) {
                const videoDetail = defaultScope?.["webapp.video-detail"]?.itemInfo?.itemStruct;
                if (videoDetail) {
                  identifier = `@${videoDetail.author?.uniqueId || ""}`;
                  titleOrAccount = videoDetail.desc || `${identifier} (TikTok Video)`;
                  likesCount = videoDetail.stats?.diggCount ?? null;
                }
              }
            } catch {
              // ignore
            }
          }

          // 3. 兜底正则匹配 JSON 字段
          if (isProfile && followerCount === null) {
            const match = html.match(/"followerCount"\s*:\s*(\d+)/i);
            if (match && match[1]) followerCount = parseInt(match[1], 10);
          }
          if (isVideo && likesCount === null) {
            const match = html.match(/"diggCount"\s*:\s*(\d+)/i);
            if (match && match[1]) likesCount = parseInt(match[1], 10);
          }

          // 4. OpenGraph Meta 标签降级兜底
          if ((isProfile && followerCount === null) || (isVideo && likesCount === null)) {
            const metaMatch =
              html.match(/<meta\s+(?:name|property)="og:description"\s+content="([^"]*)"/i) ||
              html.match(/<meta\s+(?:name|property)="description"\s+content="([^"]*)"/i);

            if (metaMatch && metaMatch[1]) {
              const desc = metaMatch[1];
              if (isProfile) {
                const fansMatch =
                  desc.match(/([\d\.,KMBkmb万亿]+)\s*(?:Fans|Followers|粉丝|팔로워)/i) ||
                  desc.match(/([0-9\.,]+[KMBkmb万亿]?)\s*(?:Fans|Followers)/i);
                if (fansMatch && fansMatch[1]) followerCount = parseCompactNumber(fansMatch[1]);
                const nameMatch = desc.match(/^(.*?)\s*\(@/);
                if (nameMatch && nameMatch[1] && !titleOrAccount) titleOrAccount = nameMatch[1].trim();
              } else {
                const likesMatch =
                  desc.match(/([\d\.,KMBkmb万亿]+)\s*(?:Likes|个赞|赞|좋아요)/i) ||
                  desc.match(/^([\d\.,KMBkmb万亿]+)\s*Likes/i);
                if (likesMatch && likesMatch[1]) likesCount = parseCompactNumber(likesMatch[1]);
              }
            }
          }

          // 兜底账号标识与标题
          if (!identifier) {
            const handle = (finalUrl || cleanUrl).split("@")[1]?.split("/")[0]?.split("?")[0] || "";
            if (handle) identifier = `@${handle}`;
          }
          if (!titleOrAccount) {
            titleOrAccount = isProfile ? `${identifier} (TikTok)` : `TikTok Video (${identifier})`;
          }
        }
      } catch (err: any) {
        console.error("TikTok scrape error:", err);
      }

      if (isProfile) likesCount = null;
      else followerCount = null;

      const hasRealData = (isProfile && followerCount !== null) || (!isProfile && likesCount !== null);

      return NextResponse.json({
        success: true,
        platform: "tiktok",
        hasRealData,
        url: rawUrl,
        type: isProfile ? "profile" : "post",
        identifier: identifier || "@tiktok_user",
        titleOrAccount: titleOrAccount || (isProfile ? `${identifier || "@user"} (TikTok)` : "TikTok Video"),
        likesCount,
        followerCount,
        fetchedAt: new Date().toLocaleTimeString(),
      });
    }

    // =========================================================================
    // 📸 平台 2: Instagram 抓取引擎 (保持原有成熟逻辑)
    // =========================================================================
    const isPostOrReel =
      cleanUrl.includes("/p/") ||
      cleanUrl.includes("/reel/") ||
      cleanUrl.includes("/reels/") ||
      cleanUrl.includes("/tv/");
    const isProfile = !isPostOrReel;

    let likesCount: number | null = null;
    let followerCount: number | null = null;
    let titleOrAccount = "";
    let identifier = "";

    // ----------------------------------------------------
    // STRATEGY A: Profile Scraping (Direct Instagram fetch)
    // ----------------------------------------------------
    if (isProfile) {
      const username = cleanUrl.split("instagram.com/").pop()?.split("/")[0]?.replace("@", "").trim() || "";
      identifier = `@${username}`;

      if (username) {
        try {
          const directRes = await fetch(`https://www.instagram.com/${username}/`, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
            },
            cache: "no-store",
          });

          if (directRes.ok) {
            const html = await directRes.text();
            // 1. 最高优先级：优先从页面内嵌的 JSON 状态中提取实时精准粉丝数 (避开 CDN 缓存延迟)
            const realTimeFollowerMatch =
              html.match(/"follower_count"\s*:\s*(\d+)/i) ||
              html.match(/"edge_followed_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)\s*\}/i);

            if (realTimeFollowerMatch && realTimeFollowerMatch[1]) {
              followerCount = parseInt(realTimeFollowerMatch[1], 10);
            }

            // 尝试提取真实全名/昵称
            const fullNameMatch = html.match(/"full_name"\s*:\s*"([^"]+)"/i);
            if (fullNameMatch && fullNameMatch[1] && !titleOrAccount) {
              try {
                titleOrAccount = JSON.parse(`"${fullNameMatch[1]}"`);
              } catch {
                titleOrAccount = fullNameMatch[1];
              }
            }

            // 2. 降级兜底：从 OpenGraph Meta 标签中提取
            const metaMatch =
              html.match(/<meta\s+(?:name|property)="og:description"\s+content="([^"]*)"/i) ||
              html.match(/<meta\s+(?:name|property)="description"\s+content="([^"]*)"/i);

            if (metaMatch && metaMatch[1]) {
              const desc = metaMatch[1];
              const isLoginWall =
                desc.toLowerCase().includes("create an account or log in") ||
                desc.toLowerCase().includes("sign up");

              if (!isLoginWall) {
                // 若内部 JSON 未获取到，才使用 Meta 标签数据
                if (followerCount === null) {
                  const followerMatch =
                    desc.match(/(\d[\d\.,]*)\s*Followers/i) ||
                    desc.match(/(\d[\d\.,]*)\s*팔로워/i) ||
                    desc.match(/(\d[\d\.,]*)\s*关注者/i) ||
                    desc.match(/([\d\.]+[KMBkmb])\s*Followers/i);

                  if (followerMatch && followerMatch[1]) {
                    followerCount = parseCompactNumber(followerMatch[1]);
                  }
                }

                // Extract display name from og:description (format: "... from Name (@handle)")
                const nameMatch =
                  desc.match(/from\s+([^(&@\n]+?)\s*(?:\(|&#064;|@)/i) ||
                  desc.match(/(?:photos and videos from)\s+([^(&]+)/i);
                if (nameMatch && nameMatch[1] && !titleOrAccount) {
                  titleOrAccount = nameMatch[1].replace(/&#[^;]+;/g, "").trim();
                }
              }
            }
          }
        } catch (err: any) {
          console.error("Profile scrape error:", err);
        }
      }

      if (!titleOrAccount) titleOrAccount = `@${username} (Instagram)`;
      likesCount = null; // Profile MUST NOT have likes
    }

    // ----------------------------------------------------
    // STRATEGY B: Post/Reel Scraping (Direct Instagram fetch)
    // ----------------------------------------------------
    else {
      let shortcode = "post";
      if (cleanUrl.includes("/reel/")) shortcode = cleanUrl.split("/reel/")[1]?.split("/")[0] || "reel";
      else if (cleanUrl.includes("/reels/")) shortcode = cleanUrl.split("/reels/")[1]?.split("/")[0] || "reel";
      else if (cleanUrl.includes("/p/")) shortcode = cleanUrl.split("/p/")[1]?.split("/")[0] || "post";

      identifier = `ID: ${shortcode}`;

      try {
        const directRes = await fetch(`${cleanUrl}/`, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
          cache: "no-store",
        });

        if (directRes.ok) {
          const html = await directRes.text();

          // Check LD+JSON
          const ldJsonMatches = html.match(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
          if (ldJsonMatches) {
            for (const match of ldJsonMatches) {
              try {
                const jsonText = match.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "");
                const parsed = JSON.parse(jsonText);
                if (parsed) {
                  if (parsed.name) titleOrAccount = parsed.name;
                  
                  // Author extraction (Primary author for Collab posts)
                  if (parsed.author) {
                    const authorObj = Array.isArray(parsed.author) ? parsed.author[0] : parsed.author;
                    if (authorObj && (authorObj.alternateName || authorObj.name)) {
                      const rawAuthor = authorObj.alternateName || authorObj.name;
                      identifier = rawAuthor.startsWith("@") ? rawAuthor : `@${rawAuthor}`;
                    }
                  } else if (parsed.alternateName) {
                    identifier = parsed.alternateName;
                  }

                  const stats = parsed.interactionStatistic;
                  if (Array.isArray(stats)) {
                    for (const stat of stats) {
                      if (stat.interactionType?.includes("LikeAction") && stat.userInteractionCount) {
                        likesCount = parseCompactNumber(stat.userInteractionCount);
                      }
                    }
                  }
                }
              } catch {
                // ignore
              }
            }
          }

          // Check Regex
          if (likesCount === null) {
            const likesRegexMatch =
              html.match(/"edge_liked_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)\s*\}/i) ||
              html.match(/"edge_media_preview_like"\s*:\s*\{\s*"count"\s*:\s*(\d+)\s*\}/i) ||
              html.match(/"like_count"\s*:\s*(\d+)/i);
            if (likesRegexMatch && likesRegexMatch[1]) {
              likesCount = parseInt(likesRegexMatch[1], 10);
            }
          }

          // Meta desc regex
          if (likesCount === null) {
            const metaMatch =
              html.match(/<meta\s+(?:name|property)="og:description"\s+content="([^"]*)"/i) ||
              html.match(/<meta\s+(?:name|property)="description"\s+content="([^"]*)"/i);

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

              // Collab post Primary Author Extract
              const authorMatch =
                desc.match(/-\s*([a-zA-Z0-9_\.\s\&]+?)\s+on\s+/i) ||
                desc.match(/@([a-zA-Z0-9_\.]+)/i);

              if (authorMatch && authorMatch[1] && (identifier.includes("reel") || identifier.includes("post"))) {
                let primaryAuthor = authorMatch[1].trim();
                if (primaryAuthor.includes(" and ")) {
                  primaryAuthor = primaryAuthor.split(" and ")[0].trim();
                }
                identifier = primaryAuthor.startsWith("@") ? primaryAuthor : `@${primaryAuthor}`;
              }

              const cleanDesc = desc.replace(/^[\d\.,KMBkmb万亿]+\s*(?:likes|Followers|关注者|팔로워),?\s*[\d\.,KMBkmb万亿]*\s*(?:comments|Following|关注|팔로잉)?,?\s*[\d\.,KMBkmb万亿]*\s*(?:Posts|帖子|게시物)?\s*-\s*/i, "").trim();
              if (!titleOrAccount || titleOrAccount.includes("likes,")) {
                titleOrAccount = cleanDesc || desc;
              }
            }
          }
        }
      } catch (err: any) {
        console.error("Post scrape error:", err);
      }

      if (!titleOrAccount || titleOrAccount.toLowerCase().includes("log in")) titleOrAccount = `Instagram Post (${shortcode})`;
      followerCount = null; // Post MUST NOT have followers
    }

    const hasRealData = (isProfile && followerCount !== null) || (!isProfile && likesCount !== null);

    return NextResponse.json({
      success: true,
      platform: "instagram",
      hasRealData,
      url: rawUrl,
      type: isProfile ? "profile" : "post",
      identifier,
      titleOrAccount,
      likesCount,
      followerCount,
      fetchedAt: new Date().toLocaleTimeString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "抓取异常", success: false },
      { status: 500 }
    );
  }
}
