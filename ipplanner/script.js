function editCell(cell) {
    let newText = prompt("Enter new activity:", cell.innerText);
    if (newText !== null && newText.trim() !== "") {
        cell.innerText = newText;
    }
}
