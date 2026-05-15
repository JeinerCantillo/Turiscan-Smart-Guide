import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { JWT_SECRET, authenticateUser } from "../middleware/auth";

const router: IRouter = Router();
const ADMIN_CODE = process.env.ADMIN_CODE ?? "TURISCAN_ADMIN_2024";

router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, name, adminCode } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "validation", message: "Email, contraseña y nombre son requeridos" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "validation", message: "La contraseña debe tener al menos 6 caracteres" });
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
    if (existing.length > 0) {
      return res.status(400).json({ error: "conflict", message: "Este correo ya está registrado" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const role = adminCode === ADMIN_CODE ? "admin" : "visitor";

    const [user] = await db.insert(usersTable).values({
      email: email.toLowerCase(),
      passwordHash,
      name,
      role,
    }).returning({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role, avatarUrl: usersTable.avatarUrl });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "30d" });

    res.status(201).json({ token, user });
  } catch (err) {
    req.log.error({ err }, "Register failed");
    res.status(500).json({ error: "internal_error", message: "Error al registrar usuario" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "validation", message: "Email y contraseña requeridos" });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
    if (!user) {
      return res.status(401).json({ error: "unauthorized", message: "Credenciales incorrectas" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "unauthorized", message: "Credenciales incorrectas" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "30d" });

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl } });
  } catch (err) {
    req.log.error({ err }, "Login failed");
    res.status(500).json({ error: "internal_error", message: "Error al iniciar sesión" });
  }
});

router.get("/auth/me", authenticateUser, async (req, res) => {
  try {
    const [user] = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      avatarUrl: usersTable.avatarUrl,
    }).from(usersTable).where(eq(usersTable.id, req.user!.id));

    if (!user) return res.status(404).json({ error: "not_found", message: "Usuario no encontrado" });
    res.json(user);
  } catch (err) {
    req.log.error({ err }, "Get me failed");
    res.status(500).json({ error: "internal_error", message: "Error" });
  }
});

export default router;
