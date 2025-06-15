function Toast(message) {
    if (document.querySelector(".toast")) return
    let toast = document.createElement("div")
    toast.className = "toast"
    toast.textContent = message
    document.body.appendChild(toast)
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.5s forwards, fadeOut 0.5s ease';
        toast.remove();
    }, 4000);
}