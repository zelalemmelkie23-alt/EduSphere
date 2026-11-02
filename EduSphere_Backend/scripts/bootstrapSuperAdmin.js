const readline = require("node:readline");
const bcrypt = require("bcryptjs");
const database = require("../src/config/database");

function ask(question) {
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => prompt.question(question, (answer) => {
    prompt.close();
    resolve(answer.trim());
  }));
}

function askPassword(label) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Run this command in an interactive terminal so the password can be entered without echo.");
  }

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdout.write(label);

  return new Promise((resolve, reject) => {
    let value = "";
    function finish(error) {
      process.stdin.removeListener("keypress", onKeypress);
      process.stdin.setRawMode(false);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    }

    function onKeypress(character, key) {
      if (key.ctrl && key.name === "c") {
        finish(new Error("Bootstrap cancelled."));
      } else if (key.name === "return") {
        finish();
      } else if (key.name === "backspace") {
        value = value.slice(0, -1);
        process.stdout.write("\b \b");
      } else if (character && !key.ctrl && !key.meta) {
        value += character;
        process.stdout.write("*");
      }
    }

    process.stdin.on("keypress", onKeypress);
  });
}

async function main() {
  const fullName = await ask("Administrator full name: ");
  const email = (await ask("Administrator email: ")).toLowerCase();
  const password = await askPassword("Password (min 12 characters): ");
  const confirmation = await askPassword("Confirm password: ");
  if (password !== confirmation) throw new Error("Passwords do not match.");
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("Password must be at least 12 characters and no more than 72 bytes.");
  }
  if (!fullName || fullName.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) {
    throw new Error("Enter a valid name and email address.");
  }

  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    const [roles] = await connection.query("SELECT id FROM roles WHERE name = 'Super Admin' FOR UPDATE");
    if (!roles[0]) throw new Error("System roles are missing. Apply migration 001 before bootstrapping.");
    const [admins] = await connection.query(
      `SELECT u.id
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       WHERE ur.role_id = ? AND u.is_active = TRUE
       FOR UPDATE`,
      [roles[0].id]
    );
    if (admins.length) throw new Error("An active Super Admin already exists; bootstrap is only for first-time setup.");

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await connection.query(
      `INSERT INTO users (full_name, email, password_hash, preferred_language, is_active)
       VALUES (?, ?, ?, 'en', TRUE)`,
      [fullName, email, passwordHash]
    );
    await connection.query(
      "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
      [result.insertId, roles[0].id]
    );
    await connection.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, summary)
       VALUES (?, 'user.bootstrap', 'user', ?, JSON_OBJECT('role', 'Super Admin'))`,
      [result.insertId, result.insertId]
    );
    await connection.commit();
    process.stdout.write(`Created the initial Super Admin account for ${email}.\n`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

main()
  .catch((error) => {
    console.error("Super Admin bootstrap failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => database.end());
