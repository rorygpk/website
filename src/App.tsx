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

  const workerCode = `export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathStr = url.pathname.slice(1); // remove leading slash
    const search = url.search;

    // --- 1. 全局 CORS 跨域处理 (支持本地前端网页直接调用) ---
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Expose-Headers': '*',
      'Access-Control-Allow-Credentials': 'true',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // --- 2. 预设主流 AI API 路由映射 ---
    const apiRoutes = {
      'api/openai': 'https://api.openai.com',
      'v1': 'https://api.openai.com/v1',
      'api/gemini': 'https://generativelanguage.googleapis.com',
      'api/anthropic': 'https://api.anthropic.com',
      'api/xai': 'https://api.x.ai',
      'api/deepseek': 'https://api.deepseek.com'
    };

    let targetUrl = '';
    
    // 检查是否匹配预设的 API 路由
    for (const [prefix, targetBase] of Object.entries(apiRoutes)) {
        if (pathStr === prefix || pathStr.startsWith(prefix + '/')) {
             const rest = pathStr.slice(prefix.length);
             targetUrl = targetBase + rest + search;
             break;
        }
    }

    // --- 3. 动态万能代理 (例如请求 /https://www.google.com) ---
    if (!targetUrl && pathStr) {
      let decodedPath = decodeURIComponent(pathStr);
      // 兼容旧版带 proxy/ 前缀的请求
      if (decodedPath.startsWith('proxy/')) {
         decodedPath = decodedPath.slice(6);
      }

      if (decodedPath.startsWith('http://') || decodedPath.startsWith('https://')) {
          targetUrl = decodedPath + search;
      } else if (/^([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}(\\/.*)?$/.test(decodedPath)) {
          targetUrl = 'https://' + decodedPath + search;
      }
    }

    // --- 4. 根目录：返回使用说明网页 ---
    if (!targetUrl) {
        return new Response(\`
            <html>
                <head>
                    <title>Cloudflare 终极代理节点</title>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; line-height: 1.6; max-width: 800px; margin: 0 auto; color: #333; }
                        h1 { color: #f6821f; }
                        code { background: #f1f1f1; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #e83e8c; }
                        .card { border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
                    </style>
                </head>
                <body>
                    <h1>🚀 Cloudflare 终极万能代理已就绪！</h1>
                    <p>这是一个运行在 Cloudflare 边缘网络的高性能代理节点。原生支持跨域 (CORS)，无需配置即可直接被前端项目或本地代码调用。</p>
                    
                    <div class="card">
                        <h3>🤖 AI API 快捷代理 (直接替换官方域名即可)</h3>
                        <ul>
                            <li><b>OpenAI:</b> <code>https://\${url.hostname}/v1/chat/completions</code></li>
                            <li><b>Anthropic:</b> <code>https://\${url.hostname}/api/anthropic/v1/messages</code></li>
                            <li><b>DeepSeek:</b> <code>https://\${url.hostname}/api/deepseek/chat/completions</code></li>
                        </ul>
                    </div>

                    <div class="card">
                        <h3>🌍 万能网页 / API 代理 (前缀拼接)</h3>
                        <p>只需在域名后拼接目标 URL 即可：</p>
                        <ul>
                            <li><b>任意 API:</b> <code>https://\${url.hostname}/https://api.github.com/users</code></li>
                            <li><b>任意网页:</b> <code>https://\${url.hostname}/https://www.google.com</code></li>
                        </ul>
                    </div>
                </body>
            </html>
        \`, {
            headers: {
                'Content-Type': 'text/html;charset=UTF-8',
                ...corsHeaders
            }
        });
    }

    // --- 5. 执行代理请求 ---
    try {
        const targetUrlObj = new URL(targetUrl);
        
        // 过滤不需要的请求头
        const proxyHeaders = new Headers(request.headers);
        proxyHeaders.delete('Host');
        proxyHeaders.delete('Origin');
        proxyHeaders.delete('Referer');
        proxyHeaders.delete('cf-connecting-ip');
        proxyHeaders.delete('cf-ipcountry');
        proxyHeaders.delete('cf-ray');
        proxyHeaders.delete('cf-visitor');
        proxyHeaders.delete('x-forwarded-proto');
        proxyHeaders.delete('x-forwarded-for');
        proxyHeaders.delete('x-real-ip');
        
        // 设置目标 Host
        proxyHeaders.set('Host', targetUrlObj.hostname);
        // 为了访问一些外网网页，最好带上一个真实的 User-Agent (如果没有的话)
        if (!proxyHeaders.has('User-Agent')) {
             proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        }
        
        const requestInit = {
            method: request.method,
            headers: proxyHeaders,
            redirect: 'manual' // 手动处理重定向，防止跳回原域名
        };

        if (request.method !== 'GET' && request.method !== 'HEAD') {
             requestInit.body = request.body;
        }

        const proxyRes = await fetch(targetUrl, requestInit);
        
        const responseHeaders = new Headers(proxyRes.headers);
        
        // 强制注入 CORS 响应头
        for (const [key, value] of Object.entries(corsHeaders)) {
            responseHeaders.set(key, value);
        }

        // 移除会阻止 iframe 嵌套或安全策略的响应头 (针对外网网页代理)
        responseHeaders.delete('x-frame-options');
        responseHeaders.delete('content-security-policy');
        responseHeaders.delete('content-security-policy-report-only');
        responseHeaders.delete('clear-site-data');

        // 自动重写重定向地址，让请求继续走代理
        if (responseHeaders.has('location')) {
            const loc = responseHeaders.get('location');
            if (loc.startsWith('http')) {
                responseHeaders.set('location', \`/\${loc}\`);
            } else if (loc.startsWith('/')) {
                responseHeaders.set('location', \`/\${targetUrlObj.origin}\${loc}\`);
            }
        }
        
        // 处理 Cookie 域名和路径问题
        const cookies = proxyRes.headers.getSetCookie ? proxyRes.headers.getSetCookie() : [];
        if (cookies && cookies.length > 0) {
            responseHeaders.delete('set-cookie');
            cookies.forEach(c => {
                 responseHeaders.append('set-cookie', c.replace(/domain=[^;]+/i, '').replace(/Path=[^;]+/i, 'Path=/'));
            });
        }

        return new Response(proxyRes.body, {
            status: proxyRes.status,
            statusText: proxyRes.statusText,
            headers: responseHeaders
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: "代理请求失败: " + e.message, target: targetUrl }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
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
             target = `https://www.bing.com/search?q=${encodeURIComponent(target)}`;
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
