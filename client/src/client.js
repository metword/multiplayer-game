const server = io("https://pacific-cliffs-13549.herokuapp.com", {'transports': ['websocket', 'polling']}, {
    allowEIO3: true,
});
/*
const log = (text) => {
    const list = document.querySelector("#message-history");
    const elem = document.createElement("div");
    elem.innerHTML = text;
    elem.className = "chat-message";
    list.prepend(elem);
}

const onChatSubmitted = (e) => {
    e.preventDefault();
    const input = document.querySelector("#input");
    const text = input.value;
    input.value = "";
    server.emit("message", text);
}

(() => {
    
                //     https://pacific-cliffs-13549.herokuapp.com/

    server.on("message", (text) => {
        log(text);
    });

    //console.log(document.getElementById("chat-widget").style);
    //console.log(document.querySelector("#chat-widget").style);


    document
    .querySelector("#chat-widget")
    .addEventListener("submit", onChatSubmitted);

})();*/