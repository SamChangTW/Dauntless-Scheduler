
/**
 * CORS 代理助手 for Dauntless Scheduler
 * 解决 Google Sheets CSV 跨域访问问题
 */

const CORSProxyHelper = {
    // CORS 代理列表 (按优先级排序)
    proxies: [
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url=',
        '' // 最后尝试直接访问
    ],

    async fetchWithProxy(url, retries = 2) {
        for (let i = 0; i <= retries; i++) {
            const proxyUrl = this.getProxyUrl(url, i);

            try {
                console.log(`[CORSProxy] 尝试 #${i + 1}: ${this.getProxyName(i)}`);

                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    cache: 'no-store',
                    headers: {
                        'Accept': 'text/csv,text/plain,*/*'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const text = await response.text();

                if (!text || text.length < 10) {
                    throw new Error('返回数据为空或过短');
                }

                console.log(`[CORSProxy] ✅ 成功获取 (${text.length} 字节)`);
                return text;

            } catch (error) {
                console.warn(`[CORSProxy] ❌ 失败: ${error.message}`);

                if (i === retries) {
                    throw new Error(`所有代理都失败: ${error.message}`);
                }

                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    },

    getProxyUrl(originalUrl, proxyIndex) {
        const proxy = this.proxies[proxyIndex % this.proxies.length];
        return proxy ? proxy + encodeURIComponent(originalUrl) : originalUrl;
    },

    getProxyName(proxyIndex) {
        const proxy = this.proxies[proxyIndex % this.proxies.length];
        if (!proxy) return '直接访问';
        if (proxy.includes('corsproxy.io')) return 'CORS Proxy IO';
        if (proxy.includes('allorigins')) return 'AllOrigins';
        return '未知代理';
    }
};

if (typeof window !== 'undefined') {
    window.CORSProxyHelper = CORSProxyHelper;
}