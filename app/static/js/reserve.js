document.addEventListener("DOMContentLoaded", function () {
    const tableButtons = document.querySelectorAll(".table-btn");
    const modal = document.getElementById("modal");
    const modalTable = document.getElementById("modal-table");
    const confirmBtn = document.getElementById("confirm-reserve");
    const cancelBtn = document.getElementById("cancel-reserve");
    const form = document.getElementById("reservation-form");
    const tableInput = document.getElementById("selected-table");

    let selectedTable = "";

    tableButtons.forEach(button => {
        button.addEventListener("click", () => {
            selectedTable = button.dataset.table;
            modalTable.textContent = selectedTable;
            modal.style.display = "flex";
        });
    });

    confirmBtn.addEventListener("click", () => {
        tableInput.value = selectedTable;
        form.submit();
    });

    cancelBtn.addEventListener("click", () => {
        modal.style.display = "none";
        selectedTable = "";
    });
});
