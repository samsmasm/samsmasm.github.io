async function checkPM() {
    const url = "https://en.wikipedia.org/api/rest_v1/page/summary/Prime_Minister_of_New_Zealand";

    try {
        const response = await fetch(url, {
            headers: { "Accept": "application/json" }
        });

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const data = await response.json();

        // Extract the first paragraph where the PM's name is mentioned
        const text = data.extract;
        console.log("Wikipedia extract:", text); // Debugging: See the extracted text in the console

        // Check conditions
        if (text.includes("will be succeeded by")) {
            document.getElementById("status").textContent = "Not for long";
        } else if (text.includes("Christopher Luxon")) {
            document.getElementById("status").textContent = "Yes";
        } else {
            document.getElementById("status").textContent = "No";
        }
    } catch (error) {
        document.getElementById("status").textContent = "Error fetching status.";
        console.error("Error fetching PM info:", error);
    }
}

// Run the check when the page loads
checkPM();
