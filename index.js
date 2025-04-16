const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
const port = 3000;

// --- API Key Management ---
// WARNING: Storing API keys directly in code is a security risk.
const API_KEYS = [
    "AIzaSyCo5VB_H6pN-DDk1YUjR2MLYV6d4CdRItM", // Replace with your actual key 1
    "AIzaSyBv27XqopLRpDoJWoETuVN5XWnfjQnaf-E", // Replace with your actual key 2
    "AIzaSyBv8Ix7n9sPvswwazsXyQuzrhUifaKgEXE", // Replace with your actual key 3
    "AIzaSyBq_BlDIr2Qtc3Bgb1u7hkOhQwfmuhdZ18", // Replace with your actual key 4
    // Add more keys here if needed
];

if (API_KEYS.length === 0 || API_KEYS[0].startsWith("AIzaSy")) {
    console.warn("WARNING: Ensure you have replaced the placeholder API keys in the API_KEYS array with your actual Gemini keys.");
    if (API_KEYS.length === 0) {
        console.error("ERROR: No Gemini API keys found in the API_KEYS array. Exiting.");
        process.exit(1);
    }
}

let currentKeyIndex = 0; // For round-robin key rotation

// --- Expanded Model Alias Mapping ---
// Note: Availability and stability of experimental/preview models may vary.
const MODEL_ALIAS = {
    // --- Gemini 1.0 Models ---
    "1.0pro": "gemini-1.0-pro",
    "1.0pro-vision": "gemini-1.0-pro-vision-latest", // Alias for latest 1.0 vision
    "provision": "gemini-pro-vision", // Often used as alias for 1.0 vision

    // --- Gemini 1.5 Flash Models ---
    "1.5flash": "gemini-1.5-flash-latest",        // Alias for the latest flash model
    "1.5flash-latest": "gemini-1.5-flash-latest", // Explicit latest alias
    "1.5flash-base": "gemini-1.5-flash",          // Specific base version if needed
    "1.5flash-001": "gemini-1.5-flash-001",
    "1.5flash-002": "gemini-1.5-flash-002",
    "1.5flash-001-tuning": "gemini-1.5-flash-001-tuning", // Specific tuning version

    // --- Gemini 1.5 Flash 8B Models ---
    "1.5flash-8b": "gemini-1.5-flash-8b-latest",       // Alias for latest 8b flash
    "1.5flash-8b-latest": "gemini-1.5-flash-8b-latest", // Explicit latest alias
    "1.5flash-8b-base": "gemini-1.5-flash-8b",         // Specific base version if needed
    "1.5flash-8b-001": "gemini-1.5-flash-8b-001",
    "1.5flash-8b-exp0827": "gemini-1.5-flash-8b-exp-0827", // Experimental
    "1.5flash-8b-exp0924": "gemini-1.5-flash-8b-exp-0924", // Experimental

    // --- Gemini 1.5 Pro Models ---
    "1.5pro": "gemini-1.5-pro-latest",            // Alias for the latest pro model
    "1.5pro-latest": "gemini-1.5-pro-latest",     // Explicit latest alias
    "1.5pro-base": "gemini-1.5-pro",              // Specific base version if needed
    "1.5pro-001": "gemini-1.5-pro-001",
    "1.5pro-002": "gemini-1.5-pro-002",
    "learnlm1.5pro-exp": "learnlm-1.5-pro-experimental", // Experimental LearnLM variant

    // --- Gemini 2.0 Flash Models (Experimental/Preview) ---
    "2": "gemini-2.0-flash",                  // Base 2.0 Flash
    "2.0flash-001": "gemini-2.0-flash-001",
    "2.0flash-exp": "gemini-2.0-flash-exp",          // Experimental
    "2.0flash-live-001": "gemini-2.0-flash-live-001",
    "2.0flash-img-exp": "gemini-2.0-flash-exp-image-generation", // Experimental Image Gen
    "2.0flash-think-exp": "gemini-2.0-flash-thinking-exp", // Experimental Thinking
    "2.0flash-think-exp0121": "gemini-2.0-flash-thinking-exp-01-21",
    "2.0flash-think-exp1219": "gemini-2.0-flash-thinking-exp-1219",

    // --- Gemini 2.0 Flash Lite Models (Experimental/Preview) ---
    "2.0flash-lite": "gemini-2.0-flash-lite",
    "2.0flash-lite-001": "gemini-2.0-flash-lite-001",
    "2.0flash-lite-preview": "gemini-2.0-flash-lite-preview",
    "2.0flash-lite-preview0205": "gemini-2.0-flash-lite-preview-02-05",

    // --- Gemini 2.0 Pro Models (Experimental/Preview) ---
    "2.0pro-exp": "gemini-2.0-pro-exp",
    "2.0pro-exp0205": "gemini-2.0-pro-exp-02-05",

    // --- Gemini 2.5 Pro Models (Experimental/Preview) ---
    "2.5pro": "gemini-2.5-pro-exp-03-25",           // Existing experimental alias
    "2.5pro-p": "gemini-2.5-pro-preview-03-25", // Preview alias

    // --- Other Experimental Gemini Models ---
    "exp1206": "gemini-exp-1206",

    // --- Gemma Models ---
    "gemma3-1b": "gemma-3-1b-it",
    "gemma3-4b": "gemma-3-4b-it",
    "gemma3-12b": "gemma-3-12b-it",
    "gemma3-27b": "gemma-3-27b-it",

    // --- Embedding Models ---
    "embedding-gecko-001": "embedding-gecko-001", // Older embedding?
    "embedding001": "embedding-001",             // Newer general embedding
    "textembedding004": "text-embedding-004",     // Latest text embedding
    "embedding-exp": "gemini-embedding-exp",      // Experimental embedding
    "embedding-exp0307": "gemini-embedding-exp-03-07", // Dated experimental embedding

    // --- Legacy PaLM Models (Likely superseded but included for completeness) ---
    "chatbison001": "chat-bison-001",
    "textbison001": "text-bison-001",

    // --- Other Specific Models ---
    "aqa": "aqa", // Attributed Question Answering model
    "imagen3": "imagen-3.0-generate-002", // Imagen model

    // --- Keep Original '2' alias if still needed ---
    "2": "gemini-1.5-flash-latest", // Mapping original '2' to latest flash
};


