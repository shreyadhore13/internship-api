const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

const db = new Database(
    path.join(__dirname, "database", "internship.db")
);

db.pragma("foreign_keys = ON");

app.use(express.json());

/* =========================
   RESPONSE HELPERS
========================= */

function successResponse(data, pagination = null) {
    return {
        status: "success",
        data,
        pagination
    };
}

function errorResponse(message, details = null) {
    return {
        status: "error",
        error: {
            message,
            details
        }
    };
}


/* =========================
   VALIDATION HELPERS
========================= */

function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

}

function isValidInternshipId(id) {

    return (
        typeof id === "string" &&
        /^INT-\d+$/.test(id)
    );

}

function validateInternship(data) {

    const errors = [];

    if (
        !data.title ||
        typeof data.title !== "string" ||
        !data.title.trim()
    ) {
        errors.push("Title is required.");
    }

    if (
        !data.domain ||
        typeof data.domain !== "string" ||
        !data.domain.trim()
    ) {
        errors.push("Domain is required.");
    }

    if (
        !data.mode ||
        typeof data.mode !== "string" ||
        !data.mode.trim()
    ) {
        errors.push("Mode is required.");
    }

    if (
        data.duration_weeks === undefined ||
        !Number.isInteger(data.duration_weeks) ||
        data.duration_weeks <= 0
    ) {
        errors.push(
            "duration_weeks must be a positive integer."
        );
    }

    if (
        data.applications_open !== undefined &&
        ![0, 1, true, false].includes(
            data.applications_open
        )
    ) {
        errors.push(
            "applications_open must be 0, 1, true, or false."
        );
    }

    return errors;

}


/* =========================
   HEALTH CHECK
========================= */

app.get("/", (req, res) => {

    res.json(
        successResponse({
            message: "Internship API is running."
        })
    );

});


/* =========================
   LIST INTERNSHIPS
========================= */

app.get("/api/internships", (req, res) => {

    const page = Math.max(
        parseInt(req.query.page) || 1,
        1
    );

    const limit = Math.min(
        Math.max(
            parseInt(req.query.limit) || 10,
            1
        ),
        50
    );

    const offset =
        (page - 1) * limit;


    const search =
        typeof req.query.search === "string"
            ? req.query.search.trim()
            : "";


    const domain =
        typeof req.query.domain === "string"
            ? req.query.domain.trim()
            : "";


    const mode =
        typeof req.query.mode === "string"
            ? req.query.mode.trim()
            : "";


    const conditions = [];

    const params = {};


    if (search) {

        conditions.push(`
            (
                title LIKE @search
                OR domain LIKE @search
                OR mode LIKE @search
            )
        `);

        params.search = `%${search}%`;

    }


    if (domain) {

        conditions.push(
            "domain = @domain"
        );

        params.domain = domain;

    }


    if (mode) {

        conditions.push(
            "mode = @mode"
        );

        params.mode = mode;

    }


    const whereClause =
        conditions.length > 0
            ? `WHERE ${conditions.join(" AND ")}`
            : "";


    const totalResult =
        db.prepare(`
            SELECT COUNT(*) AS total
            FROM internships
            ${whereClause}
        `).get(params);


    const total =
        totalResult.total;


    const internships =
        db.prepare(`
            SELECT
                id,
                title,
                domain,
                mode,
                duration_weeks,
                applications_open
            FROM internships
            ${whereClause}
            ORDER BY id
            LIMIT @limit
            OFFSET @offset
        `).all({
            ...params,
            limit,
            offset
        });


    const totalPages =
        Math.ceil(total / limit);


    res.json(
        successResponse(
            internships,
            {
                page,
                limit,
                total,
                totalPages
            }
        )
    );

});


/* =========================
   GET SINGLE INTERNSHIP
========================= */

app.get("/api/internships/:id", (req, res) => {

    const { id } = req.params;


    if (!isValidInternshipId(id)) {

        return res.status(400).json(
            errorResponse(
                "Invalid internship ID."
            )
        );

    }


    const internship =
        db.prepare(`
            SELECT
                id,
                title,
                domain,
                mode,
                duration_weeks,
                applications_open
            FROM internships
            WHERE id = ?
        `).get(id);


    if (!internship) {

        return res.status(404).json(
            errorResponse(
                "Internship not found."
            )
        );

    }


    res.json(
        successResponse(
            internship
        )
    );

});


/* =========================
   CREATE INTERNSHIP
========================= */

app.post("/api/internships", (req, res) => {

    const data = req.body;


    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
    ) {

        return res.status(400).json(
            errorResponse(
                "Request body must be a JSON object."
            )
        );

    }


    const errors =
        validateInternship(data);


    if (errors.length > 0) {

        return res.status(400).json(
            errorResponse(
                "Validation failed.",
                errors
            )
        );

    }


    const id =
        data.id ||
        `INT-${Date.now()}`;


    if (!isValidInternshipId(id)) {

        return res.status(400).json(
            errorResponse(
                "Invalid internship ID."
            )
        );

    }


    try {

        db.prepare(`
            INSERT INTO internships
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
        `).run({

            id,

            title:
                data.title.trim(),

            domain:
                data.domain.trim(),

            mode:
                data.mode.trim(),

            duration_weeks:
                data.duration_weeks,

            applications_open:
                data.applications_open === undefined
                    ? 1
                    : Number(
                        Boolean(
                            data.applications_open
                        )
                    )

        });


        const created =
            db.prepare(`
                SELECT
                    id,
                    title,
                    domain,
                    mode,
                    duration_weeks,
                    applications_open
                FROM internships
                WHERE id = ?
            `).get(id);


        return res.status(201).json(
            successResponse(
                created
            )
        );

    } catch (error) {

        if (
            error.code ===
            "SQLITE_CONSTRAINT_PRIMARYKEY"
        ) {

            return res.status(409).json(
                errorResponse(
                    "An internship with this ID already exists."
                )
            );

        }


        console.error(
            "Create internship error:",
            error.message
        );


        return res.status(500).json(
            errorResponse(
                "Internal server error."
            )
        );

    }

});


