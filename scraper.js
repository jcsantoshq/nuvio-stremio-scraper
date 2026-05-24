/**
 * Servidor Add-on de Stremio / Nuvio / WuPlay
 * Proveedor Real: Pluto TV (Contenido en Español)
 */

const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');

const manifest = {
    id: "com.misniper.espanol.addon",
    version: "1.0.0",
    name: "Catálogo de Audio Español (PlutoTV)",
    description: "Servidor scraper real que jala streams gratuitos en español directamente desde Pluto TV.",
    resources: ["stream"],
    types: ["movie", "series"],
    idPrefixes: ["tt"], 
    catalogs: []
};

const builder = new addonBuilder(manifest);

// Manejador de reproducción cuando haces clic en una película/serie
builder.defineStreamHandler((args) => {
    const mediaId = args.id; // Recibe el ID de IMDb (ej: tt1234567)
    
    console.log(`[PlutoTV Scraper] Buscando transmisiones en español para ID: ${mediaId}`);

    return new Promise((resolve) => {
        // Consultamos la API pública de Pluto TV buscando coincidencia por el identificador
        // Usamos los parámetros de idioma para forzar que jale las pistas en español
        const plutoSearchUrl = `https://api.pluto.tv/v3/vod/search?id=${mediaId}&lang=es&appName=web&appVersion=9.0.0`;

        fetch(plutoSearchUrl, {
            method: 'GET',
            headers: {
                'Accept-Language': 'es-ES,es;q=0.9',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Error al conectar con los servidores de Pluto TV');
            return response.json();
        })
        .then(data => {
            const streamsList = [];

            // Si Pluto TV tiene la película en su base de datos, extraemos el enlace de video directo
            if (data && data.meta && data.streams) {
                data.streams.forEach(streamItem => {
                    streamsList.push({
                        name: "PlutoTV | Español",
                        title: `${data.title || 'Película En Español'}\nAudio: Latino / Castellano (Gratis)`,
                        url: streamItem.url, // Este es el archivo .m3u8 real que reproduce el reproductor de tu app
                        behaviorHints: {
                            notSupported: false
                        }
                    });
                });
            }

            // Si no está en Pluto TV, mandamos una lista vacía de forma segura
            resolve({ streams: streamsList });
        })
        .catch(error => {
            console.error(`[Scraper Error] No se pudo obtener contenido de Pluto TV para ${mediaId}:`, error.message);
            resolve({ streams: [] });
        });
    });
});

const port = process.env.PORT || 7000;

serveHTTP(builder.getInterface(), { port: port }).then((hostingInfo) => {
    console.log(`\n==================================================`);
    console.log(`🚀 ¡Scraper Real de Pluto TV Corriendo!`);
    console.log(`🔗 Tu URL de Manifest sigue siendo la misma.`);
    console.log(`==================================================\n`);
});
