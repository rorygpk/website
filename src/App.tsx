import { useState } from 'react';
import { Shield, Globe, Lock, Terminal, Search, Plus, ChevronLeft, ChevronRight, Share, Key, Home, Copy, Check } from 'lucide-react';

const dict = {
  zh: {
    heroTitle: "量子安全代理中转站",
    heroDesc: "完全内嵌的高速隐私代理架构。不再依赖 Cloudflare Worker，直接在此平台上提供绝对隐私保护与深度 API 分流。",
    feature1Title: "API 直连透传",
    feature1Desc: "您的 API Key 只需保存在本地客户端中。本站及 Worker 仅负责纯粹的链路加速与路由转发，绝不保存或劫持您的任何密钥。",
    feature2Title: "无痕中转隧道",
    feature2Desc: "目标网站与 API 厂商只能看到来自云端服务器的请求。强制剥离所有追踪请求头，100% 隐藏您的真实 IP。",
    feature3Title: "极速节点直连",
    feature3Desc: "自动将出站请求路由至完全支持大模型的高速海外服务器区域，享受原生般的流畅体验。",
    toolTitle: "主流 API 客户端配置指南 (Chatbox, NextChat 等)",
    toolDesc: "无需翻墙，直接在主流客户端中填入以下 Base URL，并在 API Key 处填入您的真实密钥，即可高速调用各家大模型：",
    apiProvider: "服务商",
    apiEndpoint: "接口地址 (Base URL)",
    webProxyDesc: "直接在上方地址栏输入网站 (如 google.com) 或搜索内容，即可在站内高速代理显示并进行完整操作，支持流媒体、多网页与文件下载。",
    alertTarget: "请输入您的目标网址或搜索内容",
    langToggle: "English",
    dnsTitle: "阿里云/腾讯云域名绑定 Cloudflare Worker 教程",
    dnsDesc: "为了在 Cloudflare Worker 上绑定国内注册商（如阿里云、腾讯云）的域名，您必须将域名的 DNS 服务器（NS记录）迁移到 Cloudflare：",
    dnsStep1: "注册并登录 Cloudflare (cloudflare.com)，点击「Add a site」添加您的域名。",
    dnsStep2: "选择 Free 免费计划。Cloudflare 会分配两个 NS (Name Server) 地址 (例如: ali.ns.cloudflare.com)。",
    dnsStep3: "登录您的阿里云/腾讯云控制台，找到该域名的「DNS修改」或「修改DNS服务器」选项。",
    dnsStep4: "将默认的国内 DNS 替换为 Cloudflare 提供的两个 NS 地址。等待生效（通常需要几十分钟）。",
    dnsStep5: "生效后，在 Cloudflare 的 Workers & Pages -> 您的 Worker -> Settings -> Triggers -> Custom Domains 中添加您的域名即可！",
    workerDeployTitle: "Cloudflare Worker 一键无痕代理代码",
    workerDeployDesc: "复制以下代码并部署到 Cloudflare Worker，实现域名下的全能无痕代理（高速网页访问 + API 透明加速转发）。",
  },
  en: {
    heroTitle: "Quantum Secure Proxy",
    heroDesc: "Fully embedded high-speed privacy proxy. Cloudflare Worker is no longer needed. Enjoy absolute privacy and deep API routing right from this platform.",
    feature1Title: "Transparent API Passthrough",
    feature1Desc: "Your API Keys stay safe in your local client. Our server and Worker only act as a high-speed routing tunnel and never store or intercept your keys.",
    feature2Title: "Untraceable Tunnel",
    feature2Desc: "Target APIs only see our cloud server's IP. All tracking headers are stripped, and your real IP is 100% hidden.",
    feature3Title: "Direct High-Speed Nodes",
    feature3Desc: "Automatically routes egress traffic through regions fully supported by AI APIs for a native-like smooth experience.",
    toolTitle: "API Client Configuration Guide (Chatbox, NextChat)",
    toolDesc: "Configure your AI clients with the following Base URLs and use your REAL API Keys. Your traffic will be securely proxied:",
    apiProvider: "Provider",
    apiEndpoint: "Base URL",
    webProxyDesc: "Enter a website (e.g. google.com) or search query in the address bar above to browse directly within this app at high speeds, supporting downloads and multiple pages.",
    alertTarget: "Please enter a target URL or search query",
    langToggle: "中文",
    dnsTitle: "Custom Domain Binding for Cloudflare Worker",
    dnsDesc: "To bind a domain registered in China (e.g. Aliyun) to a Cloudflare Worker, you MUST migrate the domain's Name Servers (NS) to Cloudflare:",
    dnsStep1: "Log in to Cloudflare (cloudflare.com) and click 'Add a site' to add your domain.",
    dnsStep2: "Select the Free plan. Cloudflare will assign you two Name Servers (NS) (e.g., ali.ns.cloudflare.com).",
    dnsStep3: "Log in to your domain registrar (e.g. Aliyun) and find the 'DNS Modification' or 'Change Name Servers' option.",
    dnsStep4: "Replace the default Chinese NS with the Cloudflare NS. Wait for propagation.",
    dnsStep5: "Once active, go to Cloudflare Workers & Pages -> your Worker -> Settings -> Triggers -> Custom Domains and add your domain!",
    workerDeployTitle: "Cloudflare Worker Untraceable Proxy Code",
    workerDeployDesc: "Copy this code to your Cloudflare Worker for full untraceable proxying (Web browsing + Transparent API Acceleration).",
  }
};

