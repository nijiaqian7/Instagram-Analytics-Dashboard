import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const results: Record<string, any> = {};
  
  const handle = "adidaskr";
  
  const uaTests = [
    { name: "Twitterbot", ua: "Twitterbot/1.0" },
    { name: "LinkedInBot", ua: "LinkedInBot/1.0 (compatible; Mozilla/5.0; Jakarta Commons-HttpClient/3.1 +http://www.linkedin.com)" },
    { name: "Googlebot", ua: "Googlebot/2.1 (+http://www.google.com/bot.html)" },
    { name: "Bingbot", ua: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)" },
    { name: "Slackbot", ua: "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)" },
  ];

  for (const { name, ua } of uaTests) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`https://imginn.com/${handle}/`, {
        headers: {
          "User-Agent": ua,
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      const html = await res.text();
      const hasChallenge = html.includes("Just a moment") || html.includes("challenges.cloudflare.com");
      const followerMatch = html.match(/([\d\.,KMBkmb]+)\s*Followers/i);
      
      results[name] = {
        status: res.status,
        len: html.length,
        cloudflareBlocked: hasChallenge,
        followers: followerMatch ? followerMatch[1] : null,
        snippet: html.substring(0, 200),
      };
    } catch(e: any) {
      results[name] = { error: e.message || "timeout" };
    }
  }

  return NextResponse.json({
    testedHandle: handle,
    results,
    serverRegion: process.env.VERCEL_REGION || "unknown",
  });
}
