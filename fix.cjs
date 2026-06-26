const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// 1. Add imports
content = content.replace(
  'import { GoogleGenAI } from "@google/genai";',
  'import { GoogleGenAI } from "@google/genai";\nimport * as admin from "firebase-admin";\nimport bcrypt from "bcrypt";\nimport jwt from "jsonwebtoken";\n\nif (!admin.apps.length) {\n  admin.initializeApp();\n}\nconst firestore = admin.firestore();'
);

// 2. Remove DB_PATH
content = content.replace(
  'const DB_PATH = path.join(process.cwd(), "db.json");',
  ''
);

// 3. Update Database interface
content = content.replace(
  'interface Database {\n  config: {',
  'interface User {\n  id: string;\n  username: string;\n  passwordHash: string;\n  role: string;\n  isActive: boolean;\n}\n\ninterface Database {\n  users: User[];\n  config: {'
);

content = content.replace(
  '    passwordHash: string;\n',
  ''
);

// Remove smsLogs
const startSmsLogs = content.indexOf('smsLogs?: Array<{');
if (startSmsLogs !== -1) {
  const endSmsLogs = content.indexOf('}>;', startSmsLogs) + 3;
  content = content.slice(0, startSmsLogs) + content.slice(endSmsLogs + 1); // remove newline
}

// 4. loadDB
const loadDBStr = `async function loadDB(): Promise<Database> {
  const doc = await firestore.collection('system').doc('main').get();
  if (!doc.exists) {
    const defaultPassword = await bcrypt.hash('admin123', 10);
    const initialDB: Database = {
      users: [{
        id: 'admin',
        username: 'admin',
        passwordHash: defaultPassword,
        role: 'admin',
        isActive: true
      }],
      config: {
        schoolName: "Lions Primary School",
        schoolMotto: "Strive for Excellence",
        classTeacher: "Mr. Odhiambo",
        className: "Grade 8 Blue",
        term: "TERM 2",
        jwtSecret: crypto.randomBytes(32).toString('hex'),
        assessments: DEFAULT_ASSESSMENTS
      },
      learners: DEFAULT_LEARNERS.map((l, i) => ({
        id: \`student-\${i + 1}\`,
        name: l.name,
        admissionNumber: l.admissionNumber,
        parentPhone: \`0712345\${String(100 + i + 1).slice(1)}\`
      })),
      marks: { opener: {}, midterm: {}, endterm: {} },
      remarks: {}
    };
    await firestore.collection('system').doc('main').set(initialDB);
    return initialDB;
  }
  return doc.data() as Database;
}`;

// find loadDB and replace it
const startLoadDB = content.indexOf('function loadDB(): Database {');
const startSaveDB = content.indexOf('function saveDB(db: Database) {');
if (startLoadDB !== -1 && startSaveDB !== -1) {
  content = content.slice(0, startLoadDB) + loadDBStr + '\n\n' + content.slice(startSaveDB);
}

// 5. saveDB
const saveDBStr = `async function saveDB(db: Database): Promise<void> {
  await firestore.collection('system').doc('main').set(db);
}`;
const endSaveDB = content.indexOf('}', startSaveDB) + 1;
content = content.slice(0, content.indexOf('function saveDB(db: Database) {')) + saveDBStr + '\n' + content.slice(endSaveDB);

// 6. fix requireAuth
const requireAuthStr = `async function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized. Missing token." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const db = await loadDB();
    const decoded = jwt.verify(token, db.config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized. Invalid token." });
  }
}`;
const startAuth = content.indexOf('function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {');
const endAuth = content.indexOf('}', startAuth) + 1;
content = content.slice(0, startAuth) + requireAuthStr + content.slice(endAuth);

// 7. fix routes to be async and await loadDB
content = content.replace(/app\.(get|post|put|delete)\("([^"]+)", (requireAuth, )?\(req, res\) => {/g, 'app.$1("$2", $3async (req, res) => {');
content = content.replace(/const db = loadDB\(\);/g, 'const db = await loadDB();');

