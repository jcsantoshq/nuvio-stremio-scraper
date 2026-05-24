/**
 * Servidor Add-on de Stremio / Nuvio / WuPlay
 * Versión 1.7.0 - Corrección Definitiva con Needle para Render
 */

const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const needle = require('needle'); // Usamos la librería nativa de Stremio para evitar errores de fetch

const manifest = {
    id: "com.misniper.espanol.addon",
    version: "1.7.0", 
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

// Manejador del catálogo obligatorio para la interfaz
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

        const options = {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            open_timeout: 8000 // Evita que se quede colgado si el túnel tarda
        };

        needle('get', jackettSearchUrl, options)
        .then(response => {
            const data = response.body;
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

            // Ordenar los resultados por cantidad de semillas (De mayor a menor velocidad)
            streamsList.sort((a, b) => {
                const seedsA = parseInt(a.title.split("Seeders: ")[1]) || 0;
                const seedsB = parseInt(b.title.split("Seeders: ")[1]) || 0;
                return seedsB - seedsA;
            });
            
            console.log(`[Jackett] Envío exitoso de ${streamsList.length} enlaces.`);
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
