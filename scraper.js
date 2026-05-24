/**
 * Servidor Add-on de Stremio / Nuvio / WuPlay
 * Versión Corregida para Activación en Pantalla de Reproducción
 */

const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');

const manifest = {
    id: "com.misniper.espanol.addon",
    version: "1.5.0", // Subimos versión para forzar actualización
    name: "Catálogo Torrent Español",
    description: "Busca enlaces en español (Latino/Castellano) usando Jackett local.",
    resources: ["stream"],
    types: ["movie", "series"], // Le avisa a la app que busque tanto en películas como en series
    idPrefixes: ["tt"],        // CRÍTICO: Le dice a Stremio que despierte con cualquier ID de IMDb
    catalogs: []               // Vacío porque no creamos canales, solo inyectamos enlaces dentro de los videos
};

const builder = new addonBuilder(manifest);

builder.defineStreamHandler((args) => {
    const mediaId = args.id; // Recibe el ID de IMDb (ej: tt1234567)
    
    console.log(`[Jackett Scraper] Buscando transmisiones para el ID: ${mediaId}`);

    return new Promise((resolve) => {
        
        // Tu URL real de localtunnel activa en tu CMD
        const tuUrlDeTunnel = 'https://proud-humans-nail.loca.lt';
        
        // Tu API Key de Jackett
        const apiKeyJackett = 'l8lph3swn1dy6oakjafitgxtiunr1cix'; 

        // Ruta de consulta para que Jackett busque en todos tus indexadores configurados
        const jackettSearchUrl = `${tuUrlDeTunnel}/api/v2.0/indexers/all/results?apikey=${apiKeyJackett}&Query=${mediaId}`;

        fetch(jackettSearchUrl, {
            method: 'GET',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' 
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Error de conexión con Jackett');
            return response.json();
        })
        .then(data => {
            const streamsList = [];

            if (data && data.Results) {
                data.Results.forEach(torrent => {
                    if (!torrent.Title) return;

                    const nombreFichero = torrent.Title.toLowerCase();
                    let idiomaDetectado = "";

                    // Filtros avanzados para detectar audios en español
                    if (nombreFichero.includes("latino") || nombreFichero.includes("spa lat") || nombreFichero.includes("audio latino") || nombreFichero.includes("lat")) {
                        idiomaDetectado = "Español Latino 🇲🇽";
                    } else if (nombreFichero.includes("castellano") || nombreFichero.includes("cast") || nombreFichero.includes("español") || nombreFichero.includes("esp")) {
                        idiomaDetectado = "Castellano 🇪🇸";
                    } else if (nombreFichero.includes("dual")) {
                        idiomaDetectado = "Audio Dual (Español Incluido) 🔄";
                    }

                    // Si se confirma el idioma, se añade a la lista de reproducción
                    if (idiomaDetectado !== "") {
                        let fuente = torrent.Tracker || "Jackett Source";
                        
                        streamsList.push({
                            name: `[${fuente}]`,
                            title: `${torrent.Title}\n🗣️ Audio: ${idiomaDetectado}\n👥 Seeders: ${torrent.Seeders || 0}`,
                            url: torrent.MagnetUri || torrent.Link,
                            behaviorHints: { 
                                notSupported: false 
                            }
                        });
                    }
                });
            }

            // Ordenar de mayor a menor velocidad por cantidad de semillas
            streamsList.sort((a, b) => (b.seeders || 0) - (a.seeders || 0));
            
            resolve({ streams: streamsList });
        })
        .catch(error => {
            console.error(`[Error de Rastreo]:`, error.message);
            resolve({ streams: [] });
        });
    });
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: port });
