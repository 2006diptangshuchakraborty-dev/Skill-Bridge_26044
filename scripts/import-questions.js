import XLSX from "xlsx";
import pg from "pg";

const { Client } = pg;

const EXCEL_FILE =
  "./scripts/Software_MCQ_Question_Bank_Final.xlsx";

const SHEET_NAME = "Software_MCQs";

async function main() {
  console.log("=================================");
  console.log("MCQ EXCEL IMPORT");
  console.log("=================================");
  console.log("");

  // --------------------------------------------------
  // 1. Check DATABASE_URL
  // --------------------------------------------------

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not available."
    );
  }

  console.log("Database URL found.");

  // --------------------------------------------------
  // 2. Read Excel file
  // --------------------------------------------------

  console.log("Reading Excel file...");

  const workbook = XLSX.readFile(EXCEL_FILE);

  if (!workbook.SheetNames.includes(SHEET_NAME)) {
    throw new Error(
      `Sheet "${SHEET_NAME}" was not found.\n` +
      `Available sheets: ${workbook.SheetNames.join(", ")}`
    );
  }

  const worksheet =
    workbook.Sheets[SHEET_NAME];

  const rows = XLSX.utils.sheet_to_json(
    worksheet,
    {
      defval: "",
    }
  );

  console.log(`Found ${rows.length} rows.`);

  if (rows.length === 0) {
    throw new Error(
      "The Excel sheet contains no questions."
    );
  }

  // --------------------------------------------------
  // 3. Validate Excel columns
  // --------------------------------------------------

  const requiredColumns = [
    "id",
    "field",
    "subject",
    "question_statement",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "correct_answer",
  ];

  const firstRow = rows[0];

  for (const column of requiredColumns) {
    if (!(column in firstRow)) {
      throw new Error(
        `Missing Excel column: ${column}`
      );
    }
  }

  console.log("Excel columns validated.");

  // --------------------------------------------------
  // 4. Prepare questions
  // --------------------------------------------------

  const questions = rows.map((row, index) => {
    const excelRow = index + 2;

    const sourceId =
      String(row.id || "").trim();

    const field =
      String(row.field || "").trim();

    const subject =
      String(row.subject || "").trim();

    const questionStatement =
      String(row.question_statement || "").trim();

    const optionA =
      String(row.option_a || "").trim();

    const optionB =
      String(row.option_b || "").trim();

    const optionC =
      String(row.option_c || "").trim();

    const optionD =
      String(row.option_d || "").trim();

    const correctAnswer =
      String(row.correct_answer || "").trim();

    // Validate required values
    if (!sourceId) {
      throw new Error(
        `Missing id at Excel row ${excelRow}`
      );
    }

    if (!field) {
      throw new Error(
        `Missing field for ${sourceId}`
      );
    }

    if (!subject) {
      throw new Error(
        `Missing subject for ${sourceId}`
      );
    }

    if (!questionStatement) {
      throw new Error(
        `Missing question_statement for ${sourceId}`
      );
    }

    if (!optionA) {
      throw new Error(
        `Missing option_a for ${sourceId}`
      );
    }

    if (!optionB) {
      throw new Error(
        `Missing option_b for ${sourceId}`
      );
    }

    if (!optionC) {
      throw new Error(
        `Missing option_c for ${sourceId}`
      );
    }

    if (!optionD) {
      throw new Error(
        `Missing option_d for ${sourceId}`
      );
    }

    if (!correctAnswer) {
      throw new Error(
        `Missing correct_answer for ${sourceId}`
      );
    }

    return {
      sourceId,
      field,
      subject,
      questionStatement,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
    };
  });

  console.log(
    `Validated ${questions.length} questions.`
  );

  // --------------------------------------------------
  // 5. Check duplicate IDs inside Excel
  // --------------------------------------------------

  const sourceIds = new Set();

  for (const question of questions) {
    if (sourceIds.has(question.sourceId)) {
      throw new Error(
        `Duplicate Excel ID found: ${question.sourceId}`
      );
    }

    sourceIds.add(question.sourceId);
  }

  console.log("No duplicate Excel IDs found.");

  // --------------------------------------------------
  // 6. Connect to Neon
  // --------------------------------------------------

  console.log("Connecting to Neon...");

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();

  console.log("Connected to database.");

  try {
    // ------------------------------------------------
    // 7. Verify table exists
    // ------------------------------------------------

    const tableCheck =
      await client.query(`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'mcq_questions'
        ) AS exists;
      `);

    if (!tableCheck.rows[0].exists) {
      throw new Error(
        "mcq_questions table does not exist."
      );
    }

    console.log(
      "mcq_questions table verified."
    );

    // ------------------------------------------------
    // 8. Insert questions
    // ------------------------------------------------

    console.log("");
    console.log("Starting import...");
    console.log("");

    let inserted = 0;
    let skipped = 0;

    await client.query("BEGIN");

    for (const question of questions) {
      const result = await client.query(
        `
        INSERT INTO public.mcq_questions (
          source_id,
          field,
          subject,
          question_statement,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_answer
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9
        )
        ON CONFLICT (source_id)
        DO NOTHING
        `,
        [
          question.sourceId,
          question.field,
          question.subject,
          question.questionStatement,
          question.optionA,
          question.optionB,
          question.optionC,
          question.optionD,
          question.correctAnswer,
        ]
      );

      if (result.rowCount === 1) {
        inserted++;
      } else {
        skipped++;
      }

      if (
        (inserted + skipped) % 100 === 0
      ) {
        console.log(
          `Processed ${
            inserted + skipped
          } / ${questions.length}`
        );
      }
    }

    await client.query("COMMIT");

    console.log("");
    console.log("=================================");
    console.log("IMPORT COMPLETED");
    console.log("=================================");
    console.log(
      `Excel rows : ${questions.length}`
    );
    console.log(
      `Inserted   : ${inserted}`
    );
    console.log(
      `Skipped    : ${skipped}`
    );
    console.log("");

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("");
    console.error(
      "Import failed. Database changes rolled back."
    );

    throw error;

  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("");
  console.error("ERROR:");
  console.error(error.message);

  process.exit(1);
});