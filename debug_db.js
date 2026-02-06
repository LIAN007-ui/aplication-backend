const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite'); // Assuming database.sqlite is in the root or accessible

db.serialize(() => {
    console.log("--- USERS ---");
    db.all("SELECT id, username, role FROM users", (err, rows) => {
        if (err) console.error(err);
        else console.table(rows);
    });

    console.log("\n--- STUDENT PROFILES ---");
    db.all("SELECT user_id, first_name, current_semester_id FROM student_profiles", (err, rows) => {
        if (err) console.error(err);
        else console.table(rows);
    });

    console.log("\n--- TEACHER PROFILES ---");
    db.all("SELECT user_id, full_name, assigned_semester_id FROM teacher_profiles", (err, rows) => {
        if (err) console.error(err);
        else console.table(rows);
    });

    console.log("\n--- PUBLICATIONS ---");
    db.all("SELECT id, title, semester_id FROM publications", (err, rows) => {
        if (err) console.error(err);
        else console.table(rows);
    });

    console.log("\n--- QUESTIONS ---");
    db.all("SELECT id, question_text, semester_id FROM questions", (err, rows) => {
        if (err) console.error(err);
        else console.table(rows);
    });
});

db.close();
