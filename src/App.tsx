import { useState } from 'react';
import { Shield, Globe, Lock, Terminal, Search, Plus, ChevronLeft, ChevronRight, Share, Key, Home } from 'lucide-react';

const dict = {
  zh: {
    heroTitle: "量子安全代理中转站",
    heroDesc: "完全内嵌的高速隐私代理架构。不再依赖 Cloudflare Worker，直接在此平台上提供绝对隐私保护与深度 API 分流。",
    feature1Title: "防盗取 API 密钥护盾",
    feature1Desc: "在服务端配置真实的 API Key，客户端仅需输入 Proxy Password (代理密码)。您的真实密钥永远不会暴露在网络中，彻底杜绝被盗用风险。",
    feature2Title: "无痕中转隧道",
    feature2Desc: "目标网站与 API 厂商只能看到来自云端服务器的请求。强制剥离所有追踪请求头，100% 隐藏您的真实 IP。",
    feature3Title: "极速节点直连",
    feature3Desc: "自动将出站请求路由至完全支持大模型的高速海外服务器区域，享受原生般的流畅体验。",
    toolTitle: "主流 API 客户端配置指南 (Chatbox, NextChat 等)",
    toolDesc: "无需翻墙，在主流客户端中填入以下 Base URL。同时在客户端的 API Key 栏填入您在服务端配置的 PROXY_PASSWORD (代理密码)，即可安全地满速调用大模型：",
    apiProvider: "服务商",
    apiEndpoint: "接口地址 (Base URL)",
    webProxyDesc: "直接在上方地址栏输入网站 (如 google.com) 或搜索内容，即可在站内高速代理显示并进行完整操作，支持流媒体、多网页与文件下载。",
    alertTarget: "请输入您的目标网址或搜索内容",
    langToggle: "English"
  },
  en: {
    heroTitle: "Quantum Secure Proxy",
    heroDesc: "Fully embedded high-speed privacy proxy. Cloudflare Worker is no longer needed. Enjoy absolute privacy and deep API routing right from this platform.",
    feature1Title: "API Key Theft Shield",
    feature1Desc: "Configure your real API keys on the server and use a Proxy Password in your clients. Your real keys are never exposed on the network, eliminating the risk of theft.",
    feature2Title: "Untraceable Tunnel",
    feature2Desc: "Target APIs only see our cloud server's IP. All tracking headers are stripped, and your real IP is 100% hidden.",
    feature3Title: "Direct High-Speed Nodes",
    feature3Desc: "Automatically routes egress traffic through regions fully supported by AI APIs for a native-like smooth experience.",
    toolTitle: "API Client Configuration Guide (Chatbox, NextChat)",
    toolDesc: "Configure your AI clients with the following Base URLs. Also enter your PROXY_PASSWORD (configured on the server) in the API Key field of your client to securely proxy your traffic:",
    apiProvider: "Provider",
    apiEndpoint: "Base URL",
    webProxyDesc: "Enter a website (e.g. google.com) or search query in the address bar above to browse directly within this app at high speeds, supporting downloads and multiple pages.",
    alertTarget: "Please enter a target URL or search query",
    langToggle: "中文"
  }
};

export default function App() {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [targetUrl, setTargetUrl] = useState('');
  const [iframeUrl, setIframeUrl] = useState('');

  const t = dict[lang];

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

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
