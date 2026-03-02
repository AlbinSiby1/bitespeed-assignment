import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool } from "./db";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post("/identify", async (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({
      error: "Either email or phoneNumber must be provided",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const matchResult = await client.query(
      `
      SELECT * FROM Contact
      WHERE (email = $1 OR phoneNumber = $2)
      AND deletedAt IS NULL
      `,
      [email || null, phoneNumber || null]
    );

    if (matchResult.rows.length === 0) {
      const insert = await client.query(
        `
        INSERT INTO Contact (email, phoneNumber, linkPrecedence)
        VALUES ($1, $2, 'primary')
        RETURNING *
        `,
        [email || null, phoneNumber || null]
      );

      await client.query("COMMIT");

      return res.json({
        contact: {
          primaryContactId: insert.rows[0].id,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber] : [],
          secondaryContactIds: [],
        },
      });
    }

    const rootCandidates = matchResult.rows.map(row =>
      row.linkprecedence === "primary" ? row.id : row.linkedid
    );

    const rootId = Math.min(...rootCandidates);

    for (const row of matchResult.rows) {
      const candidateRoot =
        row.linkprecedence === "primary" ? row.id : row.linkedid;

      if (candidateRoot !== rootId) {
        await client.query(
          `
          UPDATE Contact
          SET linkPrecedence = 'secondary',
              linkedId = $1,
              updatedAt = CURRENT_TIMESTAMP
          WHERE id = $2
          `,
          [rootId, candidateRoot]
        );

        await client.query(
          `
          UPDATE Contact
          SET linkedId = $1,
              updatedAt = CURRENT_TIMESTAMP
          WHERE linkedId = $2
          `,
          [rootId, candidateRoot]
        );
      }
    }

    const groupResult = await client.query(
      `
      SELECT * FROM Contact
      WHERE id = $1 OR linkedId = $1
      ORDER BY createdAt ASC
      `,
      [rootId]
    );

    const contacts = groupResult.rows;

    const emailExists =
      email ? contacts.some(c => c.email === email) : true;

    const phoneExists =
      phoneNumber ? contacts.some(c => c.phonenumber === phoneNumber) : true;

    if (
      (email && !emailExists) ||
      (phoneNumber && !phoneExists)
    ) {
      await client.query(
        `
        INSERT INTO Contact (email, phoneNumber, linkPrecedence, linkedId)
        VALUES ($1, $2, 'secondary', $3)
        `,
        [email || null, phoneNumber || null, rootId]
      );
    }

    const finalResult = await client.query(
      `
      SELECT * FROM Contact
      WHERE id = $1 OR linkedId = $1
      ORDER BY createdAt ASC
      `,
      [rootId]
    );

    const finalContacts = finalResult.rows;

    const emails = [
      ...new Set(finalContacts.map(c => c.email).filter(Boolean)),
    ];

    const phoneNumbers = [
      ...new Set(finalContacts.map(c => c.phonenumber).filter(Boolean)),
    ];

    const secondaryContactIds = finalContacts
      .filter(c => c.linkprecedence === "secondary")
      .map(c => c.id);

    await client.query("COMMIT");

    return res.json({
      contact: {
        primaryContactId: rootId,
        emails,
        phoneNumbers,
        secondaryContactIds,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});