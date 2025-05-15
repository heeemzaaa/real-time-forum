// Initialize WebSocket when user is logged in
function initializeChat() {
    // Connect to websocket
    connectWebSocket();

    // Load online users for the home page sidebar
    loadOnlineUsers();
}

// Only initialize WebSocket when user is logged in
window.addEventListener('load', function () {
    const originalShowPage = window.showPage;

    window.showPage = function (pageId) {
        // Call the original showPage function
        originalShowPage(pageId);

        // If showing home page, initialize chat
        if (pageId === 'home-page') {
            // Small delay to ensure DOM is fully loaded
            setTimeout(function () {
                initializeChat();
            }, 100);
        }
    }
});