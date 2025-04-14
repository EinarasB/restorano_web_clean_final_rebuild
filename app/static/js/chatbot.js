document.addEventListener("DOMContentLoaded", () => {
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");
    const chatWindow = document.getElementById("chat-messages");

    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const userText = chatInput.value.trim();
        if (!userText) return;

        // Pridėti vartotojo žinutę
        appendMessage("Jūs", userText, "user");
        chatInput.value = "";

        // Siųsti į serverį
        const response = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userText })
        });

        const data = await response.json();
        appendMessage("Padavėjas AI", data.reply, "bot");
    });

    function appendMessage(sender, text, role) {
        const msg = document.createElement("div");
        msg.className = "message " + role;
        msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
        chatWindow.appendChild(msg);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
});
