const express = require("express");
const app = express();

app.use(express.json());

const flashcardsDB = {}; // classId -> cards

/* ---------------- AI (optional) ---------------- */
async function generateFlashcards(text) {
    const fetch = (await import("node-fetch")).default;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{
                role: "user",
                content: `
Turn this into flashcards.
Return JSON only: [{"front":"...","back":"..."}]

Text:
${text}
`
            }]
        })
    });

    const data = await res.json();

    try {
        return JSON.parse(data.choices[0].message.content);
    } catch {
        return [];
    }
}

/* ---------------- TEACHER: CREATE FLASHCARDS ---------------- */
app.post("/generate/:classId", async (req, res) => {
    const { text } = req.body;
    const { classId } = req.params;

    const cards = await generateFlashcards(text);

    flashcardsDB[classId] = cards;

    res.json({ success: true, cards });
});

/* ---------------- STUDENT: VIEW FLASHCARDS ---------------- */
app.get("/flashcards/:classId", (req, res) => {
    res.json(flashcardsDB[req.params.classId] || []);
});

/* ---------------- FRONTEND ---------------- */
app.get("/", (req, res) => {
    res.send(`
<h1>Study Platform</h1>

<h2>Teacher</h2>
<textarea id="text"></textarea>
<br>
<button onclick="generate()">Generate Flashcards</button>

<h2>Student View</h2>
<div id="cards"></div>

<script>
const classId = "demo";

function generate() {
    fetch("/generate/" + classId, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ text: document.getElementById("text").value })
    })
    .then(r => r.json())
    .then(d => alert("Flashcards created: " + d.cards.length));
}

fetch("/flashcards/" + classId)
.then(r => r.json())
.then(cards => {
    document.getElementById("cards").innerHTML =
        cards.map(c => \`
            <div style="border:1px solid #ccc;margin:10px;padding:10px">
                <b>\${c.front}</b><br>\${c.back}
            </div>
        \`).join("");
});
</script>
    `);
});

app.listen(3000, () => console.log("Running"));