app.use(bodyParser.json());

// --- Improved Function to Query Gemini with Key Rotation and Retry ---
async function queryGeminiWithRetry(prompt, modelIdentifier) { // Changed param name for clarity
    const totalKeys = API_KEYS.length;
    if (totalKeys === 0) {
        throw new Error("No API keys available to try.");
    }

    let lastError = null; // Store the last encountered error

    // Try each API key in a round-robin fashion until one succeeds
    for (let attempt = 0; attempt < totalKeys; attempt++) {
        const apiKey = API_KEYS[currentKeyIndex];
        const keyIndexForLogging = currentKeyIndex;
        currentKeyIndex = (currentKeyIndex + 1) % totalKeys; // Move to the next key for the next request

        // Construct the URL using the exact model identifier
        // Ensure 'models/' prefix if the identifier doesn't already have it
        const modelPath = modelIdentifier.startsWith('models/') ? modelIdentifier : `models/${modelIdentifier}`;
        const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${apiKey}`;

        const body = {
            contents: [{ parts: [{ text: prompt }] }],
            // Optional Generation Config & Safety Settings can be added here
        };

        console.log(`Attempting API call to model '${modelIdentifier}' using key index: ${keyIndexForLogging}`);

        try {
            // Use a longer timeout for potentially complex models
            const response = await axios.post(url, body, { timeout: 60000 }); // 60 second timeout

            const candidate = response.data?.candidates?.[0];
            const reply = candidate?.content?.parts?.[0]?.text;

            if (reply) {
                console.log(`Success with key index: ${keyIndexForLogging}`);
                return reply;
            } else {
                const blockReason = candidate?.finishReason;
                const safetyRatings = candidate?.safetyRatings;
                if (blockReason && blockReason !== "STOP") {
                     console.warn(`API call blocked for model ${modelIdentifier} with key index ${keyIndexForLogging}. Reason: ${blockReason}. Safety Ratings: ${JSON.stringify(safetyRatings)}`);
                     lastError = new Error(`API call blocked. Reason: ${blockReason}`);
                     lastError.statusCode = 400;
                     throw lastError;
                } else {
                    console.warn(`Successful response from model ${modelIdentifier} with key index ${keyIndexForLogging}, but invalid or empty content received. Response:`, JSON.stringify(response.data));
                    lastError = new Error(`Successful response but invalid/empty content from model ${modelIdentifier} with key index ${keyIndexForLogging}`);
                    lastError.statusCode = 502;
                    continue; // Try next key
                }
            }
        } catch (error) {
            lastError = error;
            console.error(`Error using key index ${keyIndexForLogging} for model ${modelIdentifier}:`);

            if (error.response) {
                console.error(` - Status: ${error.response.status}`);
                console.error(` - Data: ${JSON.stringify(error.response.data)}`);
                 // Check if the error specifically mentions model availability/permission
                const errorMsg = JSON.stringify(error.response.data).toLowerCase();
                if (error.response.status === 404 || errorMsg.includes("model not found") || errorMsg.includes("permission denied")) {
                     console.warn(`   Model ${modelIdentifier} might be unavailable or require specific permissions. Trying next key just in case, but likely a model issue.`);
                     // Still retry with the next key in case it's key-specific permission, but log the warning
                     // If all keys fail with this, the final error will likely reflect the 404/403.
                     continue;
                }
                else if ([401, 403, 429].includes(error.response.status) || error.response.status >= 500) {
                    console.log("   Retrying with the next API key...");
                    continue;
                } else {
                    throw error;
                }
            } else if (error.request) {
                console.error(" - Request Error: No response received from Gemini server.");
                console.log("   Retrying with the next API key (network issue)...");
                continue;
            } else {
                console.error(" - Setup Error:", error.message);
                throw error;
            }
        }
    }

    console.error(`All ${totalKeys} API keys were tried and failed for model ${modelIdentifier}.`);
    const finalError = new Error(`Failed to query Gemini API model ${modelIdentifier} after trying all ${totalKeys} keys.`);
    finalError.cause = lastError;
     // If the last error had a specific status code (like 404, 403 from model not found), propagate it
    finalError.statusCode = lastError?.response?.status || 503;
    throw finalError;
}

// --- Shared Request Handling Logic ---
async function handleGeminiRequest(req, res, prompt, modelAlias) {
    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
        return res.status(400).json({ error: "Parameter 'prompt' is required and must be a non-empty string." });
    }

    // Allow using the full model identifier directly OR an alias
    let realModelIdentifier;
    if (MODEL_ALIAS[modelAlias]) {
        realModelIdentifier = MODEL_ALIAS[modelAlias];
         console.log(`Resolved alias '${modelAlias}' to model identifier '${realModelIdentifier}'`);
    } else {
        // Check if the provided 'modelAlias' might be a direct identifier
        // Basic check: does it contain typical identifier characters?
        if (modelAlias && modelAlias.includes('-') && modelAlias.length > 5) {
             console.log(`Using '${modelAlias}' directly as model identifier (alias not found).`);
             realModelIdentifier = modelAlias;
        } else {
             const availableAliases = Object.keys(MODEL_ALIAS).join(", ");
             return res.status(400).json({ error: `Invalid or unknown model alias/identifier '${modelAlias}'. Available aliases: ${availableAliases}` });
        }
    }


    try {
        const result = await queryGeminiWithRetry(prompt, realModelIdentifier);
        res.json({
            method: req.method,
            author: "Created by ehsan fazli",
            model_alias_requested: modelAlias, // Show what the user asked for
            model_identifier_used: realModelIdentifier, // Show the resolved ID
            result: result
        });
    } catch (error) {
        console.error("Final error caught in controller:", error.message);
        if (error.cause) {
            console.error("Underlying cause:", error.cause.message);
        }

        let statusCode = 500;
        let errorMessage = "An error occurred while communicating with the Gemini API.";
        let errorDetails = error.message;

        if (error.statusCode) {
            statusCode = error.statusCode;
             if (statusCode === 503) {
                errorMessage = `Gemini API service is currently unavailable or unresponsive for model ${realModelIdentifier} (all keys failed).`;
            } else if (statusCode === 400 && error.message.startsWith("API call blocked")) {
                 errorMessage = `Request blocked by Gemini API for model ${realModelIdentifier}, likely due to safety settings or prompt content.`;
                 errorDetails = error.message;
             } else if (statusCode === 502) {
                  errorMessage = `Received an invalid or empty response from Gemini API model ${realModelIdentifier}.`;
            } else if (statusCode === 404 || statusCode === 403 && error.cause?.response?.data) { // Check cause for original API error
                 errorMessage = `Model '${realModelIdentifier}' not found or permission denied.`;
                 errorDetails = error.cause.response.data;
            } else if (statusCode === 429) {
                 errorMessage = `Gemini API rate limit exceeded for model ${realModelIdentifier}.`;
             }
        } else if (error.response) { // Fallback for errors not assigned a specific statusCode earlier
             statusCode = error.response.status;
             errorMessage = `Gemini API responded with status code ${statusCode} for model ${realModelIdentifier}.`;
             errorDetails = error.response.data || "No further details received from API.";
             if (statusCode === 400) {
                 errorMessage = `Invalid request sent to Gemini API model ${realModelIdentifier} (check prompt structure, parameters, or safety settings).`;
             }
         } else if (error.request) {
            statusCode = 504;
            errorMessage = `No response received from Gemini API for model ${realModelIdentifier} (timeout or network issue).`;
        }

        res.status(statusCode).json({
            error: errorMessage,
            details: errorDetails
        });
    }
}

// --- POST Route ---
app.post("/gemini/chat", async (req, res) => {
    const { prompt, model } = req.body;
    await handleGeminiRequest(req, res, prompt, model);
});

// --- GET Route ---
app.get("/gemini/chat", async (req, res) => {
    const prompt = req.query.prompt;
    const model = req.query.model;
    await handleGeminiRequest(req, res, prompt, model);
});

// --- Server Startup ---
app.listen(port, () => {
    console.log(`Gemini API Proxy server running at http://localhost:${port}`);
    console.log(`Loaded ${API_KEYS.length} API key(s).`);
    console.log(`Loaded ${Object.keys(MODEL_ALIAS).length} model aliases.`);
    // Optional: List all aliases if needed, but it's very long now
    // console.log("Available model aliases:", Object.keys(MODEL_ALIAS).join(", "));
});
