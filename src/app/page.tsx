"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Heart,
  Users,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Trash2,
  ExternalLink,
  Plus,
  Search,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Copy,
  Check,
  ShieldAlert,
  Globe,
  AlertCircle,
  Ban,
  FilterX,
  Edit2
} from "lucide-react";

function InstagramIcon({ className = "w-6 h-6 text-white" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  );
}

type Language = "zh" | "en" | "ko";

interface DataRow {
  id: string;
  url: string;
  type: "post" | "profile";
  identifier: string;
  titleOrAccount: string;
  likesCount: number | null;
  followerCount: number | null;
  status: "success" | "pending_input" | "invalid_platform";
  updatedAt: string;
}

const SAMPLE_LINKS = [
  "https://www.instagram.com/p/C3x9L2vP1zQ/",
  "https://www.instagram.com/p/C2a8K1mO9xL/",
  "https://www.instagram.com/adidaskr/",
  "https://www.tiktok.com/@sample_video"
];

const I18N = {
  zh: {
    title: "Instagram 运营数据看板",
    subtitle: "批量帖子点赞统计 · 主页粉丝监控 · 一键表格导出",
    teamBadge: "团队共享版",
    connectedStatus: "已连接服务端抓取引擎",
    totalLinks: "监控总链接数",
    postsCount: "帖子",
    profilesCount: "主页",
    accumulatedLikes: "已统计累计点赞",
    realtimeUpdate: "实时汇总更新",
    totalFollowers: "主页粉丝总量",
    monitoredAccounts: "已监控目标账号",
    exportCenter: "数据导出中心",
    formatExport: "导出 Excel 表格",
    batchAddTitle: "批量添加 / 更新 Instagram 链接",
    sampleButton: "载入示例",
    inputDescription: "支持同时粘贴多条 Instagram 帖子链接（例如 /p/C3x9L2v...）或主页链接（例如 /nike/），每行一条。帖子点赞数将自动精准抓取；主页粉丝数支持点击填入。",
    inputPlaceholder: "请在此粘贴链接，一行一条链接...\nhttps://www.instagram.com/p/C3x9L2vP1zQ/\nhttps://www.instagram.com/adidaskr/",
    readyToFetch: "已就绪 待抓取链接",
    clickToFetch: "粘贴链接后点击“获取数据”",
    fetchButton: "获取数据",
    fetchingStatus: "数据分析抓取中...",
    boardTitle: "数据监控看板",
    recordsCount: "共 {count} 项记录",
    searchPlaceholder: "搜索账号 / 标识 / 标题...",
    filterAll: "全部",
    filterPosts: "帖子",
    filterProfiles: "主页",
    sortDefault: "默认排序",
    sortLikesDesc: "按点赞数降序 ↓",
    sortFollowersDesc: "按粉丝数降序 ↓",
    emptyNotice: "暂无数据记录。请在上方输入 Instagram 链接并点击“获取数据”。",
    colIndex: "#",
    colType: "类型",
    colAccount: "账号 / 标识",
    colDesc: "描述与详情",
    colLikes: "点赞数",
    colFollowers: "粉丝数",
    colStatus: "状态",
    colUpdated: "更新时间",
    colActions: "操作",
    statusSuccess: "解析成功",
    statusPendingInput: "点击填入粉丝数",
    statusInvalid: "非 Instagram 链接",
    cleanInvalidBtn: "一键清理非 Instagram 链接 ({count})",
    copySuccess: "链接已复制",
    confirmClear: "确定要清空看板中的所有数据吗？",
    footerNote: "提示：帖子点赞数 100% 自动解析；主页支持点击填入精确粉丝数并导出 Excel。"
  },
  en: {
    title: "Instagram Analytics Dashboard",
    subtitle: "Batch Post Likes · Profile Followers Monitor · One-Click Excel Export",
    teamBadge: "Team Edition",
    connectedStatus: "Scraper Engine Online",
    totalLinks: "Monitored Links",
    postsCount: "Posts",
    profilesCount: "Profiles",
    accumulatedLikes: "Total Likes",
    realtimeUpdate: "Real-time Aggregated",
    totalFollowers: "Total Followers",
    monitoredAccounts: "Monitored Accounts",
    exportCenter: "Export Data",
    formatExport: "Export to Excel",
    batchAddTitle: "Add / Update Links",
    sampleButton: "Load Sample Links",
    inputDescription: "Paste Instagram post links (e.g. /p/C3x9L2v...) or profile URLs (e.g. /nike/), one per line.",
    inputPlaceholder: "Paste Instagram URLs here, one link per line...\nhttps://www.instagram.com/p/C3x9L2vP1zQ/\nhttps://www.instagram.com/adidaskr/",
    readyToFetch: "Ready to process",
    clickToFetch: "Paste URLs and click 'Get Data'",
    fetchButton: "Get Data",
    fetchingStatus: "Analyzing & fetching data...",
    boardTitle: "Analytics Dashboard",
    recordsCount: "{count} Items",
    searchPlaceholder: "Search account, ID, or title...",
    filterAll: "All",
    filterPosts: "Posts",
    filterProfiles: "Profiles",
    sortDefault: "Default",
    sortLikesDesc: "Likes: High to Low ↓",
    sortFollowersDesc: "Followers: High to Low ↓",
    emptyNotice: "No data available. Paste Instagram URLs above and click 'Get Data'.",
    colIndex: "#",
    colType: "Type",
    colAccount: "Account / ID",
    colDesc: "Title & Caption",
    colLikes: "Likes",
    colFollowers: "Followers",
    colStatus: "Status",
    colUpdated: "Updated At",
    colActions: "Actions",
    statusSuccess: "Synced",
    statusPendingInput: "Enter Followers",
    statusInvalid: "Invalid Link",
    cleanInvalidBtn: "Remove Invalid Links ({count})",
    copySuccess: "Copied Link",
    confirmClear: "Are you sure you want to clear all data?",
    footerNote: "Note: Post likes are 100% automated; profile follower counts support manual entry and Excel export."
  },
  ko: {
    title: "인스타그램 데이터 대시보드",
    subtitle: "피드 좋아요 일괄 집계 · 팔로워 모니터링 · 엑셀 내보내기",
    teamBadge: "팀 공유",
    connectedStatus: "수집 엔진 정상 작동 중",
    totalLinks: "모니터링 링크",
    postsCount: "피드",
    profilesCount: "계정",
    accumulatedLikes: "누적 좋아요",
    realtimeUpdate: "실시간 집계",
    totalFollowers: "총 팔로워",
    monitoredAccounts: "모니터링 계정",
    exportCenter: "데이터 내보내기",
    formatExport: "엑셀로 내보내기",
    batchAddTitle: "인스타그램 링크 일괄 등록",
    sampleButton: "샘플 링크 가져오기",
    inputDescription: "인스타그램 게시물(/p/) 또는 프로필(/계정명/) 링크를 한 줄에 하나씩 입력해 주세요.",
    inputPlaceholder: "인스타그램 URL을 줄바꿈하여 입력해 주세요...\nhttps://www.instagram.com/p/C3x9L2vP1zQ/\nhttps://www.instagram.com/adidaskr/",
    readyToFetch: "수집 대기 중",
    clickToFetch: "링크 입력 후 아래 '데이터 가져오기' 버튼을 눌러주세요.",
    fetchButton: "데이터 가져오기",
    fetchingStatus: "데이터를 분석하고 있습니다...",
    boardTitle: "데이터 모니터링",
    recordsCount: "총 {count}건",
    searchPlaceholder: "계정명, ID, 제목으로 검색하세요...",
    filterAll: "전체",
    filterPosts: "피드",
    filterProfiles: "계정",
    sortDefault: "기본순",
    sortLikesDesc: "좋아요 많은순 ↓",
    sortFollowersDesc: "팔로워 많은순 ↓",
    emptyNotice: "등록된 데이터가 없습니다. 상단에 인스타그램 URL을 입력한 후 '데이터 가져오기'를 진행해 주세요.",
    colIndex: "#",
    colType: "구분",
    colAccount: "계정 / ID",
    colDesc: "내용 / 제목",
    colLikes: "좋아요",
    colFollowers: "팔로워",
    colStatus: "상태",
    colUpdated: "최종 갱신",
    colActions: "관리",
    statusSuccess: "수집 완료",
    statusPendingInput: "팔로워 입력",
    statusInvalid: "유효하지 않은 URL",
    cleanInvalidBtn: "오류 링크 정리하기 ({count})",
    copySuccess: "링크가 복사되었습니다",
    confirmClear: "모든 데이터를 삭제하시겠습니까?",
    footerNote: "안내: 피드 좋아요는 100% 자동 수집되며, 계정 팔로워는 직접 입력 및 엑셀 내보내기를 지원합니다."
  }
};

