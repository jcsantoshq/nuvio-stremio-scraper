/**
 * Stremio / Nuvio / WuPlay Express Server Add-on
 * File Name: server.js
 * Purpose: Listens for app search requests and returns Spanish streams
 */

const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');

// 1. Define your Add-on Identity (The Manifest Data)
const manifest = {
    id: "com.misniper.espanol.addon",
    version: "1.0.0",
    name: "Catálogo de Audio Español",
    description: "Servidor scraper para buscar pistas de audio y video en Español (Latino/Castellano).",
    resources: ["stream"], // Tells Stremio we are providing streaming links
    types: ["movie", "series"], // Categories supported
    idPrefixes: ["tt"], // Uses standard IMDb/TMDB ID formats
    catalogs: []
};

const builder = new addonBuilder(manifest);

// 2. Define the Stream Handler (What happens when you click on a title in the app)
builder.defineStreamHandler((args) => {
    // args.id contains the unique identifier (like the IMDb ID: tt1234567)
    const mediaId = args.id;
    const mediaType = args.type;

    console.log(`[Server] Received stream request for Type: ${mediaType}, ID: ${mediaId}`);

    // This returns a promise containing our web scraping network logic
    return new Promise((resolve) => {
        
        // Target endpoint configuration (Replace with your actual public source API)
        const targetSourceApi = 'https://api.examplespanishsource.com/search'; 
        const targetSearchUrl = `${targetSourceApi}?id=${mediaId}&lang=es`;

        // Execute the background search request to fetch streams
        fetch(targetSearchUrl, {
            method: 'GET',
            headers: {
                'Accept-Language': 'es-ES,es;q=0.9', // Tell the server we want Spanish assets
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Target source response error');
            return response.json();
        })
        .then(data => {
            const streamsList = [];

            // Example data structural loop parsing (Adapts to target site layout)
            if (data && data.results) {
                data.results.forEach(track => {
                    // Filter to double check the audio track language is Spanish
                    if (track.language === 'spanish' || track.idioma === 'es') {
                        streamsList.push({
                            name: "Audio Español",
                            title: `${track.title || 'Stream Latino/Castellano'}\nCalidad: ${track.resolution || 'HD'}`,
                            url: track.directStreamUrl, // The explicit link to the streaming media (.mp4/.m3u8)
                            behaviorHints: {
                                notSupported: false,
                                // Bypasses anti-hotlinking security frames on the site
                                requestHeaders: {
                                    "User-Agent": "Mozilla/5.0",
                                    "Referer": "https://examplespanishsource.com/"
                                }
                            }
                        });
                    }
                });
            }

            // If no streams were pulled, return a clean empty list back safely
            resolve({ streams: streamsList });
        })
        .catch(error => {
            console.error(`[Server Error] Could not fetch links for ${mediaId}:`, error.message);
            
            // Fallback: Send a message stream option informing that no links were fetched
            resolve({ streams: [] });
        });
    });
});

// 3. Fire up the HTTP Web Server Environment
// Render automatically provides a process.env.PORT value
const port = process.env.PORT || 7000;

serveHTTP(builder.getInterface(), { port: port }).then((hostingInfo) => {
    console.log(`\n==================================================`);
    console.log(`🚀 Spanish Audio Add-on Server running smoothly!`);
    console.log(`🔗 Local Manifest URL: ${hostingInfo.url}/manifest.json`);
    console.log(`==================================================\n`);
});
