
/**
 * CORS 代理助手 for Dauntless Scheduler
 * 解決 Google Sheets CSV 跨域存取問題
 */

const CORSProxyHelper = {
    // CORS 代理清單（依優先順序排列）
    proxies: [
        '', // 首先嘗試直接存取（Google Sheets CSV 支援 CORS）
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url='
    ],

    /**
     * 依序嘗試代理清單，直到成功為止。
     * 不再使用外部 retries 參數，改為直接迭代 proxies 陣列，
     * 確保新增 / 刪除代理時邏輯自動對應。
     */
    async fetchWithProxy(url) {
        let lastError = null;

        for (let i = 0; i < this.proxies.length; i++) {
            const proxyUrl = this.getProxyUrl(url, i);

            try {
                console.log(`[CORSProxy] 嘗試 #${i + 1}: ${this.getProxyName(i)}`);

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
                    throw new Error('回傳資料為空或過短');
                }

                console.log(`[CORSProxy] ✅ 成功取得 (${text.length} 位元組)`);
                return text;

            } catch (error) {
                lastError = error;
                console.warn(`[CORSProxy] ❌ 失敗: ${error.message}`);

                // 尚有下一個代理可嘗試時，等待短暫間隔
                if (i < this.proxies.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }

        throw new Error(`所有代理均失敗：${lastError ? lastError.message : '未知錯誤'}`);
    },

    getProxyUrl(originalUrl, proxyIndex) {
        const proxy = this.proxies[proxyIndex % this.proxies.length];
        return proxy ? proxy + encodeURIComponent(originalUrl) : originalUrl;
    },

    getProxyName(proxyIndex) {
        const proxy = this.proxies[proxyIndex % this.proxies.length];
        if (!proxy) return '直接存取';
        if (proxy.includes('corsproxy.io')) return 'CORS Proxy IO';
        if (proxy.includes('allorigins')) return 'AllOrigins';
        return '未知代理';
    }
};

if (typeof window !== 'undefined') {
    window.CORSProxyHelper = CORSProxyHelper;
}