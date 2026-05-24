/**
 * Servidor Add-on de Stremio / Nuvio / WuPlay
 * Versión 1.6.0 - Corrección Absoluta de Variables e Interfaz
 */

const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');

const manifest = {
    id: "com.misniper.espanol.addon",
    version: "1.6.0", 
    name: "Catálogo Torrent Español",
    description: "Busca enlaces en español (Latino/Castellano) usando Jackett local.",
    resources: ["stream"],
    types: ["movie", "series"], 
    idPrefixes: ["tt"],        
    catalogs: [
        {
            type: "movie",
            id: "espanol_remoto",
            name: "Torrent Español Activo ✅"
        }
    ]
};

const builder = new addonBuilder(manifest);

// Manejador del catálogo para que aparezca obligatoriamente en la interfaz de la app
builder.defineCatalogHandler((args) => {
    return Promise.resolve({ catalogs: [] });
});

builder.defineStreamHandler((args) => {
    const mediaId = args.id; 
    console.log(`[Jackett Scraper] Solicitando streams para ID: ${mediaId}`);

    return new Promise((resolve) => {
        const tuUrlDeTunnel = 'https://proud-humans-nail.loca.lt';
        const apiKeyJackett = 'l8lph3swn1dy6oakjafitgxtiunr1cix'; 

        const jackettSearchUrl = `${tuUrlDeTunnel}/api/v2.0/indexers/all/results?apikey=${apiKeyJackett}&Query=${mediaId}`;

        fetch(jackettSearchUrl, {
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        })
        .then(response => {
            if (!response.ok) throw new Error('Error de comunicación con Jackett');
            return response.json();
        })
        .then(data => {
            const streamsList = [];

            if (data && data.Results) {
                data.Results.forEach(torrent => {
                    if (!torrent.Title) return;

                    const nombreFichero = torrent.Title.toLowerCase();
                    let idiomaDetectado = "";

                    if (nombreFichero.includes("latino") || nombreFichero.includes("spa lat") || nombreFichero.includes("audio latino") || nombreFichero.includes("lat")) {
                        idiomaDetectado = "Español Latino 🇲🇽";
                    } else if (nombreFichero.includes("castellano") || nombreFichero.includes("cast") || nombreFichero.includes("español") || nombreFichero.includes("esp")) {
                        idiomaDetectado = "Castellano 🇪🇸";
                    } else if (nombreFichero.includes("dual")) {
                        idiomaDetectado = "Audio Dual (Español Incluido) 🔄";
                    }

                    if (idiomaDetectado !== "") {
                        let fuente = torrent.Tracker || "Jackett Source";
                        let semillas = torrent.Seeders || 0;
                        
                        streamsList.push({
                            name: `[${fuente}]`,
                            title: `${torrent.Title}\n🗣️ Audio: ${idiomaDetectado}\n👥 Seeders: ${semillas}`,
                            url: torrent.MagnetUri || torrent.Link,
                            behaviorHints: { notSupported: false }
                        });
                    }
                });
            }

            // CORRECCIÓN CRÍTICA: Corregido 'Seeders' con mayúscula nativa para evitar que el script falle
            streamsList.sort((a, b) => {
                const seedsA = parseInt(a.title.split("Seeders: ")[1]) || 0;
                const seedsB = parseInt(b.title.split("Seeders: ")[1]) || 0;
                return seedsB - seedsA;
            });
            
            console.log(`[Jackett] Mapeados ${streamsList.length} enlaces válidos.`);
            resolve({ streams: streamsList });
        })
        .catch(error => {
            console.error(`[Error de Rastreo]:`, error.message);
            resolve({ streams: [] });
        });
    });
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { 
    port: port });
