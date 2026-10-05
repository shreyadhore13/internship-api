# Internship Board REST API

A beginner-friendly REST API built with Node.js, Express, and SQLite for managing internship records and applications.

## Project Overview

This project provides an API for a fictional student internship board.

The API supports:

- Listing internships
- Searching internships
- Filtering by domain and work mode
- Viewing internship details
- Creating internships
- Updating internships
- Deleting internships
- Submitting internship applications
- Validating applicant information
- Preventing duplicate applications
- Pagination
- SQLite persistent storage

## Technologies Used

- Node.js
- Express.js
- SQLite
- better-sqlite3
- JavaScript
- PowerShell for API testing

## Project Structure

```text
internship-api/
│
├── database/
│   ├── init.js
│   └── internship.db
│
├── server.js
├── package.json
├── package-lock.json
└── README.md