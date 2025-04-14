document.addEventListener("DOMContentLoaded", function () {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const cartItemsContainer = document.getElementById("cart-items");
    const hiddenInput = document.getElementById("order-data");

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = "<p>Krepšelis tuščias.</p>";
        return;
    }

    const list = document.createElement("ul");
    let total = 0;

    cart.forEach((item, index) => {
        const li = document.createElement("li");
        const lineTotal = item.quantity * item.price;
        total += lineTotal;

        li.innerHTML = `
            ${item.name} x${item.quantity} - €${lineTotal.toFixed(2)}
        `;

        list.appendChild(li);
    });

    const totalElement = document.createElement("p");
    totalElement.innerHTML = `<strong>Viso: €${total.toFixed(2)}</strong>`;
    totalElement.style.marginTop = "20px";

    cartItemsContainer.appendChild(list);
    cartItemsContainer.appendChild(totalElement);

    hiddenInput.value = JSON.stringify(cart);

    // Kai forma siunčiama – išvalyti krepšelį
    const form = document.querySelector("form");
    form.addEventListener("submit", () => {
        localStorage.removeItem("cart");
    });
});