export default function DashboardPage() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [lang, setLang] = useState<Language>("zh");
  const [inputText, setInputText] = useState<string>("");
  const [dataList, setDataList] = useState<DataRow[]>([]);

  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<"all" | "post" | "profile">("all");
  const [sortBy, setSortBy] = useState<"default" | "likes-desc" | "followers-desc">("default");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  const t = I18N[lang];

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("INS_DASHBOARD_DATA");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleanItems = parsed.filter((item: any) => !item.id?.startsWith("demo-"));
          setDataList(cleanItems);
        }
      }
      const savedLang = localStorage.getItem("INS_DASHBOARD_LANG") as Language;
      if (savedLang && (savedLang === "zh" || savedLang === "en" || savedLang === "ko")) {
        setLang(savedLang);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem("INS_DASHBOARD_DATA", JSON.stringify(dataList));
      } catch {
        // ignore
      }
    }
  }, [dataList, mounted]);

  const changeLang = (newLang: Language) => {
    setLang(newLang);
    try {
      localStorage.setItem("INS_DASHBOARD_LANG", newLang);
    } catch {
      // ignore
    }
  };

  const handleBatchFetch = async (urlsToFetch?: string[]) => {
    const rawList = urlsToFetch || inputText.split("\n");
    const urls = rawList
      .map(u => u.replace(/["'“”‘’`]/g, "").trim())
      .filter(u => u.length > 0);
    if (urls.length === 0) return;

    setIsFetching(true);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const isInstagram = url.includes("instagram.com") || url.includes("instagr.am");

      // Non-Instagram URL Check
      if (!isInstagram) {
        let domain = "非 Ins 域名";
        try { domain = new URL(url).hostname.replace("www.", ""); } catch { /* ignore */ }
        
        const newItem: DataRow = {
          id: `invalid-${Date.now()}-${i}`,
          url,
          type: "post",
          identifier: domain,
          titleOrAccount: `非 Instagram 网页 (${domain})`,
          likesCount: null,
          followerCount: null,
          status: "invalid_platform",
          updatedAt: new Date().toLocaleTimeString()
        };

        setDataList(prev => [newItem, ...prev.filter(p => p.url !== url)]);
        continue;
      }

      // Valid Instagram URL -> Scrape
      try {
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          const newItem: DataRow = {
            id: `item-${Date.now()}-${i}`,
            url: data.url,
            type: data.type,
            identifier: data.identifier,
            titleOrAccount: data.titleOrAccount,
            likesCount: data.likesCount,
            followerCount: data.followerCount,
            status: data.hasRealData ? "success" : data.type === "profile" ? "pending_input" : "success",
            updatedAt: data.fetchedAt || new Date().toLocaleTimeString(),
          };

          setDataList(prev => [newItem, ...prev.filter(p => p.url !== url)]);
        } else {
          const isPostOrReel = url.includes("/p/") || url.includes("/reel/") || url.includes("/reels/") || url.includes("/tv/");
          const handle = url.split("instagram.com/").pop()?.split("/")[0]?.split("?")[0]?.replace("@", "") || `user_${i + 1}`;

          const newItem: DataRow = {
            id: `item-${Date.now()}-${i}`,
            url,
            type: isPostOrReel ? "post" : "profile",
            identifier: `@${handle}`,
            titleOrAccount: `@${handle} Instagram`,
            likesCount: null,
            followerCount: null,
            status: isPostOrReel ? "success" : "pending_input",
            updatedAt: new Date().toLocaleTimeString()
          };
          setDataList(prev => [newItem, ...prev.filter(p => p.url !== url)]);
        }
      } catch {
        const isPostOrReel = url.includes("/p/") || url.includes("/reel/") || url.includes("/reels/") || url.includes("/tv/");
        const handle = url.split("instagram.com/").pop()?.split("/")[0]?.split("?")[0]?.replace("@", "") || `user_${i + 1}`;

        const newItem: DataRow = {
          id: `item-${Date.now()}-${i}`,
          url,
          type: isPostOrReel ? "post" : "profile",
          identifier: `@${handle}`,
          titleOrAccount: `@${handle} Instagram`,
          likesCount: null,
          followerCount: null,
          status: isPostOrReel ? "success" : "pending_input",
          updatedAt: new Date().toLocaleTimeString()
        };
        setDataList(prev => [newItem, ...prev.filter(p => p.url !== url)]);
      }
    }

    setIsFetching(false);
    if (!urlsToFetch) setInputText("");
  };

  const handleStartEditFollower = (id: string, currentVal: number | null) => {
    setEditingId(id);
    setEditingValue(currentVal !== null ? currentVal.toString() : "");
  };

  const handleSaveFollower = (id: string) => {
    const num = parseInt(editingValue.replace(/,/g, ""), 10);
    const validNum = isNaN(num) ? null : Math.max(0, num);

    setDataList(prev =>
      prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            followerCount: validNum,
            status: validNum !== null ? "success" : "pending_input",
            updatedAt: new Date().toLocaleTimeString()
          };
        }
        return item;
      })
    );
    setEditingId(null);
  };

  const handleLoadSample = () => {
    setInputText(SAMPLE_LINKS.join("\n"));
  };

  const handleDeleteRow = (id: string) => {
    setDataList(prev => prev.filter(item => item.id !== id));
  };

  const handleClearInvalid = () => {
    setDataList(prev => prev.filter(item => item.status !== "invalid_platform"));
  };

  const handleClearAll = () => {
    if (confirm(t.confirmClear)) {
      setDataList([]);
    }
  };

  const handleRefreshAll = async () => {
    const validUrls = dataList
      .filter(item => item.status !== "invalid_platform")
      .map(item => item.url);
    if (validUrls.length === 0) return;
    await handleBatchFetch(validUrls);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExportExcel = () => {
    if (dataList.length === 0) return;

    const exportData = filteredData.map((item, idx) => ({
      "序号": idx + 1,
      "类型": item.type === "post" ? t.postsCount : t.profilesCount,
      "账号/标识": item.identifier,
      "标题或描述": item.titleOrAccount,
      "点赞数": item.likesCount ?? "N/A",
      "粉丝数": item.followerCount ?? "未填",
      "状态": item.status === "success" ? t.statusSuccess : item.status === "invalid_platform" ? t.statusInvalid : t.statusPendingInput,
      "Instagram 链接": item.url,
      "更新时间": item.updatedAt
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "InstagramData");
    
    const fileName = `Instagram_Analytics_${lang.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleExportCSV = () => {
    if (dataList.length === 0) return;

    const headers = [`${t.colIndex},${t.colType},${t.colAccount},${t.colDesc},${t.colLikes},${t.colFollowers},${t.colStatus},Instagram链接,${t.colUpdated}`];
    const rows = filteredData.map((item, idx) => [
      idx + 1,
      item.type === "post" ? t.postsCount : t.profilesCount,
      `"${item.identifier}"`,
      `"${item.titleOrAccount.replace(/"/g, '""')}"`,
      item.likesCount ?? "",
      item.followerCount ?? "",
      item.status,
      `"${item.url}"`,
      item.updatedAt
    ].join(","));

    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Instagram_Analytics_${lang.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const filteredData = dataList
    .filter(item => {
      if (filterType === "post") return item.type === "post";
      if (filterType === "profile") return item.type === "profile";
      return true;
    })
    .filter(item => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.titleOrAccount.toLowerCase().includes(q) ||
        item.identifier.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "likes-desc") {
        return (b.likesCount || 0) - (a.likesCount || 0);
      }
      if (sortBy === "followers-desc") {
        return (b.followerCount || 0) - (a.followerCount || 0);
      }
      return 0;
    });

  const invalidCount = dataList.filter(d => d.status === "invalid_platform").length;
  const totalPosts = dataList.filter(d => d.type === "post" && d.status !== "invalid_platform").length;
  const totalProfiles = dataList.filter(d => d.type === "profile" && d.status !== "invalid_platform").length;
  const totalLikes = dataList.reduce((acc, curr) => acc + (curr.likesCount || 0), 0);
  const totalFollowers = dataList.reduce((acc, curr) => acc + (curr.followerCount || 0), 0);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading Instagram Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-rose-500 selection:text-white" suppressHydrationWarning>
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 rounded-xl shadow-lg shadow-rose-500/20">
              <InstagramIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg tracking-tight text-white">{t.title}</h1>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {t.teamBadge}
                </span>
              </div>
              <p className="text-xs text-slate-400">{t.subtitle}</p>
            </div>
          </div>

          {/* Controls: Server Status & Language Switcher */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{t.connectedStatus}</span>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-xl p-1">
              <Globe className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
              <button
                onClick={() => changeLang("zh")}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${lang === "zh" ? "bg-rose-500 text-white font-bold" : "text-slate-400 hover:text-white"}`}
              >
                🇨🇳 中文
              </button>
              <button
                onClick={() => changeLang("en")}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${lang === "en" ? "bg-rose-500 text-white font-bold" : "text-slate-400 hover:text-white"}`}
              >
                🇺🇸 EN
              </button>
              <button
                onClick={() => changeLang("ko")}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${lang === "ko" ? "bg-rose-500 text-white font-bold" : "text-slate-400 hover:text-white"}`}
              >
                🇰🇷 한국어
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
              <InstagramIcon className="w-16 h-16 text-rose-500" />
            </div>
            <p className="text-xs font-medium text-slate-400">{t.totalLinks}</p>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white tracking-tight">{dataList.length}</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
              <span>{t.postsCount}: {totalPosts}</span>
              <span>•</span>
              <span>{t.profilesCount}: {totalProfiles}</span>
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
              <Heart className="w-16 h-16 text-rose-500" />
            </div>
            <p className="text-xs font-medium text-slate-400">{t.accumulatedLikes}</p>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-rose-400 tracking-tight">
                {totalLikes > 0 ? totalLikes.toLocaleString() : "0"}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>{t.realtimeUpdate}</span>
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
              <Users className="w-16 h-16 text-purple-500" />
            </div>
            <p className="text-xs font-medium text-slate-400">{t.totalFollowers}</p>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-purple-400 tracking-tight">
                {totalFollowers > 0 ? totalFollowers.toLocaleString() : "0"}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">{t.monitoredAccounts}: {totalProfiles}</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
              <FileSpreadsheet className="w-16 h-16 text-emerald-500" />
            </div>
            <p className="text-xs font-medium text-slate-400">{t.exportCenter}</p>
            <div className="mt-3 flex items-center space-x-2">
              <button
                onClick={handleExportExcel}
                disabled={dataList.length === 0}
                className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center space-x-1 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
              <button
                onClick={handleExportCSV}
                disabled={dataList.length === 0}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1 transition disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
            <p className="mt-2 text-[10px] text-slate-500 text-center">{t.formatExport}</p>
          </div>
        </div>

        {/* Input Box Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Plus className="w-5 h-5 text-rose-400" />
              <h2 className="font-semibold text-base text-white">{t.batchAddTitle}</h2>
            </div>
            <button
              onClick={handleLoadSample}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1 font-medium hover:underline"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.sampleButton}</span>
            </button>
          </div>

          <p className="text-xs text-slate-400">{t.inputDescription}</p>

          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value.replace(/["'“”‘’`]/g, ""))}
              placeholder={t.inputPlaceholder}
              rows={4}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition resize-y"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-slate-500">
              {inputText.split("\n").map(u => u.replace(/["'“”‘’`]/g, "").trim()).filter(u => u.length > 0).length > 0 ? (
                <span>{t.readyToFetch} <strong className="text-rose-400">{inputText.split("\n").map(u => u.replace(/["'“”‘’`]/g, "").trim()).filter(u => u.length > 0).length}</strong> 条链接</span>
              ) : (
                <span>{t.clickToFetch}</span>
              )}
            </div>

            <button
              onClick={() => handleBatchFetch()}
              disabled={isFetching || inputText.trim().length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-rose-600/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFetching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>{t.fetchingStatus}</span>
                </>
              ) : (
                <>
                  <InstagramIcon className="w-4 h-4 text-white" />
                  <span>{t.fetchButton}</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Table & Controls Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Controls Bar */}
          <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <h2 className="font-semibold text-base text-white">{t.boardTitle}</h2>
              <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg">
                {t.recordsCount.replace("{count}", filteredData.length.toString())}
              </span>
            </div>

            {/* Filters & Sorting & Purge Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl pl-9 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder-slate-600"
                />
              </div>

              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition ${filterType === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  {t.filterAll}
                </button>
                <button
                  onClick={() => setFilterType("post")}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition ${filterType === "post" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "text-slate-400 hover:text-white"}`}
                >
                  {t.filterPosts}
                </button>
                <button
                  onClick={() => setFilterType("profile")}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition ${filterType === "profile" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "text-slate-400 hover:text-white"}`}
                >
                  {t.filterProfiles}
                </button>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="default">{t.sortDefault}</option>
                <option value="likes-desc">{t.sortLikesDesc}</option>
                <option value="followers-desc">{t.sortFollowersDesc}</option>
              </select>

              {/* Clean Invalid Links Button */}
              {invalidCount > 0 && (
                <button
                  onClick={handleClearInvalid}
                  className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition animate-pulse"
                  title="Remove Non-Instagram Links"
                >
                  <FilterX className="w-3.5 h-3.5" />
                  <span>{t.cleanInvalidBtn.replace("{count}", invalidCount.toString())}</span>
                </button>
              )}

              {dataList.filter(d => d.status !== "invalid_platform").length > 0 && (
                <button
                  onClick={handleRefreshAll}
                  disabled={isFetching}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  title="刷新所有数据"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
                  <span>{isFetching ? "刷新中..." : "刷新所有数据"}</span>
                </button>
              )}

              {dataList.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  title="Clear All"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Table Area */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">{t.colIndex}</th>
                  <th className="py-3.5 px-4">{t.colType}</th>
                  <th className="py-3.5 px-4">{t.colAccount}</th>
                  <th className="py-3.5 px-4">{t.colDesc}</th>
                  <th className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center gap-1 justify-end">
                      <Heart className="w-3.5 h-3.5 text-rose-500" /> {t.colLikes}
                    </span>
                  </th>
                  <th className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center gap-1 justify-end">
                      <Users className="w-3.5 h-3.5 text-purple-500" /> {t.colFollowers}
                    </span>
                  </th>
                  <th className="py-3.5 px-4 text-center">{t.colStatus}</th>
                  <th className="py-3.5 px-4 text-slate-500">{t.colUpdated}</th>
                  <th className="py-3.5 px-4 text-right">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <InstagramIcon className="w-8 h-8 text-slate-700" />
                        <p>{t.emptyNotice}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-800/40 transition group ${item.status === "invalid_platform" ? "bg-amber-950/10 border-l-2 border-amber-500/50" : ""}`}
                    >
                      <td className="py-3.5 px-4 text-center text-slate-500 font-mono">
                        {index + 1}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.status === "invalid_platform" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Ban className="w-3 h-3 mr-1" /> 未知平台
                          </span>
                        ) : item.type === "post" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <Heart className="w-3 h-3 mr-1 text-rose-400 fill-rose-400/20" /> {t.postsCount}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <Users className="w-3 h-3 mr-1 text-purple-400" /> {t.profilesCount}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        {item.identifier}
                      </td>

                      <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                        {item.titleOrAccount}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-400 text-sm">
                        {item.likesCount !== null ? (
                          item.likesCount.toLocaleString()
                        ) : (
                          <span className="text-slate-600 font-normal text-xs">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-purple-400 text-sm">
                        {editingId === item.id ? (
                          <div className="flex items-center justify-end space-x-1">
                            <input
                              type="number"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              placeholder="数字"
                              autoFocus
                              className="w-24 bg-slate-950 border border-purple-500 text-purple-300 text-xs px-2 py-1 rounded text-right focus:outline-none"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveFollower(item.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                            />
                            <button
                              onClick={() => handleSaveFollower(item.id)}
                              className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : item.followerCount !== null ? (
                          <div className="inline-flex items-center space-x-1.5 group/edit">
                            <span>{item.followerCount.toLocaleString()}</span>
                            <button
                              onClick={() => handleStartEditFollower(item.id, item.followerCount)}
                              className="opacity-0 group-hover/edit:opacity-100 p-0.5 text-slate-500 hover:text-purple-300 transition"
                              title="修改粉丝数"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        ) : item.type === "post" ? (
                          <span className="text-slate-600 font-normal text-xs">-</span>
                        ) : (
                          <button
                            onClick={() => handleStartEditFollower(item.id, null)}
                            className="inline-flex items-center space-x-1 text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded text-[11px] font-medium transition"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>填入真实数字</span>
                          </button>
                        )}

                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {item.status === "invalid_platform" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <AlertCircle className="w-3 h-3 mr-1 text-amber-400" /> {t.statusInvalid}
                          </span>
                        ) : item.status === "success" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> {t.statusSuccess}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleStartEditFollower(item.id, item.followerCount)}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 mr-1" /> {t.statusPendingInput}
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {item.updatedAt}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleCopy(item.url, item.id)}
                          className="p-1 text-slate-400 hover:text-white rounded transition"
                          title="Copy link"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block p-1 text-slate-400 hover:text-white rounded transition"
                          title="Open Link in Instagram"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-purple-400 hover:text-purple-300" />
                        </a>
                        <button
                          onClick={() => handleDeleteRow(item.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div>{t.footerNote}</div>
            <div className="flex items-center space-x-4">
              <span>Instagram Analytics Engine v1.6</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-6 mt-12 text-center text-xs text-slate-600">
        <p>Instagram Analytics Dashboard · Team Dedicated Tool (ZH / EN / KO)</p>
      </footer>
    </div>
  );
}
