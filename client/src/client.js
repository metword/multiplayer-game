const log = (text) => {
    const list = document.querySelector("#message-history");
    const elem = document.createElement("div");
    elem.innerHTML = text;
    elem.className = "chat-message";
    list.prepend(elem);
}

const onChatSubmitted = (sock) => (e) => {
    e.preventDefault();
    const input = document.querySelector("#input");
    const text = input.value;
    input.value = "";
    console.log(text);
    sock.emit("message", text);
}

(() => {
    const sock = io("https://ppl.herokuapp.com/");

    sock.on("message", (text) => {
        log(text);
    });

    console.log(document.getElementById("chat-widget").style);
    console.log(document.querySelector("#chat-widget").style);


    document
    .querySelector("#chat-widget")
    .addEventListener("submit", onChatSubmitted(sock));

})();


