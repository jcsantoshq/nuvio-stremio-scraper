/**
 * Servidor Add-on de Stremio / Nuvio / WuPlay
 * Versión 1.8.0 - Servidor Nativo Express (A prueba de fallos en Render)
 */

const express = require('express');
const needle = require('needle');
const app = express();

// Habilitar CORS para que WuPlay y Stremio puedan consultar desde el navegador
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json');
    next();
});

// El Manifiesto que las aplicaciones leen para instalar el Add-on
const manifest = {
    id: "com.misniper.espanol.addon",
    version: "1.8.0", 
    name: "Catálogo Torrent Español",
    description: "Busca enlaces en español (Latino/Castellano) usando Jackett local.",
    resources: ["stream"],
    types: ["movie", "series"], 
    idPrefixes: ["tt"],        
    catalogs: []
};

// Ruta 1: Entrega el Manifiesto básico
app.get('/manifest.json', (req, res) => {
    res.json(manifest);
});

// Ruta 2: Manejador de las transmisiones de video (Streams)
app.get('/stream/:type/:id.json', (req, res) => {
    const mediaId = req.params.id; // Recibe el ID de IMDb (ej: tt1234567)
    console.log(`[Jackett Scraper] Solicitando streams para ID: ${mediaId}`);

    const tuUrlDeTunnel = 'https://proud-humans-nail.loca.lt';
    const apiKeyJackett = 'l8lph3swn1dy6oakjafitgxtiunr1cix'; 
    const jackettSearchUrl = `${tuUrlDeTunnel}/api/v2.0/indexers/all/results?apikey=${apiKeyJackett}&Query=${mediaId}`;

    const options = {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        open_timeout: 8000
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

        // Ordenar los resultados por cantidad de semillas
        streamsList.sort((a, b) => {
            const seedsA = parseInt(a.title.split("Seeders: ")[1]) || 0;
            const seedsB = parseInt(b.title.split("Seeders: ")[1]) || 0;
            return seedsB - seedsA;
        });
        
        res.json({ streams: streamsList });
    })
    .catch(error => {
        console.error(`[Error de Rastreo]:`, error.message);
        res.json({ streams: [] });
    });
});

// Forzar respuesta vacía para rutas secundarias que pide Stremio por defecto
app.get('*', (req, res) => {
    res.json({});
});

const port = process.env.PORT || 7000;
app.listen(port, () => {
    console.log(`🚀 Servidor Express activo en puerto ${port}`);
});
