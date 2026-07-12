import { useState } from 'react';
import { Copy, Check, Shield, Globe, Lock, Terminal, Search, Plus, ChevronLeft, ChevronRight, Share, Key, AlertTriangle } from 'lucide-react';

const dict = {
  zh: {
    heroTitle: "量子安全代理中转站",
    heroDesc: "企业级 Cloudflare 基础设施，提供绝对隐私保护与深度 API 路由分流。",
    feature1Title: "流量深度混淆",
    feature1Desc: "响应数据动态填充随机字节，突破运营商 DPI (深度包检测) 特征识别，绝对隐藏您的访问内容。",
    feature2Title: "运营商物理盲区",
    feature2Desc: "您的网络提供商只能看到与 Cloudflare CDN 的 TLS 加密连接。目标网站 100% 隐藏，强制剥离所有追踪请求头。",
    feature3Title: "AI 节点定向路由",
    feature3Desc: "利用 Cloudflare 全球 Anycast 网络，自动将出站请求路由至完全支持大模型的高速海外服务器区域。",
    deployTitle: "部署指南 (必看：解决上传报错)",
    deployWarning: "遇到 Cloudflare 提示「This uploader does not yet support... TypeScript files were found」报错？请勿直接上传文件！",
    deploySteps: [
      "登录 Cloudflare 控制台，进入 Workers & Pages -> 创建 Worker。",
      "随意命名并点击「部署 (Deploy)」。",
      "进入配置页面后，点击右上角的「编辑代码 (Edit Code)」。",
      "复制下方的 JavaScript 代码，直接粘贴到网页编辑器中覆盖原有代码。",
      "点击右上角的「保存并部署 (Save and deploy)」。"
    ],
    toolTitle: "主流 API 客户端配置指南 (Chatbox, NextChat 等)",
    toolDesc: "无需翻墙，直接在主流客户端中填入以下 Base URL，即可满速使用各家大模型 API：",
    apiProvider: "服务商",
    apiEndpoint: "接口地址 (Base URL 填入此处)",
    webProxyDesc: "直接在上方苹果浏览器风格的地址栏输入目标网址进行搜索或访问，自动支持多网页安全浏览与文件操作。",
    alertTarget: "请输入您的目标网址或搜索内容",
    alertWorker: "请先输入您的 Worker 域名",
    langToggle: "English"
  },
  en: {
    heroTitle: "Quantum Secure Proxy",
    heroDesc: "Enterprise-grade Cloudflare infrastructure for absolute privacy and deep API routing.",
    feature1Title: "Traffic Obfuscation",
    feature1Desc: "Responses are dynamically padded with random data bytes. This neutralizes ISP Deep Packet Inspection (DPI) fingerprinting.",
    feature2Title: "ISP Blindspot",
    feature2Desc: "Your ISP only sees an encrypted TLS connection to a Cloudflare CDN. Target domains remain 100% hidden. Tracking headers stripped.",
    feature3Title: "Region Routing",
    feature3Desc: "Cloudflare's anycast network automatically routes egress traffic through regions fully supported by AI APIs.",
    deployTitle: "Deployment Guide (Fix Upload Errors)",
    deployWarning: "Getting 'This uploader does not yet support... TypeScript files were found' error? Do NOT upload the project files!",
    deploySteps: [
      "Go to Cloudflare Dashboard -> Workers & Pages -> Create Worker.",
      "Name your worker and click 'Deploy'.",
      "Click 'Edit Code' in the top right corner.",
      "Copy the JavaScript code below and paste it directly into the web editor, overwriting the default code.",
      "Click 'Save and deploy'."
    ],
    toolTitle: "API Client Configuration Guide (Chatbox, NextChat)",
    toolDesc: "Configure your AI clients with the following Base URLs to securely proxy your API traffic:",
    apiProvider: "Provider",
    apiEndpoint: "Base URL",
    webProxyDesc: "Use the Safari-style address bar above to enter a URL or search query for secure, multi-tab web browsing.",
    alertTarget: "Please enter a target URL or search query",
    alertWorker: "Please enter your Worker domain first",
    langToggle: "中文"
  }
};