export default function App() {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [targetUrl, setTargetUrl] = useState('');
  const [iframeUrl, setIframeUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const t = dict[lang];

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(workerCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const workerCode = `/**
 * Cloudflare Worker - Quantum Secure AI & Web Proxy
 * 
 * Includes full web proxying and transparent API acceleration.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // --- 1. Preflight & CORS ---
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        }
      });
    }

    // --- 2. API Routing ---
    let targetUrl = '';
    let isApi = false;
    let proxyHeaders = new Headers(request.headers);
    
    const apiRoutes = {
      '/openai': 'https://api.openai.com',
      '/gemini': 'https://generativelanguage.googleapis.com',
      '/anthropic': 'https://api.anthropic.com',
      '/xai': 'https://api.x.ai',
      '/deepseek': 'https://api.deepseek.com'
    };

    for (const [prefix, targetBase] of Object.entries(apiRoutes)) {
      if (url.pathname.startsWith(prefix)) {
        isApi = true;
        targetUrl = targetBase + url.pathname.replace(prefix, '') + url.search;
        break;
      }
    }

    // --- 3. Dynamic Full Web Proxy ---
    if (!isApi) {
      const pathStr = url.pathname.slice(1);
      
      const isUrlOrDomain = (str) => {
          if (str.startsWith('http://') || str.startsWith('https://')) return true;
          return /^([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}(\\/.*)?$/.test(str) && !str.includes(' ');
      };
      
      const getFullTarget = (str) => {
          if (str.startsWith('http://') || str.startsWith('https://')) return str;
          return 'https://' + str;
      };

      if (isUrlOrDomain(pathStr.split('?')[0])) {
        targetUrl = getFullTarget(pathStr) + url.search;
      } else {
        const referer = request.headers.get('Referer');
        if (referer) {
          try {
            const refUrl = new URL(referer);
            const refPath = refUrl.pathname.slice(1);
            if (isUrlOrDomain(refPath)) {
               const baseTarget = new URL(getFullTarget(refPath));
               targetUrl = new URL(url.pathname + url.search, baseTarget.origin).toString();
            }
          } catch(e) {}
        }
      }
    }

    if (!targetUrl) {
       const html = "<!DOCTYPE html>\\n" +
"<html lang=\\"zh\\">\\n" +
"<head>\\n" +
"<meta charset=\\"UTF-8\\">\\n" +
"<meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1.0\\">\\n" +
"<title>Quantum Secure Proxy</title>\\n" +
"<script src=\\"https://cdn.tailwindcss.com\\"></script>\\n" +
"</head>\\n" +
"<body class=\\"bg-[#f0f2f5] text-gray-900 min-h-screen flex flex-col items-center p-0 m-0 font-sans\\">\\n" +
"    <div class=\\"w-full h-screen bg-white flex flex-col overflow-hidden\\">\\n" +
"        <div class=\\"h-14 bg-white/80 backdrop-blur flex items-center px-4 border-b border-gray-200 shadow-sm flex-shrink-0\\">\\n" +
"            <div class=\\"flex space-x-2 w-1/4\\">\\n" +
"                <div class=\\"w-3 h-3 rounded-full bg-red-400\\"></div>\\n" +
"                <div class=\\"w-3 h-3 rounded-full bg-yellow-400\\"></div>\\n" +
"                <div class=\\"w-3 h-3 rounded-full bg-green-400\\"></div>\\n" +
"            </div>\\n" +
"            <div class=\\"flex-1 flex justify-center\\">\\n" +
"                <form id=\\"proxyForm\\" class=\\"w-full max-w-2xl relative\\" onsubmit=\\"event.preventDefault(); loadUrl();\\">\\n" +
"                    <input type=\\"text\\" id=\\"urlInput\\" class=\\"w-full bg-gray-100 text-gray-800 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-200 transition-all\\" placeholder=\\"输入网址 (如 google.com) 或搜索内容\\">\\n" +
"                </form>\\n" +
"            </div>\\n" +
"            <div class=\\"w-1/4 flex justify-end\\">\\n" +
"                <span class=\\"text-xs text-gray-400 font-medium tracking-wider\\">QUANTUM PROXY</span>\\n" +
"            </div>\\n" +
"        </div>\\n" +
"        <iframe id=\\"proxyFrame\\" class=\\"flex-1 w-full bg-white\\" src=\\"\\" frameborder=\\"0\\"></iframe>\\n" +
"    </div>\\n" +
"    <script>\\n" +
"        function loadUrl() {\\n" +
"            let val = document.getElementById('urlInput').value.trim();\\n" +
"            if (!val) return;\\n" +
"            if (!val.startsWith('http') && (!val.includes('.') || val.includes(' '))) {\\n" +
"                val = 'https://www.google.com/search?q=' + encodeURIComponent(val);\\n" +
"            } else if (!val.startsWith('http')) {\\n" +
"                val = 'https://' + val;\\n" +
"            }\\n" +
"            document.getElementById('proxyFrame').src = '/' + val;\\n" +
"        }\\n" +
"    </script>\\n" +
"</body>\\n" +
"</html>";
       return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // --- 4. Request Construction & Anonymization ---
    const targetUrlObj = new URL(targetUrl);
    proxyHeaders.set('Host', targetUrlObj.hostname);
    
    if (!isApi) {
       proxyHeaders.delete('Origin');
       proxyHeaders.delete('Referer');
       const cfHeaders = ['cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'x-forwarded-proto', 'x-forwarded-for', 'x-real-ip', 'true-client-ip'];
       cfHeaders.forEach(h => proxyHeaders.delete(h));
    } else {
       proxyHeaders.delete('x-forwarded-for');
       proxyHeaders.delete('cf-connecting-ip');
       proxyHeaders.delete('x-real-ip');
    }

    const requestInit = {
      method: request.method,
      headers: proxyHeaders,
      redirect: 'manual'
    };
    
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      requestInit.body = request.body;
    }

    try {
      const response = await fetch(targetUrl, requestInit);
      let responseHeaders = new Headers(response.headers);

      if (isApi) {
        responseHeaders.set('Access-Control-Allow-Origin', '*');
      } else {
        if ([301, 302, 303, 307, 308].includes(response.status)) {
            const location = responseHeaders.get('Location');
            if (location) {
                if (location.startsWith('http')) {
                    responseHeaders.set('Location', \`/\${location}\`);
                } else if (location.startsWith('/')) {
                    responseHeaders.set('Location', \`/\${targetUrlObj.hostname}\${location}\`);
                }
            }
        }
        responseHeaders.delete('X-Frame-Options');
        responseHeaders.delete('Content-Security-Policy');
        responseHeaders.delete('Content-Security-Policy-Report-Only');
        responseHeaders.delete('Clear-Site-Data');
      }

      // --- 5. Traffic Padding ---
      const padSize = Math.floor(Math.random() * 2048) + 512; 
      responseHeaders.set('X-Padding-Obfuscation', '0'.repeat(padSize));

      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders
      });
      
    } catch (error) {
      return new Response(\`Proxy Error: \${error.message}\`, { status: 500 });
    }
  }
};`;

  const handleBrowse = () => {
    let target = targetUrl.trim();
    if (!target) {
        alert(t.alertTarget);
        return;
    }
    
    // Auto Google Search if not a URL/Domain
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
        if (!target.includes('.') || target.includes(' ')) {
             target = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
        }
    }
    
    // Use the backend proxy
    if (target.startsWith('http://') || target.startsWith('https://')) {
       setIframeUrl(`/proxy/${target}`);
    } else {
       setIframeUrl(`/proxy/https://${target}`);
    }
  };

  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center flex flex-col items-center p-4 sm:p-8 font-sans">
      
      {/* Container */}
      <div className={`w-full max-w-6xl bg-white/70 backdrop-blur-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/40 ring-1 ring-black/5 mt-2 sm:mt-6 mb-8 transition-all duration-500 ease-in-out ${iframeUrl ? 'h-[85vh]' : 'min-h-[600px] h-auto'}`}>
        
        {/* Apple Safari Window Chrome & Address Bar */}
        <div className="h-[56px] bg-white/60 backdrop-blur-md flex items-center px-4 border-b border-black/10 flex-shrink-0">
          <div className="flex space-x-2 w-1/4 items-center">
            <div className="hidden sm:flex space-x-2 mr-4">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] shadow-sm"></div>
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] shadow-sm"></div>
              <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] shadow-sm"></div>
            </div>
            
            <div className="flex space-x-1 sm:space-x-2 text-gray-500">
               <button onClick={() => setIframeUrl('')} className="hover:text-black transition-colors p-1 rounded hover:bg-black/5" title="Home">
                 <Home className="w-4 h-4 sm:w-5 sm:h-5" />
               </button>
               <button className="hover:text-black transition-colors p-1 opacity-50 cursor-not-allowed hidden sm:block">
                 <ChevronLeft className="w-5 h-5" />
               </button>
               <button className="hover:text-black transition-colors p-1 opacity-30 cursor-not-allowed hidden sm:block">
                 <ChevronRight className="w-5 h-5" />
               </button>
            </div>
          </div>
          
          {/* Smart Address Bar */}
          <div className="flex-1 flex justify-center items-center">
            <div className="bg-white/90 shadow-sm border border-black/10 rounded-md px-3 py-1.5 flex items-center space-x-1 text-[13px] text-gray-700 w-full max-w-2xl transition-all focus-within:ring-2 focus-within:ring-blue-400/50">
              <Lock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mr-1" />
              <span className="text-gray-400 font-mono text-xs hidden sm:inline">https://</span>
              <input 
                type="text"
                placeholder={lang === 'zh' ? "输入 google.com 或搜索内容..." : "Search or enter google.com..."}
                value={targetUrl}
                onChange={e => setTargetUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBrowse()}
                className="bg-transparent outline-none flex-1 placeholder-gray-400 font-medium ml-1"
              />
              <button onClick={handleBrowse} className="text-blue-500 hover:text-blue-700 transition-colors ml-1 p-1 bg-blue-50 hover:bg-blue-100 rounded">
                 <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          <div className="w-1/4 flex justify-end space-x-3 items-center">
             <button 
                onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')} 
                className="text-xs font-medium text-gray-600 hover:text-gray-900 bg-black/5 px-2 py-1 rounded transition-colors"
             >
                {t.langToggle}
             </button>
             <Share className="hidden sm:block w-4 h-4 text-gray-500" />
             <Plus className="hidden sm:block w-4 h-4 text-gray-500" />
          </div>
        </div>

        {/* Main Content Area OR Iframe */}
        {iframeUrl ? (
          <iframe 
            src={iframeUrl}
            className="w-full flex-1 border-0 bg-white"
            sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-popups allow-popups-to-escape-sandbox"
            title="Secure Web Proxy Browser"
          />
        ) : (
          <div className="flex-1 overflow-y-auto p-6 sm:p-12 bg-white/40">
            <div className="max-w-4xl mx-auto space-y-10">
              
              <div className="text-center space-y-4">
                <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-gray-900">
                  {t.heroTitle}
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  {t.heroDesc}
                </p>
                <p className="text-sm text-indigo-700 font-medium bg-indigo-50/80 inline-block px-5 py-2.5 rounded-full border border-indigo-100 shadow-sm">
                  💡 {t.webProxyDesc}
                </p>
              </div>

              {/* Security Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/70 p-6 rounded-2xl shadow-sm border border-white/60 space-y-3 transition-transform hover:-translate-y-1 duration-300">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{t.feature1Title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {t.feature1Desc}
                  </p>
                </div>
                <div className="bg-white/70 p-6 rounded-2xl shadow-sm border border-white/60 space-y-3 transition-transform hover:-translate-y-1 duration-300">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-sm border border-purple-100">
                    <Globe className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{t.feature2Title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {t.feature2Desc}
                  </p>
                </div>
                <div className="bg-white/70 p-6 rounded-2xl shadow-sm border border-white/60 space-y-3 transition-transform hover:-translate-y-1 duration-300">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                    <Key className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{t.feature3Title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {t.feature3Desc}
                  </p>
                </div>
              </div>

              {/* API Integration Guide */}
              <div className="bg-white/90 rounded-2xl shadow-sm border border-white/60 overflow-hidden">
                <div className="border-b border-black/5 px-6 py-4 bg-white/50">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-gray-700" />
                    {t.toolTitle}
                  </h2>
                </div>
                <div className="p-6 pb-0">
                  <p className="text-sm text-gray-600">{t.toolDesc}</p>
                </div>
                <div className="p-6 overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50/50 text-gray-500 font-medium border-b border-black/5">
                      <tr>
                        <th className="px-6 py-3">{t.apiProvider}</th>
                        <th className="px-6 py-3">{t.apiEndpoint}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-600 font-mono text-xs">
                      <tr>
                        <td className="px-6 py-4 font-sans font-medium text-gray-900">OpenAI</td>
                        <td className="px-6 py-4 text-blue-600 bg-blue-50/30">https://your-domain/api/openai</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-sans font-medium text-gray-900">Google Gemini</td>
                        <td className="px-6 py-4 text-emerald-600 bg-emerald-50/30">https://your-domain/api/gemini</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-sans font-medium text-gray-900">Anthropic (Claude)</td>
                        <td className="px-6 py-4 text-purple-600 bg-purple-50/30">https://your-domain/api/anthropic</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-sans font-medium text-gray-900">xAI (Grok)</td>
                        <td className="px-6 py-4 text-gray-900 bg-gray-50">https://your-domain/api/xai</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-sans font-medium text-gray-900">DeepSeek</td>
                        <td className="px-6 py-4 text-indigo-600 bg-indigo-50/30">https://your-domain/api/deepseek</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DNS Setup Guide */}
              <div className="bg-white/90 rounded-2xl shadow-sm border border-white/60 overflow-hidden">
                <div className="border-b border-black/5 px-6 py-4 bg-white/50">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-gray-700" />
                    {t.dnsTitle}
                  </h2>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-6">{t.dnsDesc}</p>
                  <ol className="space-y-4 text-sm text-gray-700 relative border-l border-gray-200 ml-3 pl-5">
                    <li className="relative">
                      <span className="absolute -left-[29px] top-0.5 bg-white border-2 border-blue-500 text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                      <p>{t.dnsStep1}</p>
                    </li>
                    <li className="relative">
                      <span className="absolute -left-[29px] top-0.5 bg-white border-2 border-blue-500 text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                      <p>{t.dnsStep2}</p>
                    </li>
                    <li className="relative">
                      <span className="absolute -left-[29px] top-0.5 bg-white border-2 border-blue-500 text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                      <p>{t.dnsStep3}</p>
                    </li>
                    <li className="relative">
                      <span className="absolute -left-[29px] top-0.5 bg-white border-2 border-blue-500 text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">4</span>
                      <p>{t.dnsStep4}</p>
                    </li>
                    <li className="relative">
                      <span className="absolute -left-[29px] top-0.5 bg-white border-2 border-blue-500 text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">5</span>
                      <p>{t.dnsStep5}</p>
                    </li>
                  </ol>
                </div>
              </div>

              {/* Worker Code Deployment Guide */}
              <div className="bg-white/90 rounded-2xl shadow-sm border border-white/60 overflow-hidden">
                <div className="border-b border-black/5 px-6 py-4 bg-white/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-gray-700" />
                    {t.workerDeployTitle}
                  </h2>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center space-x-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? (lang === 'zh' ? '已复制' : 'Copied') : (lang === 'zh' ? '复制代码' : 'Copy Code')}</span>
                  </button>
                </div>
                <div className="p-6 pb-0">
                  <p className="text-sm text-gray-600">{t.workerDeployDesc}</p>
                </div>
                <div className="p-6">
                  <div className="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-inner border border-gray-800">
                    <div className="p-4 overflow-x-auto max-h-[500px]">
                      <pre className="font-mono text-[12px] text-[#d4d4d4] leading-relaxed">
                        <code>{workerCode}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
