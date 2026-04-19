(function() {
    window.injectScript = function(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => resolve(script);
            script.onerror = () => reject(new Error(`脚本加载失败: ${url}`));
            document.head.appendChild(script);
        });
    };
    console.log('✅ 注入器已就绪，使用 injectScript("脚本URL") 加载外部 JS');
})();

// 加载您自己的脚本
injectScript('../plug/imgFilter.js').then(() => {
    console.log('脚本已执行');
}).catch(err => console.error(err));