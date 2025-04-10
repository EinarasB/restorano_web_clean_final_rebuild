document.addEventListener("DOMContentLoaded", function () {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const cartItemsContainer = document.getElementById("cart-items");
    const hiddenInput = document.getElementById("order-data");

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = "<p>Krepšelis tuščias.</p>";
        return;
    }

    const list = document.createElement("ul");
    cart.forEach(item => {
        const li = document.createElement("li");
        li.textContent = `${item.name} x${item.quantity} - €${(item.price * item.quantity).toFixed(2)}`;
        list.appendChild(li);
    });

    cartItemsContainer.appendChild(list);
    hiddenInput.value = JSON.stringify(cart);
});
