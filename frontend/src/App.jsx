import { useState } from "react";
import CodeEditor from "./components/CodeEditor";

// Código base por lenguaje
const TEMPLATES = {
    python: `print("Hola desde Python")\n`,
    java:
        `public class Main {\n` +
        `    public static void main(String[] args) {\n` +
        `        System.out.println("Hola desde Java");\n` +
        `    }\n` +
        `}\n`,
    csharp:
        `using System;\n\n` +
        `public class Program {\n` +
        `    public static void Main(string[] args) {\n` +
        `        Console.WriteLine("Hola desde C#");\n` +
        `    }\n` +
        `}\n`,
};

// Ejercicio demo sencillo (por ahora en Python)
const DEMO_EXERCISE = {
    id: "suma2",
    title: "Suma de dos números",
    language: "python",
    description:
        "Lee dos números enteros desde la entrada estándar y muestra la suma.",
    starterCode:
        "a = int(input())\n" +
        "b = int(input())\n" +
        "suma = a + b\n" +
        "print(suma)\n",
    sampleInput: "5\n3\n",
    expectedOutput: "8\n",
};

export default function App() {
    const [lang, setLang] = useState("python");
    const [code, setCode] = useState(TEMPLATES.python);
    const [output, setOutput] = useState("");
    const [error, setError] = useState(""); // stderr
    const [isRunning, setIsRunning] = useState(false);
    const [stdin, setStdin] = useState("");
    const [exercise, setExercise] = useState(null);
    const [expectedOutput, setExpectedOutput] = useState("");
    const [tutorMessage, setTutorMessage] = useState("");
    const [tutorLoading, setTutorLoading] = useState(false);

    // Cargar ejercicio demo (puedes luego hacer uno por lenguaje)
    function loadDemoExercise() {
        setLang(DEMO_EXERCISE.language);
        setCode(DEMO_EXERCISE.starterCode);
        setStdin(DEMO_EXERCISE.sampleInput);
        setExpectedOutput(DEMO_EXERCISE.expectedOutput);
        setExercise(DEMO_EXERCISE);
        setOutput("");
        setError("");
        setTutorMessage("");
    }

    // Cambiar lenguaje y resetear a plantilla
    function changeLanguage(newLang) {
        setLang(newLang);
        setCode(TEMPLATES[newLang]);
        setOutput("");
        setError("");
        setTutorMessage("");
        setExercise(null);
        setExpectedOutput("");
        setStdin("");
    }

    // Ejecutar código contra el backend /run
    async function runCode() {
        setIsRunning(true);
        setOutput("Ejecutando...\n");
        setError("");
        setTutorMessage("");

        try {
            const response = await fetch("http://localhost:3001/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    language: lang,
                    source_code: code,
                    stdin: stdin,
                }),
            });

            const data = await response.json();
            setOutput(data.stdout || "");
            setError(data.stderr || "");
        } catch (err) {
            setOutput("❌ Error al conectar con el backend:\n" + err.message);
            setError("");
        } finally {
            setIsRunning(false);
        }
    }

    // Pedir pista al tutor IA para cualquier lenguaje
    async function askTutor() {
        setTutorLoading(true);
        setTutorMessage("Analizando tu código...");

        try {
            const response = await fetch("http://localhost:3001/tutor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    language: lang,       // Python / Java / C#
                    source_code: code,
                    stdout: output,
                    stderr: error,
                    expectedOutput,
                }),
            });

            const data = await response.json();
            setTutorMessage(data.hint || "El tutor no pudo generar una pista ahora.");
        } catch (err) {
            setTutorMessage("❌ Error al conectar con el tutor IA:\n" + err.message);
        } finally {
            setTutorLoading(false);
        }
    }

    // Veredicto en ejercicios (correcto/incorrecto)
    let verdictText = "";
    let verdictColor = "#ccc";

    if (exercise && expectedOutput && output) {
        const normOut = output.trim();
        const normExp = expectedOutput.trim();

        if (normOut === normExp) {
            verdictText = "✅ Resultado correcto para el ejercicio.";
            verdictColor = "#4ade80";
        } else {
            verdictText =
                `❌ Resultado incorrecto.\n` +
                `Esperado: ${normExp}\n` +
                `Obtenido: ${normOut}`;
            verdictColor = "#f87171";
        }
    }

    // Adaptar id de lenguaje para Monaco
    const monacoLanguage = lang === "csharp" ? "csharp" : lang;

    return (
        <div
            style={{
                height: "100vh",
                display: "grid",
                gridTemplateRows: "48px 1fr",
                background: "#1e1e1e",
                color: "#fff",
                fontFamily: "sans-serif",
            }}
        >
            {/* HEADER */}
            <header
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 16px",
                    background: "#252526",
                    borderBottom: "1px solid #333",
                }}
            >
                <div>Code Lab — IDE Educativo</div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select
                        value={lang}
                        onChange={(e) => changeLanguage(e.target.value)}
                        style={{
                            background: "#1e1e1e",
                            color: "#fff",
                            border: "1px solid #444",
                            borderRadius: 6,
                            padding: "6px 10px",
                            outline: "none",
                        }}
                    >
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="csharp">C#</option>
                    </select>

                    <button
                        onClick={loadDemoExercise}
                        style={{
                            background: "#444",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            padding: "6px 10px",
                            fontSize: 12,
                            cursor: "pointer",
                        }}
                    >
                        Cargar ejercicio demo
                    </button>

                    <button
                        onClick={runCode}
                        disabled={isRunning}
                        style={{
                            background: isRunning ? "#444" : "#2d7dff",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            padding: "6px 12px",
                            fontWeight: 600,
                            cursor: isRunning ? "not-allowed" : "pointer",
                        }}
                    >
                        {isRunning ? "Ejecutando..." : "Ejecutar"}
                    </button>
                </div>

                <button
                    onClick={askTutor}
                    disabled={tutorLoading}
                    style={{
                        background: "#9333ea",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 10px",
                        fontSize: 12,
                        cursor: tutorLoading ? "not-allowed" : "pointer",
                    }}
                >
                    {tutorLoading ? "Analizando..." : "Pedir pista"}
                </button>
            </header>

            {/* WORKSPACE */}
            <main style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                {/* EDITOR */}
                <section style={{ borderRight: "1px solid #333", padding: "8px" }}>
                    <div style={{ height: "100%" }}>
                        <CodeEditor
                            language={monacoLanguage}
                            value={code}
                            onChange={setCode}
                        />
                    </div>
                </section>

                {/* OUTPUT + TUTOR + STDIN */}
                <section
                    style={{
                        padding: "8px",
                        display: "grid",
                        gridTemplateRows: "1fr 140px",
                        gap: 8,
                        minHeight: 0,
                    }}
                >
                    {/* CONSOLA */}
                    <div
                        style={{
                            height: "100%",
                            border: "1px solid #333",
                            borderRadius: 8,
                            padding: 12,
                            background: "#111",
                            overflow: "auto",
                            fontFamily:
                                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                            fontSize: 13,
                            whiteSpace: "pre-wrap",
                        }}
                    >
                        {output || "Consola / Feedback"}

                        {error && (
                            <div
                                style={{
                                    marginTop: 8,
                                    paddingTop: 8,
                                    borderTop: "1px dashed #444",
                                    color: "#ff7b72",
                                    fontSize: 12,
                                }}
                            >
                                {error}
                            </div>
                        )}

                        {verdictText && (
                            <div
                                style={{
                                    marginTop: 10,
                                    padding: 8,
                                    borderRadius: 6,
                                    background: "#0005",
                                    color: verdictColor,
                                    border: `1px solid ${verdictColor}`,
                                }}
                            >
                                {verdictText}
                            </div>
                        )}

                        {tutorMessage && (
                            <div
                                style={{
                                    marginTop: 10,
                                    padding: 8,
                                    borderRadius: 6,
                                    background: "#222",
                                    border: "1px dashed #555",
                                    fontSize: 12,
                                }}
                            >
                                <strong style={{ opacity: 0.8 }}>Tutor IA:</strong>
                                <br />
                                {tutorMessage}
                            </div>
                        )}
                    </div>

                    {/* STDIN */}
                    <div style={{ display: "grid", gridTemplateRows: "18px 1fr", gap: 6 }}>
                        <div style={{ fontSize: 12, opacity: 0.85 }}>Entrada (stdin)</div>

                        <textarea
                            value={stdin}
                            onChange={(e) => setStdin(e.target.value)}
                            placeholder={`Ejemplo:\n5\n3\n`}
                            style={{
                                width: "100%",
                                height: "100%",
                                background: "#0d0d0d",
                                color: "#fff",
                                border: "1px solid #333",
                                borderRadius: 8,
                                padding: 10,
                                fontFamily:
                                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                fontSize: 13,
                                outline: "none",
                                resize: "none",
                            }}
                        />
                    </div>
                </section>
            </main>
        </div>
    );
}
