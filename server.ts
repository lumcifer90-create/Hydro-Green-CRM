import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, getDocs, setDoc, deleteDoc, collection } from "firebase/firestore";

dotenv.config();

// Initialize Express app
const app = express();
const PORT = 3000;

// Setup body parsing for base64 uploads and standard requests
app.use(express.json({ limit: '15mb' }));

// Read Firebase applet configuration
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Initialize Firebase App for server-side persistence
const firebaseApp = initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
});

// Initialize Firestore DB
const db = getFirestore(firebaseApp, config.firestoreDatabaseId);

// Seed default Admin and Employee accounts if they don't exist
async function seedDefaultAccounts() {
  try {
    const adminRef = doc(db, "app_users", "admin@hydrogreen.com");
    const adminSnap = await getDoc(adminRef);
    if (!adminSnap.exists()) {
      await setDoc(adminRef, {
        email: "admin@hydrogreen.com",
        password: "adminpassword",
        name: "Hydrogreen Admin",
        role: "admin",
        active: true,
        createdAt: new Date().toISOString()
      });
      console.log("Seeded default admin user: admin@hydrogreen.com");
    }

    const employeeRef = doc(db, "app_users", "employee@hydrogreen.com");
    const employeeSnap = await getDoc(employeeRef);
    if (!employeeSnap.exists()) {
      await setDoc(employeeRef, {
        email: "employee@hydrogreen.com",
        password: "employeepassword",
        name: "Rahul Kumar (Advisory Head)",
        role: "employee",
        active: true,
        createdAt: new Date().toISOString()
      });
      console.log("Seeded default whitelisted employee user: employee@hydrogreen.com");
    }
  } catch (err) {
    console.error("Error seeding default users:", err);
  }
}

// Custom lightweight User-Agent parser to avoid external package overhead
function parseUserAgent(userAgent: string) {
  let browser = "Unknown Browser";
  let os = "Unknown OS";

  const ua = userAgent.toLowerCase();

  // Parse OS
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("macintosh") || ua.includes("mac os")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

  // Parse Browser
  if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("chrome") && !ua.includes("chromium")) browser = "Chrome";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("edge") || ua.includes("edg")) browser = "Edge";
  else if (ua.includes("opera") || ua.includes("opr")) browser = "Opera";
  else if (ua.includes("trident") || ua.includes("msie")) browser = "Internet Explorer";

  return { browser, os };
}

// Authentication / Login Controller Endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    if (!email || !password || !role) {
      return res.status(400).json({ error: "Email, password, and role are required." });
    }

    const lowercaseEmail = email.toLowerCase().trim();

    // Query user profile
    const userRef = doc(db, "app_users", lowercaseEmail);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return res.status(403).json({ error: "Unauthorized Email. This email is not whitelisted by the Admin." });
    }

    const userData = userSnap.data();

    // Validate account role match
    if (userData.role !== role) {
      return res.status(403).json({ error: `Unauthorized. Account role is not registered as ${role}.` });
    }

    // Verify account active status
    if (userData.active === false) {
      return res.status(403).json({ error: "This user account is currently deactivated." });
    }

    // Verify Password
    if (userData.password !== password) {
      return res.status(401).json({ error: "Incorrect Password." });
    }

    // Capture device and log details
    const userAgentStr = req.headers['user-agent'] || "Unknown";
    const { browser, os } = parseUserAgent(userAgentStr);
    const ipAddress = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || req.ip || "127.0.0.1").split(',')[0].trim();
    const timestamp = new Date().toISOString();

    // Log Successful Login to Database (Required Audit Log)
    const logId = `LOG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await setDoc(doc(db, "login_logs", logId), {
      id: logId,
      email: lowercaseEmail,
      name: userData.name,
      role: userData.role,
      timestamp,
      ipAddress,
      userAgent: userAgentStr,
      browser,
      os
    });

    res.json({
      success: true,
      user: {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        active: userData.active
      }
    });
  } catch (error: any) {
    console.error("Login controller error:", error);
    res.status(500).json({ error: error?.message || "An unexpected error occurred during authentication." });
  }
});

// Admin-Only: Whitelist / Register new user accounts
app.post("/api/auth-mgmt/users", async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    if (!email || !name || !password || !role) {
      return res.status(400).json({ error: "Missing required fields (email, name, password, role)" });
    }

    const lowercaseEmail = email.toLowerCase().trim();

    const userRef = doc(db, "app_users", lowercaseEmail);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return res.status(400).json({ error: "This email address is already whitelisted or registered." });
    }

    await setDoc(userRef, {
      email: lowercaseEmail,
      name,
      password,
      role,
      active: true,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, message: `Successfully registered & whitelisted "${name}" as ${role}.` });
  } catch (error: any) {
    console.error("Error creating whitelisted user:", error);
    res.status(500).json({ error: error?.message || "Failed to whitelist user account." });
  }
});

// Admin-Only: List all whitelisted users
app.get("/api/auth-mgmt/users", async (req, res) => {
  try {
    const querySnapshot = await getDocs(collection(db, "app_users"));
    const users: any[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Omit password from safe user details list
      const { password, ...safeData } = data;
      users.push(safeData);
    });
    res.json(users);
  } catch (error: any) {
    console.error("Error listing users:", error);
    res.status(500).json({ error: error?.message || "Failed to fetch whitelisted users." });
  }
});

// Admin-Only: Remove / Un-whitelist a user account
app.delete("/api/auth-mgmt/users/:email", async (req, res) => {
  try {
    const email = req.params.email;
    if (!email) {
      return res.status(400).json({ error: "Email parameter is required." });
    }

    const lowercaseEmail = email.toLowerCase().trim();

    if (lowercaseEmail === "admin@hydrogreen.com") {
      return res.status(400).json({ error: "The primary Admin account ('admin@hydrogreen.com') cannot be deleted or unwhitelisted." });
    }

    await deleteDoc(doc(db, "app_users", lowercaseEmail));
    res.json({ success: true, message: "User account unwhitelisted successfully." });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: error?.message || "Failed to unwhitelist user account." });
  }
});

// Admin-Only: Get all system login activity audits
app.get("/api/auth-mgmt/logs", async (req, res) => {
  try {
    const querySnapshot = await getDocs(collection(db, "login_logs"));
    const logs: any[] = [];
    querySnapshot.forEach((doc) => {
      logs.push(doc.data());
    });
    // Sort descending by timestamp so latest show first
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(logs);
  } catch (error: any) {
    console.error("Error fetching login logs:", error);
    res.status(500).json({ error: error?.message || "Failed to retrieve system audit logs." });
  }
});

// Initialize GoogleGenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Parse document API route
app.post("/api/parse-document", async (req, res) => {
  try {
    const { fileBase64, fileType, type } = req.body;
    
    if (!fileBase64 || !fileType || !type) {
      return res.status(400).json({ error: "Missing required parameters (fileBase64, fileType, or type)" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY environment variable is missing on the server. Please add it to your secrets." });
    }

    // Call Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: fileType,
            data: fileBase64
          }
        },
        {
          text: `Analyze this uploaded document (${type === 'customer' ? 'Customer registration / billing form' : 'Lead inquiry / contact form'}) and extract all relevant information to register a new ${type === 'customer' ? 'Customer' : 'Lead'}.
