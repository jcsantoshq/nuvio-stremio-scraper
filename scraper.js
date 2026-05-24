/**
 * Servidor Add-on de Stremio / Nuvio / WuPlay
 * Proveedor Real: Conexión con Jackett Local (DonTorrent, EliteTorrent, 1337x)
 * URL del Túnel: https://proud-humans-nail.loca.lt
 */

const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');

const manifest = {
    id: "com.misniper.espanol.addon",
    version: "1.4.0",
    name: "Catálogo Torrent Español",
    description: "Servidor que jala enlaces en español (Latino/Castellano) usando tu Jackett local y FlareSolverr.",
    resources: ["stream"],
    types: ["movie", "series"],
    idPrefixes: ["tt"], 
    catalogs: []
};

const builder = new addonBuilder(manifest);

builder.defineStreamHandler((args) => {
    const mediaId = args.id; // Recibe el ID de IMDb (ej: tt1234567)
    
    console.log(`[Jackett Scraper] Buscando transmisiones para el ID: ${mediaId}`);

    return new Promise((resolve) => {
        
        // Tu URL real de localtunnel activa en tu CMD
        const tuUrlDeTunnel = 'https://proud-humans-nail.loca.lt';
        
        // Tu API Key real de Jackett vinculada de forma segura
        const apiKeyJackett = 'l8lph3swn1dy6oakjafitgxtiunr1cix'; 

        // Ruta de consulta para que Jackett busque en todos tus indexadores configurados
        const jackettSearchUrl = `${tuUrlDeTunnel}/api/v2.0/indexers/all/results?apikey=${apiKeyJackett}&Query=${mediaId}`;

        fetch(jackettSearchUrl, {
            method: 'GET',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Error de conexión con Jackett a través del túnel');
            return response.json();
        })
        .then(data => {
            const streamsList = [];

            if (data && data.Results) {
                data.Results.forEach(torrent => {
                    // Validamos que el torrent tenga un título válido
                    if (!torrent.Title) return;

                    const nombreFichero = torrent.Title.toLowerCase();
                    let idiomaDetectado = "";

                    // Filtros avanzados para detectar audios en español (Latino, Castellano o Dual)
                    if (nombreFichero.includes("latino") || nombreFichero.includes("spa lat") || nombreFichero.includes("audio latino") || nombreFichero.includes("lat")) {
                        idiomaDetectado = "Español Latino 🇲🇽";
                    } else if (nombreFichero.includes("castellano") || nombreFichero.includes("cast") || nombreFichero.includes("español") || nombreFichero.includes("esp")) {
                        idiomaDetectado = "Castellano 🇪🇸";
                    } else if (nombreFichero.includes("dual")) {
                        idiomaDetectado = "Audio Dual (Español Incluido) 🔄";
                    }

                    // Si se confirma que viene en español, lo estructuramos para la App
                    if (idiomaDetectado !== "") {
                        let fuente = torrent.Tracker || "Jackett Source";
                        
                        streamsList.push({
                            name: `[${fuente}]`,
                            title: `${torrent.Title}\n🗣️ Audio: ${idiomaDetectado}\n👥 Seeders: ${torrent.Seeders || 0}`,
                            url: torrent.MagnetUri || torrent.Link, // Pasa el imán o enlace de reproducción directa
                            behaviorHints: { 
                                notSupported: false 
                            }
                        });
                    }
                });
            }

            // Ordenar por velocidad: los torrents con más fuentes/semillas salen arriba
            streamsList.sort((a, b) => (b.seeders || 0) - (a.seeders || 0));
            
            console.log(`[Jackett Scraper] Se encontraron ${streamsList.length} opciones válidas en español.`);
            resolve({ streams: streamsList });
        })
        .catch(error => {
            console.error(`[Error de Rastreo]:`, error.message);
            // Devolvemos lista vacía para que Stremio no se quede colgado cargando infinitamente
            resolve({ streams: [] });
        });
    });
});

const port = process.env.PORT || 7000;

serveHTTP(builder.getInterface(), { port: port }).then(() => {
    console.log(`\n==================================================`);
    console.log(`🚀 ¡Servidor en Render conectado con tu Jackett local!`);
    console.log(`🔗 Usando el túnel: https://proud-humans-nail.loca.lt`);
    console.log(`==================================================\n`);
});
