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
        const dateInput = document.getElementById("reservation-date");
        const timeInput = document.getElementById("reservation-time");

        if (!dateInput.value || !timeInput.value) {
            alert("❗ Pasirinkite datą ir laiką.");
            return;
        }

        document.getElementById("reservation-date-hidden").value = dateInput.value;
        document.getElementById("reservation-time-hidden").value = timeInput.value;

        tableInput.value = selectedTable;
        form.submit();
    });


    cancelBtn.addEventListener("click", () => {
        modal.style.display = "none";
        selectedTable = "";
    });

});
