import express from 'express'
import path from 'node:path'
import { db } from './db/index.js'
import { eq, hasOwnEntityKind } from 'drizzle-orm'
import { usersTable } from './db/schema.js'
import crypto from 'node:crypto'
import { PRIVATE_KEY, PUBLIC_KEY } from './utils/cert.js'
import JWT from 'jsonwebtoken'
import jose from 'node-jose'
import type { JWTClaims } from './utils/user-token.js'
import { Server } from 'socket.io'
import http from "node:http"
import { publisher, subscriber } from './config/redis-config.js'
import cookieParser from 'cookie-parser'

const PORT = process.env.PORT ?? 8080

const app = express()
app.use(express.json())
app.use(cookieParser())

const server = http.createServer(app)
const io = new Server(server)

type updateData = {
  id: string;
  check: boolean
}

// Authentication middleware
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.cookies.auth_token;
  
  if (!token) {
    return res.redirect('/o/authenticate');
  }

  try {
    const decoded = JWT.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] }) as JWTClaims;

    if(!decoded){
      res.status(401).json({
        message: "Unauthorized"
      })
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.clearCookie('auth_token');
    return res.redirect('/o/authenticate');
  }
};

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTClaims;
    }
  }
}

// redis sub
await subscriber.subscribe("internal-server:check-update")
subscriber.on("message", (channel, data)=>{
  if(channel === "internal-server:check-update"){
    const parsed : updateData = JSON.parse(data)
    io.emit("server:check-update", JSON.parse(data))
  }
})

// In-memory storage for checkbox states
const checkboxStates = new Set<string>()

// socket updates
io.on("connection", (socket)=>{
  console.log("socket io runs")

  socket.on("client:check-update", async (data)=>{
    console.log(data)
    // checkboxStates.add(data.id)
    // console.log(checkboxStates)
    await publisher.publish("internal-server:check-update", JSON.stringify(data))
  })
})



// Get checkbox states
app.get("/api/checkboxes", (req, res)=>{
    res.json({
        checked: Array.from(checkboxStates)
    })
})

// Get user info endpoint
app.get("/api/user-info", requireAuth, (req, res) => {
  res.json({
    user: {
      name: req.user?.name,
      email: req.user?.email,
      sub: req.user?.sub
    }
  });
});

// 
app.get("/health", (req, res)=>{
    res.json({
        status: "ok"
    })
})

app.get("/", (req, res)=>{
    res.json({
        message: "auth server"
    })
})

// oidc discovery

app.get("/.well-known/openid-configuration", (req, res)=>{
  const ISSUER = `http://localhost:${PORT}`
  res.json({
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/o/authenticate`,
    userinfo_endpoint: `${ISSUER}/o/user-info`,
    jwks_uri: `${ISSUER}/well-known/jwks.json`
  })
})

// jwks
app.get("/well-known/jwks.json", async (req, res)=>{
  const key = await jose.JWK.asKey(PUBLIC_KEY, "pem")
  res.json({keys : [key.toJSON()]})
})

app.get("/sign-up", (req, res)=>{
  res.sendFile(path.resolve("public", "sign-up.html"))
})

// auth
app.get("/o/authenticate", (req, res)=>{
  res.sendFile(path.resolve("public", "authenticate.html"))
})

// checkboxes
app.get("/checkboxes", requireAuth, (req, res)=>{
  res.sendFile(path.resolve("public", "checkboxes.html"))
})

// reg
app.post("/o/authenticate/sign-in", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required." });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user || !user.password || !user.salt) {
    res.status(401).json({ message: "Invalid email or password." });
    return;
  }

  const hash = crypto
    .createHash("sha256")
    .update(password + user.salt)
    .digest("hex");

  if (hash !== user.password) {
    res.status(401).json({ message: "Invalid email or password." });
    return;
  }

  const ISSUER = `http://localhost:${PORT}`;
  const now = Math.floor(Date.now() / 1000);

  const claims : JWTClaims = {
    iss: ISSUER,
    sub: user.id,
    email: user.email,
    email_verified: String(user.emailVerified),
    exp: now + 3600,
    given_name: user.firstName as string,
    family_name: user.lastName as string,
    name: [user.firstName, user.lastName].filter(Boolean).join(" "),
    picture: user.profileImageUrl as string,
  };

  const token = JWT.sign(claims, PRIVATE_KEY, { algorithm: "RS256" });

  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    maxAge: 3600 * 1000, // 1 hour
    sameSite: 'lax'
  });

  res.json({ message: "Authenticated successfully" });
});

app.post("/o/authenticate/sign-up", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!email || !password || !firstName) {
    res
      .status(400)
      .json({ message: "First name, email, and password are required." });
    return;
  }

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing) {
    res
      .status(409)
      .json({ message: "An account with this email already exists." });
    return;
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .createHash("sha256")
    .update(password + salt)
    .digest("hex");

  await db.insert(usersTable).values({
    firstName,
    lastName: lastName ?? null,
    email,
    password: hash,
    salt,
  });

  res.status(201).json({ ok: true });
});


server.listen(PORT, ()=>{
    console.log("Up and running on " + PORT)
})