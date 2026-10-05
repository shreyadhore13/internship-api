const Database = require("better-sqlite3");

const db = new Database("database/internship.db");

db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS internships (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        domain TEXT NOT NULL,
        mode TEXT NOT NULL,
        duration_weeks INTEGER NOT NULL,
        applications_open INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        internship_id TEXT NOT NULL,
        applicant_name TEXT NOT NULL,
        applicant_email TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (internship_id, applicant_email),
        FOREIGN KEY (internship_id) REFERENCES internships(id)
    );
`);

const internships = [
    {
        id: "INT-001",
        title: "Frontend Practice Internship",
        domain: "Web Development",
        mode: "Remote",
        duration_weeks: 4,
        applications_open: 1
    },
    {
        id: "INT-002",
        title: "Data Dashboard Internship",
        domain: "Data Analytics",
        mode: "Remote",
        duration_weeks: 6,
        applications_open: 1
    },
    {
        id: "INT-003",
        title: "Product Design Internship",
        domain: "UI/UX",
        mode: "Hybrid",
        duration_weeks: 4,
        applications_open: 1
    },
    {
        id: "INT-004",
        title: "C++ Utility Internship",
        domain: "C++ Programming",
        mode: "Remote",
        duration_weeks: 5,
        applications_open: 0
    }
];

const insert = db.prepare(`
    INSERT OR IGNORE INTO internships
    (
        id,
        title,
        domain,
        mode,
        duration_weeks,
        applications_open
    )
    VALUES
    (
        @id,
        @title,
        @domain,
        @mode,
        @duration_weeks,
        @applications_open
    )
`);

const insertMany = db.transaction((records) => {
    for (const internship of records) {
        insert.run(internship);
    }
});

insertMany(internships);

console.log("Database initialized successfully.");

db.close();