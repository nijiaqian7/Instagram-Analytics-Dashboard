/**
 * Cloudflare Worker: Instagram Profile Follower Proxy
 * 
 * This worker fetches imginn.com from Cloudflare's own network,
 * bypassing the AWS datacenter IP block that Imginn enforces.
 * 
 * Usage: GET /?u=adidaskr
 * Returns: { "username": "adidaskr", "followerCount": 99000, "success": true }
 */

const BOT_UA = "Twitterbot/1.0";

function parseCompactNumber(str) {
  if (!str) return 0;
  const clean = str.toString().trim().replace(/,/g, "");
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  const lower = clean.toLowerCase();
  if (lower.endsWith("k")) return Math.round(num * 1000);
  if (lower.endsWith("m")) return Math.round(num * 1000000);
  if (lower.endsWith("b")) return Math.round(num * 1000000000);
  return Math.round(num);
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const username = url.searchParams.get("u");

    // CORS headers - allow all origins
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    };

    if (!username) {
      return new Response(JSON.stringify({ error: "Missing ?u= parameter" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const cleanUsername = username.replace("@", "").trim();

    try {
      const res = await fetch(`https://imginn.com/${cleanUsername}/`, {
        headers: {
          "User-Agent": BOT_UA,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
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

      // Check if we got Cloudflare challenge page
      if (html.includes("Just a moment") || html.includes("challenges.cloudflare.com")) {
        return new Response(JSON.stringify({
          username: cleanUsername,
          success: false,
          error: "Cloudflare challenge",
        }), { status: 200, headers: corsHeaders });
      }

      // Extract follower count
      const followerMatch =
        html.match(/([\d\.,KMBkmb]+)\s*Followers/i) ||
        html.match(/([\d\.,KMBkmb]+)\s*팔로워/i) ||
        html.match(/([\d\.,KMBkmb]+)\s*关注者/i);

      // Extract display name
      const nameMatch =
        html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
        html.match(/class="name"[\s\S]*?<h2>([\s\S]*?)<\/h2>/i);

      const followerRaw = followerMatch ? followerMatch[1] : null;
      const followerCount = followerRaw !== null ? parseCompactNumber(followerRaw) : null;
      const displayName = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, "").trim() : null;

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
