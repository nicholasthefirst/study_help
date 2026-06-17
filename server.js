const express = require("express");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* ---------------- DB (temporary) ---------------- */
const users = [];
const classes = [];
const invites = [];
const memberships = [];
const messages = [];

/* ---------------- EMAIL ---------------- */
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "your_email@gmail.com",
        pass: "your_app_password"
    }
});

async function sendEmail(to, subject, text) {
    await transporter.sendMail({
        from: "Study Platform <your_email@gmail.com>",
        to,
        subject,
        text
    });
}

/* ---------------- UTIL ---------------- */
const token = () => crypto.randomBytes(20).toString("hex");

/* ---------------- CREATE CLASS ---------------- */
app.post("/class/create", (req, res) => {
    const { email, name } = req.body;

    const classId = token();

    classes.push({ id: classId, name });

    memberships.push({
        classId,
        email,
        role: "owner"
    });

    res.json({ classId });
});

/* ---------------- INVITE STUDENT ---------------- */
app.post("/invite/student", async (req, res) => {
    const { email, classId } = req.body;

    const t = token();

    invites.push({
        email,
        classId,
        role: "student",
        token: t,
        expires: Date.now() + 7 * 86400000
    });

    const link = `http://localhost:3000/join/${t}`;

    await sendEmail(email, "Class Invite", link);

    res.json({ link });
});

/* ---------------- INVITE TEACHER ---------------- */
app.post("/invite/teacher", async (req, res) => {
    const { email, classId, role } = req.body;

    const t = token();

    invites.push({
        email,
        classId,
        role: role || "co_teacher",
        token: t,
        expires: Date.now() + 7 * 86400000
    });

    const link = `http://localhost:3000/join-teacher/${t}`;

    await sendEmail(email, "Teacher Invite", link);

    res.json({ link });
});

/* ---------------- JOIN STUDENT ---------------- */
app.get("/join/:token", (req, res) => {
    const inv = invites.find(i => i.token === req.params.token);

    if (!inv) return res.send("Invalid");
    if (inv.expires < Date.now()) return res.send("Expired");

    memberships.push({
        classId: inv.classId,
        email: inv.email,
        role: "student"
    });

    res.send("Joined as student");
});

/* ---------------- JOIN TEACHER ---------------- */
app.get("/join-teacher/:token", (req, res) => {
    const inv = invites.find(i => i.token === req.params.token);

    if (!inv) return res.send("Invalid");
    if (inv.expires < Date.now()) return res.send("Expired");

    memberships.push({
        classId: inv.classId,
        email: inv.email,
        role: inv.role
    });

    res.send("Joined as " + inv.role);
});

/* ---------------- AI TUTOR (RULE-BASED) ---------------- */
app.post("/ai/help", (req, res) => {
    const { question } = req.body;

    const banned = [
        "answer",
        "solve",
        "do it for me",
        "give solution"
    ];

    if (banned.some(b => question.toLowerCase().includes(b))) {
        return res.json({
            reply: "I can’t give direct answers. Try explaining what you understand so far."
        });
    }

    res.json({
        reply: "Break it into smaller steps. What part confuses you?"
    });
});

/* ---------------- CLASS INFO ---------------- */
app.get("/class/:id", (req, res) => {
    res.json({
        class: classes.find(c => c.id === req.params.id),
        members: memberships.filter(m => m.classId === req.params.id)
    });
});

app.listen(3000, () => console.log("http://localhost:3000"));