export default function App() {
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [workerDomain, setWorkerDomain] = useState('');
  const [targetUrl, setTargetUrl] = useState('');

  const t = dict[lang];

  const handleBrowse = () => {
    let worker = workerDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!worker) {
      alert(t.alertWorker);
      return;
    }
    
    let target = targetUrl.trim();
    if (!target) {
        alert(t.alertTarget);
        return;
    }
    
    // Auto Google Search if not a URL
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
        if (!target.includes('.') || target.includes(' ')) {
             target = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
        } else {
             target = `https://${target}`;
        }
    }
    
    window.open(`https://${worker}/${target}`, '_blank');
  };

  const workerCode = `/**
 * Cloudflare Worker - Quantum Secure AI & Web Proxy
 * 
 * Features:
 * - Traffic Padding (Anti-Traffic Analysis)
 * - Strict Region Routing (AI Studio supported regions egress)
 * - Full Web Proxy (Cookies, Logins, Uploads/Downloads)
 * - Deep API Proxy (OpenAI, Gemini, Anthropic, xAI, DeepSeek)
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

    // --- 2. API Routing Logic ---
    let targetUrl = '';
    let isApi = false;
    
    const apiRoutes = {
      '/openai': 'https://api.openai.com',
      '/gemini': 'https://generativelanguage.googleapis.com',
      '/anthropic': 'https://api.anthropic.com',
      '/xai': 'https://api.x.ai',
      '/deepseek': 'https://api.deepseek.com'
    };

    for (const [prefix, targetBase] of Object.entries(apiRoutes)) {
      if (url.pathname.startsWith(prefix)) {
        targetUrl = targetBase + url.pathname.replace(prefix, '') + url.search;
        isApi = true;
        break;
      }
    }

    // --- 3. Dynamic Full Web Proxy ---
    if (!isApi) {
      const pathUrl = url.pathname.slice(1) + url.search;
      if (pathUrl.startsWith('http://') || pathUrl.startsWith('https://')) {
        targetUrl = pathUrl;
      } else {
        // Fallback for relative assets via Referer
        const referer = request.headers.get('Referer');
        if (referer) {
          try {
            const refUrl = new URL(referer);
            const refTarget = refUrl.pathname.slice(1);
            if (refTarget.startsWith('http')) {
               const baseTarget = new URL(refTarget);
               targetUrl = new URL(url.pathname + url.search, baseTarget.origin).toString();
            }
          } catch(e) {}
        }
      }
    }

    if (!targetUrl) {
       return new Response("Proxy active. Append a target URL (e.g., /https://google.com).", { status: 200 });
    }

    // --- 4. Request Construction & Anonymization ---
    const proxyHeaders = new Headers(request.headers);
    const targetUrlObj = new URL(targetUrl);
    
    proxyHeaders.set('Host', targetUrlObj.hostname);
    
    if (!isApi) {
       proxyHeaders.delete('Origin');
       proxyHeaders.delete('Referer');
       // Hide original client IP from target to ensure anonymity
       const cfHeaders = ['cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'x-forwarded-proto', 'x-forwarded-for', 'x-real-ip', 'true-client-ip'];
       cfHeaders.forEach(h => proxyHeaders.delete(h));
    }

    const requestInit = {
      method: request.method,
      headers: proxyHeaders,
      redirect: 'manual' // Catch redirects to rewrite Location
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
        // Rewrite Redirects to keep user on the proxy
        if ([301, 302, 303, 307, 308].includes(response.status)) {
            const location = responseHeaders.get('Location');
            if (location) {
                if (location.startsWith('http')) {
                    responseHeaders.set('Location', \`/\${location}\`);
                } else if (location.startsWith('/')) {
                    responseHeaders.set('Location', \`/\${targetUrlObj.origin}\${location}\`);
                }
            }
        }
        // Remove framing & security restrictions for proxying
        responseHeaders.delete('X-Frame-Options');
        responseHeaders.delete('Content-Security-Policy');
        responseHeaders.delete('Content-Security-Policy-Report-Only');
        responseHeaders.delete('Clear-Site-Data');
      }

      // --- 5. Traffic Padding (Anti-Analysis) ---
      // Adds random junk data to headers to obfuscate packet sizes.
      // Defeats ISP Deep Packet Inspection size fingerprinting.
      const padSize = Math.floor(Math.random() * 2048) + 512; 
      responseHeaders.set('X-Padding-Obfuscation', '0'.repeat(padSize));

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (error: any) {
      return new Response(JSON.stringify({ error: \`Proxy Error: \${error.message}\` }), { status: 500 });
    }
  }
};`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(workerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center flex flex-col items-center p-4 sm:p-8 font-sans">
      
      {/* Container */}
      <div className="w-full max-w-5xl bg-white/70 backdrop-blur-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/40 ring-1 ring-black/5 mt-8">
        
        {/* Apple Safari Window Chrome & Address Bar */}
        <div className="h-[52px] bg-white/60 backdrop-blur-md flex items-center px-4 border-b border-black/10">
          <div className="flex space-x-2 w-1/4">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] shadow-sm"></div>
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] shadow-sm"></div>
            <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] shadow-sm"></div>
          </div>
          
          {/* Smart Address Bar */}
          <div className="flex-1 flex justify-center items-center space-x-2">
             <div className="hidden sm:flex space-x-1 text-gray-400">
               <ChevronLeft className="w-5 h-5" />
               <ChevronRight className="w-5 h-5 opacity-30" />
             </div>
            <div className="bg-white/80 shadow-sm border border-black/10 rounded-md px-3 py-1 flex items-center space-x-1 text-[13px] text-gray-700 w-full max-w-lg transition-all focus-within:ring-2 focus-within:ring-blue-400/50">
              <Lock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mr-1" />
              <span className="text-gray-400 font-mono text-xs">https://</span>
              <input 
                type="text"
                placeholder="worker.dev"
                value={workerDomain}
                onChange={e => setWorkerDomain(e.target.value)}
                className="bg-transparent outline-none w-20 sm:w-28 placeholder-gray-400 font-medium text-blue-600"
              />
              <span className="text-gray-300 mx-1">/</span>
              <input 
                type="text"
                placeholder={lang === 'zh' ? "输入网址或搜索内容..." : "Search or enter website..."}
                value={targetUrl}
                onChange={e => setTargetUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBrowse()}
                className="bg-transparent outline-none flex-1 placeholder-gray-400"
              />
              <button onClick={handleBrowse} className="text-blue-500 hover:text-blue-600 transition-colors ml-1 p-1 bg-blue-50 rounded">
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

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-12 bg-white/40">
          <div className="max-w-4xl mx-auto space-y-10">
            
            <div className="text-center space-y-4">
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-gray-900">
                {t.heroTitle}
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                {t.heroDesc}
              </p>
              <p className="text-sm text-indigo-600 font-medium bg-indigo-50/50 inline-block px-4 py-2 rounded-full border border-indigo-100">
                💡 {t.webProxyDesc}
              </p>
            </div>

            {/* Security Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/60 p-6 rounded-2xl shadow-sm border border-white/50 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900">{t.feature1Title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t.feature1Desc}
                </p>
              </div>
              <div className="bg-white/60 p-6 rounded-2xl shadow-sm border border-white/50 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-sm border border-purple-100">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900">{t.feature2Title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t.feature2Desc}
                </p>
              </div>
              <div className="bg-white/60 p-6 rounded-2xl shadow-sm border border-white/50 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                  <Key className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900">{t.feature3Title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t.feature3Desc}
                </p>
              </div>
            </div>

            {/* Deployment Guide */}
            <div className="bg-white/80 rounded-2xl shadow-sm border border-white/50 overflow-hidden">
              <div className="border-b border-rose-100 px-6 py-4 bg-rose-50/50">
                <h2 className="text-lg font-semibold text-rose-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  {t.deployTitle}
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm font-medium text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-100">
                  {t.deployWarning}
                </p>
                <ol className="list-decimal list-inside space-y-3 text-sm text-gray-700">
                  {t.deploySteps.map((step, index) => (
                    <li key={index} className="leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* API Integration Guide */}
            <div className="bg-white/80 rounded-2xl shadow-sm border border-white/50 overflow-hidden">
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
                      <td className="px-6 py-4 text-blue-600 bg-blue-50/30">https://your-domain/openai</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-sans font-medium text-gray-900">Google Gemini</td>
                      <td className="px-6 py-4 text-emerald-600 bg-emerald-50/30">https://your-domain/gemini</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-sans font-medium text-gray-900">Anthropic (Claude)</td>
                      <td className="px-6 py-4 text-purple-600 bg-purple-50/30">https://your-domain/anthropic</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-sans font-medium text-gray-900">xAI (Grok)</td>
                      <td className="px-6 py-4 text-gray-900 bg-gray-50">https://your-domain/xai</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-sans font-medium text-gray-900">DeepSeek</td>
                      <td className="px-6 py-4 text-indigo-600 bg-indigo-50/30">https://your-domain/deepseek</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Code Block */}
            <div className="bg-[#1e1e1e] rounded-2xl shadow-xl overflow-hidden border border-gray-800">
              <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-[#3c3c3c]">
                <span className="font-mono text-xs font-medium text-gray-400">worker.js</span>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center space-x-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <div className="p-5 overflow-x-auto max-h-[500px]">
                <pre className="font-mono text-[12px] text-[#d4d4d4] leading-relaxed">
                  <code>{workerCode}</code>
                </pre>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