Return a JSON object conforming exactly to the requested schema. Do not include any explanatory text, markdown code blocks, or additional characters—just return the raw JSON matching the schema. If some details are not present in the document, leave them as null or empty strings, but ALWAYS try to find a name and phone number as they are critical fields.`
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: type === 'customer' ? {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Full Name of the customer" },
            phone: { type: Type.STRING, description: "Contact phone number" },
            whatsapp: { type: Type.STRING, description: "WhatsApp contact number if available" },
            email: { type: Type.STRING, description: "Email address if available" },
            address: { type: Type.STRING, description: "Full address, street, house number, plot" },
            village: { type: Type.STRING, description: "Village or town" },
            district: { type: Type.STRING, description: "District" },
            state: { type: Type.STRING, description: "State, e.g. Maharashtra, Punjab, etc." },
            pinCode: { type: Type.STRING, description: "Pincode or ZIP code" },
            farmSize: { type: Type.STRING, description: "Farm size / Land area if specified (e.g. 2 Acres)" },
            crop: { type: Type.STRING, description: "Planned or targeted crop (e.g. Tomato, Strawberry)" },
            systemType: { type: Type.STRING, description: "Hydroponic system type if mentioned (e.g. NFT, Drip, Flatbed, Vertical)" },
            notes: { type: Type.STRING, description: "Any additional remarks, requirements, or notes extracted from the document" }
          },
          required: ["name", "phone"]
        } : {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Full Name of the lead contact person" },
            phone: { type: Type.STRING, description: "Contact phone number" },
            whatsapp: { type: Type.STRING, description: "WhatsApp contact number if available" },
            email: { type: Type.STRING, description: "Email address if available" },
            source: { type: Type.STRING, description: "Lead acquisition source if mentioned (e.g. Website, Referral, Cold Call). If not specified, default to 'PDF Upload'" },
            product: { type: Type.STRING, description: "Interested product or system type (e.g. NFT System, Commercial Greenhouse, Polyhouse, Drip Irrigation)" },
            budget: { type: Type.NUMBER, description: "Estimated budget in INR if specified as a number" },
            address: { type: Type.STRING, description: "Street, Plot, House details" },
            village: { type: Type.STRING, description: "Village or town" },
            district: { type: Type.STRING, description: "District" },
            state: { type: Type.STRING, description: "State" },
            pinCode: { type: Type.STRING, description: "Pincode" },
            area: { type: Type.STRING, description: "Land area size, e.g. 1.2 Acres" },
            crop: { type: Type.STRING, description: "Target crop" },
            meetingNotes: { type: Type.STRING, description: "Extracted inquiry text, notes, or messages" }
          },
          required: ["name", "phone"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      return res.status(500).json({ error: "Gemini failed to return any text response." });
    }

    try {
      const parsedData = JSON.parse(resultText);
      res.json(parsedData);
    } catch (e) {
      res.status(500).json({ error: "Failed to parse Gemini response as JSON", rawResponse: resultText });
    }
  } catch (error: any) {
    console.error("Error processing document:", error);
    res.status(500).json({ error: error?.message || "An unexpected error occurred while parsing the document." });
  }
});

// Setup Vite or static serving
async function setupViteOrStatic() {
  // Seed default admin/employee accounts on startup
  await seedDefaultAccounts();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

setupViteOrStatic();