// 8. fix saveDB calls
content = content.replace(/saveDB\(db\);/g, 'await saveDB(db);');

// 9. rewrite login route
const loginStart = content.indexOf('app.post("/api/auth/login", async (req, res) => {');
if (loginStart !== -1) {
  const loginEnd = content.indexOf('});', loginStart) + 3;
  const loginStr = `app.post("/api/auth/login", async (req, res) => {
  const { username = "admin", password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }
  const db = await loadDB();
  const user = db.users.find(u => u.username === username);
  
  if (user && user.isActive && await bcrypt.compare(password, user.passwordHash)) {
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, db.config.jwtSecret, { expiresIn: '24h' });
    return res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role },
      config: {
        schoolName: db.config.schoolName,
        schoolMotto: db.config.schoolMotto,
        classTeacher: db.config.classTeacher,
        className: db.config.className,
        term: db.config.term || "MID-TERM (TERM 2)"
      }
    });
  }
  return res.status(401).json({ error: "Incorrect credentials" });
});`;
  content = content.slice(0, loginStart) + loginStr + content.slice(loginEnd);
}

// 10. rewrite change password
const cpStart = content.indexOf('app.post("/api/auth/change-password", requireAuth, async (req, res) => {');
if (cpStart !== -1) {
  const cpEnd = content.indexOf('});', cpStart) + 3;
  const cpStr = `app.post("/api/auth/change-password", requireAuth, async (req: any, res: any) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new passwords required" });
  }
  const db = await loadDB();
  const userId = req.user.id;
  const user = db.users.find(u => u.id === userId);
  
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return res.status(400).json({ error: "Incorrect current password" });
  }
  
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await saveDB(db);
  res.json({ success: true });
});`;
  content = content.slice(0, cpStart) + cpStr + content.slice(cpEnd);
}

// 11. remove SMS routes
const smsGet = content.indexOf('app.get("/api/sms/logs",');
if (smsGet !== -1) {
  const smsEnd = content.indexOf('// -------------------------------------------------------------', smsGet);
  if (smsEnd !== -1) {
    content = content.slice(0, smsGet) + content.slice(smsEnd);
  }
}

// 12. Add User Management routes
const userMgmt = `
// -------------------------------------------------------------
// USER MANAGEMENT API
// -------------------------------------------------------------

app.get("/api/users", requireAuth, async (req: any, res: any) => {
  if (req.user.role !== 'admin') return res.status(403).json({error: "Admin only"});
  const db = await loadDB();
  res.json(db.users.map(u => ({ id: u.id, username: u.username, role: u.role, isActive: u.isActive })));
});

app.post("/api/users", requireAuth, async (req: any, res: any) => {
  if (req.user.role !== 'admin') return res.status(403).json({error: "Admin only"});
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({error: "Username and password required"});
  
  const db = await loadDB();
  if (db.users.find(u => u.username === username)) {
    return res.status(400).json({error: "Username already exists"});
  }
  
  const newUser = {
    id: "user-" + Date.now(),
    username,
    passwordHash: await bcrypt.hash(password, 10),
    role: role || 'teacher',
    isActive: true
  };
  db.users.push(newUser);
  await saveDB(db);
  res.json({ id: newUser.id, username: newUser.username, role: newUser.role, isActive: newUser.isActive });
});

app.put("/api/users/:id", requireAuth, async (req: any, res: any) => {
  if (req.user.role !== 'admin') return res.status(403).json({error: "Admin only"});
  const { id } = req.params;
  const { password, role, isActive } = req.body;
  
  const db = await loadDB();
  const user = db.users.find(u => u.id === id);
  if (!user) return res.status(404).json({error: "User not found"});
  
  if (password) user.passwordHash = await bcrypt.hash(password, 10);
  if (role) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  
  await saveDB(db);
  res.json({ id: user.id, username: user.username, role: user.role, isActive: user.isActive });
});

`;

content = content.replace('// -------------------------------------------------------------', userMgmt + '// -------------------------------------------------------------');

fs.writeFileSync('server.ts', content);
console.log("Done modifying server.ts");
