import { RequestContext } from '../../core/RequestContext';

export class PortalGateway {
  public static async handleRequest(ctx: RequestContext): Promise<Response> {
    const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enterprise Gateway Portal</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        gray: { 900: '#0f172a', 800: '#1e293b', 700: '#334155' }
                    }
                }
            }
        }
    </script>
    <style>
        body { background-color: #020617; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .glass-card { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); }
        .hero-gradient { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .proxy-input { background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.2); transition: all 0.3s ease; }
        .proxy-input:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3); }
        .animate-pulse-slow { animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    </style>
</head>
<body class="min-h-screen bg-[#020617] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-[#020617] antialiased">
    
    <!-- Navbar -->
    <nav class="border-b border-white/10 glass-card sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg">G</div>
                    <span class="font-bold text-xl tracking-tight">Enterprise <span class="text-blue-400">Gateway</span></span>
                </div>
                <div class="flex items-center gap-4">
                    <span class="flex items-center gap-2 text-xs font-mono bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full border border-green-500/20">
                        <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse-slow"></span> SYSTEM ONLINE
                    </span>
                    <button class="text-sm font-medium text-gray-400 hover:text-white transition-colors" onclick="logout()">Sign Out</button>
                </div>
            </div>
        </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <!-- Hero Section -->
        <div class="text-center space-y-4 mb-16 relative">
            <div class="absolute inset-x-0 -top-20 -z-10 transform-gpu overflow-hidden blur-3xl" aria-hidden="true">
                <div class="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
            </div>
            <h1 class="text-5xl font-extrabold tracking-tight">Unified Access <span class="hero-gradient">Architecture</span></h1>
            <p class="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">Secure, anonymous, and borderless internet routing combined with ultimate AI API aggregation.</p>
        </div>

        <!-- Quick Access Proxy -->
        <div class="glass-card rounded-2xl p-8 mb-12 shadow-2xl relative overflow-hidden group border border-blue-500/20">
            <div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div class="relative z-10 flex flex-col md:flex-row gap-4">
                <div class="flex-grow">
                    <label class="block text-sm font-medium text-blue-300 mb-2 flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
                        Secure Web Proxy (Maximum Camouflage Mode)
                    </label>
                    <div class="flex relative group-hover:shadow-blue-500/20 transition-shadow rounded-xl">
                        <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 font-mono">https://</span>
                        <input type="text" id="proxy-url" class="w-full proxy-input text-white rounded-xl pl-20 pr-4 py-4 font-mono text-lg" placeholder="openai.com" onkeydown="if(event.key === 'Enter') goProxy()">
                    </div>
                </div>
                <div class="flex items-end">
                    <button onclick="goProxy()" class="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-blue-500/40 transition-all duration-300 w-full md:w-auto flex items-center justify-center gap-2">
                        Launch <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </button>
                </div>
            </div>
            <p class="mt-4 text-xs text-gray-400 flex items-center gap-2">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Traffic is TLS-encrypted, raw headers are obfuscated, and CF characteristics are aggressively stripped to bypass bot detection.
            </p>
        </div>

        <!-- Bento Grid Services -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- AI Gateway -->
            <div class="glass-card rounded-2xl p-6 md:col-span-2 hover:border-purple-500/40 transition-colors duration-300">
                <div class="flex items-center gap-3 mb-4">
                    <div class="p-2 bg-purple-500/20 rounded-lg text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    </div>
                    <h3 class="text-xl font-bold">AI Unified Pipeline</h3>
                </div>
                <p class="text-gray-400 text-sm mb-6">Unified OpenAI-compatible endpoints for all major LLMs. Zero-overhead streaming, automatic error normalization.</p>
                <div class="space-y-3">
                    <div class="bg-gray-900/60 p-3.5 rounded-xl flex items-center justify-between border border-white/5 hover:border-white/10 transition-colors">
                        <div class="flex items-center gap-3"><div class="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div><span class="font-mono text-sm text-gray-200">OpenAI (gpt-4o)</span></div>
                        <span class="text-xs text-gray-500 font-mono bg-black/50 px-2 py-1 rounded">/ai/openai/v1/chat/completions</span>
                    </div>
                    <div class="bg-gray-900/60 p-3.5 rounded-xl flex items-center justify-between border border-white/5 hover:border-white/10 transition-colors">
                        <div class="flex items-center gap-3"><div class="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]"></div><span class="font-mono text-sm text-gray-200">Gemini (1.5-pro)</span></div>
                        <span class="text-xs text-gray-500 font-mono bg-black/50 px-2 py-1 rounded">/ai/gemini/v1/chat/completions</span>
                    </div>
                </div>
            </div>

            <!-- Admin & Storage -->
            <div class="glass-card rounded-2xl p-6 hover:border-cyan-500/40 transition-colors duration-300 flex flex-col justify-between">
                <div>
                    <div class="flex items-center gap-3 mb-4">
                        <div class="p-2 bg-cyan-500/20 rounded-lg text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
                        </div>
                        <h3 class="text-xl font-bold">Storage Topology</h3>
                    </div>
                    <p class="text-gray-400 text-sm mb-5">Current stateless architecture bindings. Ready for seamless KV/D1 scaling.</p>
                </div>
                <div class="space-y-3">
                    <div class="flex justify-between items-center text-sm bg-gray-900/40 p-2 rounded-lg"><span class="text-gray-400">KV Cache</span><span class="text-yellow-400 text-xs border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 rounded font-medium">Memory Mode</span></div>
                    <div class="flex justify-between items-center text-sm bg-gray-900/40 p-2 rounded-lg"><span class="text-gray-400">D1 Database</span><span class="text-gray-500 text-xs border border-gray-600/30 px-2 py-0.5 rounded font-medium">Unbound</span></div>
                    <div class="flex justify-between items-center text-sm bg-gray-900/40 p-2 rounded-lg"><span class="text-gray-400">R2 Object</span><span class="text-gray-500 text-xs border border-gray-600/30 px-2 py-0.5 rounded font-medium">Unbound</span></div>
                </div>
                <button class="mt-6 w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-all border border-white/10 hover:border-white/20 text-gray-300">Open Extension Panel ↗</button>
            </div>
        </div>
    </main>

    <script>
        function goProxy() {
            let url = document.getElementById('proxy-url').value.trim();
            if(!url) return;
            if(!url.startsWith('http')) url = 'https://' + url;
            window.location.href = '/' + url;
        }

        function logout() {
            document.cookie = "gateway_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            window.location.reload();
        }
    </script>
</body>
</html>`;

    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}