/* =========================
   UPDATE INTERNSHIP
========================= */

app.put("/api/internships/:id", (req, res) => {

    const { id } = req.params;


    if (!isValidInternshipId(id)) {

        return res.status(400).json(
            errorResponse(
                "Invalid internship ID."
            )
        );

    }


    const data = req.body;


    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
    ) {

        return res.status(400).json(
            errorResponse(
                "Request body must be a JSON object."
            )
        );

    }


    const errors =
        validateInternship(data);


    if (errors.length > 0) {

        return res.status(400).json(
            errorResponse(
                "Validation failed.",
                errors
            )
        );

    }


    const existing =
        db.prepare(`
            SELECT id
            FROM internships
            WHERE id = ?
        `).get(id);


    if (!existing) {

        return res.status(404).json(
            errorResponse(
                "Internship not found."
            )
        );

    }


    db.prepare(`
        UPDATE internships

        SET
            title = @title,
            domain = @domain,
            mode = @mode,
            duration_weeks = @duration_weeks,
            applications_open = @applications_open

        WHERE id = @id
    `).run({

        id,

        title:
            data.title.trim(),

        domain:
            data.domain.trim(),

        mode:
            data.mode.trim(),

        duration_weeks:
            data.duration_weeks,

        applications_open:
            data.applications_open === undefined
                ? 1
                : Number(
                    Boolean(
                        data.applications_open
                    )
                )

    });


    const updated =
        db.prepare(`
            SELECT
                id,
                title,
                domain,
                mode,
                duration_weeks,
                applications_open
            FROM internships
            WHERE id = ?
        `).get(id);


    res.json(
        successResponse(
            updated
        )
    );

});


/* =========================
   DELETE INTERNSHIP
========================= */

app.delete("/api/internships/:id", (req, res) => {

    const { id } = req.params;


    if (!isValidInternshipId(id)) {

        return res.status(400).json(
            errorResponse(
                "Invalid internship ID."
            )
        );

    }


    const existing =
        db.prepare(`
            SELECT id
            FROM internships
            WHERE id = ?
        `).get(id);


    if (!existing) {

        return res.status(404).json(
            errorResponse(
                "Internship not found."
            )
        );

    }


    db.prepare(`
        DELETE FROM internships
        WHERE id = ?
    `).run(id);


    res.json(
        successResponse({
            message:
                "Internship deleted successfully."
        })
    );

});


/* =========================
   CREATE APPLICATION
========================= */

app.post(
    "/api/internships/:id/applications",
    (req, res) => {

        const { id } = req.params;

        const {
            applicant_name,
            applicant_email
        } = req.body || {};


        if (!isValidInternshipId(id)) {

            return res.status(400).json(
                errorResponse(
                    "Invalid internship ID."
                )
            );

        }


        if (
            !applicant_name ||
            typeof applicant_name !== "string" ||
            !applicant_name.trim()
        ) {

            return res.status(400).json(
                errorResponse(
                    "Applicant name is required."
                )
            );

        }


        if (
            !applicant_email ||
            typeof applicant_email !== "string" ||
            !isValidEmail(
                applicant_email.trim()
            )
        ) {

            return res.status(400).json(
                errorResponse(
                    "A valid applicant email is required."
                )
            );

        }


        const internship =
            db.prepare(`
                SELECT
                    id,
                    applications_open
                FROM internships
                WHERE id = ?
            `).get(id);


        if (!internship) {

            return res.status(404).json(
                errorResponse(
                    "Internship not found."
                )
            );

        }


        if (!internship.applications_open) {

            return res.status(409).json(
                errorResponse(
                    "Applications are closed for this internship."
                )
            );

        }


        try {

            const result =
                db.prepare(`
                    INSERT INTO applications
                    (
                        internship_id,
                        applicant_name,
                        applicant_email
                    )
                    VALUES
                    (
                        @internship_id,
                        @applicant_name,
                        @applicant_email
                    )
                `).run({

                    internship_id:
                        id,

                    applicant_name:
                        applicant_name.trim(),

                    applicant_email:
                        applicant_email
                            .trim()
                            .toLowerCase()

                });


            return res.status(201).json(
                successResponse({
                    id: result.lastInsertRowid,
                    internship_id: id,
                    message:
                        "Application submitted successfully."
                })
            );

        } catch (error) {

            if (
                error.code ===
                "SQLITE_CONSTRAINT_UNIQUE"
            ) {

                return res.status(409).json(
                    errorResponse(
                        "Duplicate application. This email has already been used for this internship."
                    )
                );

            }


            console.error(
                "Application error:",
                error.message
            );


            return res.status(500).json(
                errorResponse(
                    "Internal server error."
                )
            );

        }

    }
);


/* =========================
   404 HANDLER
========================= */

app.use((req, res) => {

    res.status(404).json(
        errorResponse(
            "Endpoint not found."
        )
    );

});


/* =========================
   ERROR HANDLER
========================= */

app.use((error, req, res, next) => {

    console.error(
        "Server error:",
        error.message
    );


    res.status(500).json(
        errorResponse(
            "Internal server error."
        )
    );

});


/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {

    console.log(
        `Internship API running at http://localhost:${PORT}`
    );

});