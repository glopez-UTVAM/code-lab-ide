import express from "express";
import cors from "cors";
import OpenAI from "openai";
import "dotenv/config";
console.log("🔍 GROQ_API_KEY cargada?:", process.env.GROQ_API_KEY ? "SÍ" : "NO");


// =======================
// Config
// =======================
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = 3001;

// =======================
// PISTON (ejecución)
// =======================
const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

// Mapea tus lenguajes UI -> piston
const PISTON_LANG = {
    python: { language: "python", version: "3.10.0" },
    java: { language: "java", version: "15.0.2" },
    csharp: { language: "csharp", version: "6.12.0" },
};

app.post("/run", async (req, res) => {
    try {
        const { language, source_code, stdin } = req.body;

        const spec = PISTON_LANG[language];
        if (!spec) {
            return res.status(400).json({ error: "Lenguaje no soportado" });
        }

        const pistonBody = {
            language: spec.language,
            version: spec.version,
            files: [{ name: "main", content: source_code || "" }],
            stdin: stdin || "",
        };

        const r = await fetch(PISTON_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pistonBody),
        });

        const data = await r.json();

        // Normaliza salida
        const run = data.run || {};
        return res.json({
            stdout: run.stdout ?? "",
            stderr: run.stderr ?? "",
            exitCode: run.code ?? 0,
        });
    } catch (err) {
        return res.status(500).json({ error: "Error ejecutando", details: err.message });
    }
});

// =======================
// GROQ (Tutor IA)
// =======================
// Cliente OpenAI-compatible apuntando a Groq
const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

// Prompt pedagógico “real” multi-lenguaje
function buildTutorPrompt({ language, source_code, stdout, stderr, expectedOutput }) {
    const langName =
        language === "python" ? "Python" : language === "java" ? "Java" : "C#";

    const hasExpected = typeof expectedOutput === "string" && expectedOutput.trim().length > 0;

    return [
        {
            role: "system",
            content:
                "Eres un tutor de programación. Tu tarea es dar PISTAS pedagógicas y progresivas, " +
                "NO des la solución completa ni pegues el código final. " +
                "Sé claro, breve, y enfocado en que el alumno aprenda.\n\n" +
                "Reglas:\n" +
                "- No entregues el programa completo.\n" +
                "- Da máximo 4-6 pistas concretas.\n" +
                "- Si hay error de compilación/sintaxis, prioriza eso.\n" +
                "- Si el resultado es incorrecto, guía con verificaciones (entradas/salidas, tipos, bucles, condiciones).\n" +
                "- Incluye 1 pregunta al final para que el alumno reflexione.\n" +
                "- Usa español.\n" +
                "- Si es Java/C#, recuerda estructura mínima (clase Main/Program, método main/Main).\n",
        },
        {
            role: "user",
            content:
                `Lenguaje: ${langName}\n` +
                (hasExpected ? `Modo ejercicio: Sí\nSalida esperada:\n${expectedOutput}\n\n` : "Modo libre: Sí\n\n") +
                `Salida obtenida (stdout):\n${stdout || ""}\n\n` +
                `Errores (stderr):\n${stderr || ""}\n\n` +
                `Código del alumno:\n---\n${source_code || ""}\n---\n\n` +
                "Genera pistas para que el alumno corrija su código y/o se acerque al resultado esperado.",
        },
    ];
}

app.post("/tutor", async (req, res) => {
    try {
        const { language, source_code, stdout, stderr, expectedOutput } = req.body;

        if (!process.env.GROQ_API_KEY) {
            return res.status(500).json({
                hint:
                    "Falta GROQ_API_KEY en el backend. Crea D:\\code-lab\\backend\\.env con GROQ_API_KEY=... y reinicia el servidor.",
            });
        }

        const messages = buildTutorPrompt({
            language,
            source_code,
            stdout,
            stderr,
            expectedOutput,
        });

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile", // buen tutor (si algún día cambia, te doy alternativa)
            messages,
            temperature: 0.4,
            max_tokens: 350,
        });

        const hint = completion.choices?.[0]?.message?.content?.trim() || "";
        return res.json({ hint: hint || "No pude generar una pista esta vez." });
    } catch (err) {
        // Para que no “reviente” tu UI
        return res.status(200).json({
            hint:
                "No pude generar pista por ahora.\n" +
                `Detalle técnico: ${err?.message || "desconocido"}`,
        });
    }
});

// =======================
app.get("/", (req, res) => res.send("Backend OK"));
app.listen(PORT, () => console.log(`Backend escuchando en http://localhost:${PORT}`));
