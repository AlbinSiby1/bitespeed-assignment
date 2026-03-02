# Bitespeed Identity Reconciliation Service

This service identifies and consolidates customer identities across multiple purchases based on shared **email** or **phoneNumber**.

It implements the `/identify` endpoint as described in the assignment.

---

## Tech Stack

* Node.js
* Express
* TypeScript
* PostgreSQL
* pg (node-postgres)
* Render (deployment)

---

# Problem Overview

Each customer can have multiple `Contact` records.

Contacts are linked if they share:

* the same **email**, or
* the same **phoneNumber**

Within a linked group:

* The **oldest contact** is marked as `"primary"`
* All others are `"secondary"`
* All secondaries reference the primary via `linkedId`

The `/identify` endpoint:

* Creates a new primary if no match exists
* Creates a secondary if new information appears
* Merges two primary groups when a request connects them
* Returns a consolidated response

---

# Database Schema

## Table: `Contact`

Created using:

```sql
CREATE TABLE IF NOT EXISTS Contact (
  id SERIAL PRIMARY KEY,
  phoneNumber TEXT,
  email TEXT,
  linkedId INT REFERENCES Contact(id),
  linkPrecedence TEXT CHECK (linkPrecedence IN ('primary','secondary')) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP
);
```

---

# Indexes

To optimize lookup performance, the following indexes were created:

```sql
CREATE INDEX idx_contact_email ON Contact(email);
CREATE INDEX idx_contact_phone ON Contact(phoneNumber);
CREATE INDEX idx_contact_linkedId ON Contact(linkedId);
```

# API Specification

## Endpoint

```
POST /identify
```

### Request Body

```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```

At least one field must be provided.

---

## Response Format

```json
{
  "contact": {
    "primaryContactId": number,
    "emails": ["string"],
    "phoneNumbers": ["string"],
    "secondaryContactIds": [number]
  }
}
```

---

# Running Locally

## Install dependencies

```
npm install
```

## Create `.env`

```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

For local PostgreSQL:

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/bitespeed
```

## Run

```
npm run dev
```

Server runs at:

```
http://localhost:3000
```

---
