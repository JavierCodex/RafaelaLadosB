// --- CONSTANTES GLOBALES Y URLS DE LA API DE GOOGLE SHEETS ---
const API_KEY = 'AIzaSyAP4nFhq5mON1hT0yllhtT9uj8zqPjw-3E'; // ¡Reemplaza con tu clave real si es diferente!
const SPREADSHEET_ID = '19g6yEmw7goAvQLSO5sGu87rHpEPRSknr-YNSTFCSrVY'; // ¡Reemplaza con tu ID real si es diferente!

// URLs de la API para cada hoja, solicitando el formato JSON y valores formateados
const URL_BANDAS_API_JSON = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Bandas?key=${API_KEY}&valueRenderOption=FORMATTED_VALUE`;
const URL_INTEGRANTES_API_JSON = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Integrantes?key=${API_KEY}&valueRenderOption=FORMATTED_VALUE`;
const URL_EVENTOS_API_JSON = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Eventos?key=${API_KEY}&valueRenderOption=FORMATTED_VALUE`;
const URL_MULTIMEDIA_API_JSON = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Multimedia?key=${API_KEY}&valueRenderOption=FORMATTED_VALUE`;
// --- FIN CONSTANTES GLOBALES ---

let todasLasBandas = [];
let todosLosIntegrantes = [];
let todosLosEventos = [];
let todaLaMultimedia = [];

// Referencias a elementos del DOM
const bandasContainer = document.getElementById('bandasContainer'); // Este ya no se usa para el listado alfabético
const integrantesContainer = document.getElementById('integrantesContainer'); // Podrías querer usarlo para mostrar detalles
const eventosContainer = document.getElementById('eventosContainer'); // Podrías querer usarlo para mostrar detalles
const multimediaContainer = document.getElementById('multimediaContainer'); // Podrías querer usarlo para mostrar detalles

const bandasAlfabeticoContainer = document.getElementById('bandasAlfabeticoContainer'); // Contenedor para el listado alfabético de bandas

const buscarGlobalInput = document.getElementById('buscarGlobalInput');
const buscarGlobalBtn = document.getElementById('buscarGlobalBtn');
const buscarBandasInput = document.getElementById('buscarBandasInput');
const buscarBandasBtn = document.getElementById('buscarBandasBtn');

const eventosHistoricosDiv = document.getElementById('eventosHistoricosDiv');
const galeriaMultimediaDiv = document.getElementById('galeriaMultimediaDiv');
const loadMoreBandsBtn = document.getElementById('loadMoreBandsBtn'); // No se usa con el listado alfabético completo


// --- Funciones de Carga de Datos (Usando Google Sheets API) ---

/**
 * Carga datos desde una URL de la Google Sheets API y los parsea.
 * @param {string} url - La URL de la API para la hoja.
 * @param {string} sheetName - El nombre de la hoja (para logs y mensajes de error).
 * @returns {Promise<Array<Object>>} - Una promesa que resuelve con los datos parseados.
 */
async function cargarDatosDesdeSheetAPI(url, sheetName) {
    console.log(`DEBUG: Intentando cargar ${sheetName} desde API: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            // Intenta leer el mensaje de error de la API si está disponible
            let errorDetail = response.statusText;
            try {
                const errorJson = await response.json();
                if (errorJson && errorJson.error && errorJson.error.message) {
                    errorDetail = errorJson.error.message;
                }
            } catch (e) {
                // No se pudo parsear el error JSON
            }
            throw new Error(`Error HTTP ${response.status} al cargar ${sheetName} (API): ${errorDetail}`);
        }
        const data = await response.json();
        console.log(`DEBUG: ${sheetName} cargados correctamente. Datos JSON de API recibidos.`, data);
        return parsearJSONDesdeAPI(data.values); // Los datos están en data.values
    } catch (error) {
        console.error(`ERROR al cargar ${sheetName} (API):`, error);
        // Sugerir posibles causas al usuario si es un error de API Key/Permisos
        if (error.message.includes('API Key not valid') || error.message.includes('PERMISSION_DENIED')) {
            alert(`ATENCIÓN: Error de Google Sheets API para "${sheetName}". Posiblemente la API Key es incorrecta, la API no está habilitada en Google Cloud, o la hoja no es pública/accesible. Verifica la consola para más detalles.`);
        } else {
            alert(`No se pudieron cargar los datos de ${sheetName}. Por favor, verifica la conexión o la configuración de la hoja.`);
        }
        return []; // Retornar un array vacío para que la aplicación no falle
    }
}

/**
 * Parsea el array de arrays de la respuesta de la Google Sheets API a un array de objetos.
 * La primera fila se usa como cabeceras.
 * @param {Array<Array<string>>} values - El array de arrays de datos de la API.
 * @returns {Array<Object>} - Array de objetos representando las filas.
 */
function parsearJSONDesdeAPI(values) {
    if (!values || values.length === 0) return [];

    const headers = values[0].map(header => header.trim());
    const data = [];

    for (let i = 1; i < values.length; i++) {
        const row = values[i];
        if (row.length === headers.length) {
            const rowObject = {};
            headers.forEach((header, index) => {
                rowObject[header] = row[index] ? row[index].trim() : ''; // Asegurarse de que el valor exista antes de trim
            });
            data.push(rowObject);
        } else {
            console.warn(`WARN: Fila de API con número de columnas inconsistente en la línea ${i + 1}. Esperado ${headers.length}, Obtenido ${row.length}.`, row);
        }
    }
    return data;
}

/**
 * Inicializa la carga de todos los datos necesarios al cargar la página.
 */
async function inicializarDatos() {
    console.log("DEBUG: Iniciando carga de datos iniciales usando Google Sheets API.");
    try {
        [todasLasBandas, todosLosIntegrantes, todosLosEventos, todaLaMultimedia] = await Promise.all([
            cargarDatosDesdeSheetAPI(URL_BANDAS_API_JSON, 'Bandas'),
            cargarDatosDesdeSheetAPI(URL_INTEGRANTES_API_JSON, 'Integrantes'),
            cargarDatosDesdeSheetAPI(URL_EVENTOS_API_JSON, 'Eventos'),
            cargarDatosDesdeSheetAPI(URL_MULTIMEDIA_API_JSON, 'Multimedia')
        ]);

        console.log(`DEBUG: Datos iniciales cargados. Cantidad de:`);
        console.log(`DEBUG: - Bandas: ${todasLasBandas.length}`);
        console.log(`DEBUG: - Integrantes: ${todosLosIntegrantes.length}`);
        console.log(`DEBUG: - Eventos: ${todosLosEventos.length}`);
        console.log(`DEBUG: - Multimedia: ${todaLaMultimedia.length}`);

        // Una vez cargados, mostrar las bandas alfabéticamente
        mostrarBandasEnCardsAlfabetico(todasLasBandas);

    } catch (error) {
        console.error("ERROR: Fallo en la inicialización de datos:", error);
        if (bandasAlfabeticoContainer) {
            bandasAlfabeticoContainer.innerHTML = '<p>Lo sentimos, no pudimos cargar los datos. Por favor, asegúrate de que tu API Key sea válida y que las hojas estén configuradas correctamente.</p>';
        }
    }
}


// --- Funciones de Renderizado ---

/**
 * Muestra las bandas en el contenedor alfabético, agrupadas por la primera letra.
 * Implementa el patrón de acordeón con encabezados en grid.
 * @param {Array<Object>} bandasAMostrar - Las bandas a renderizar.
 */
function mostrarBandasEnCardsAlfabetico(bandasAMostrar) {
    if (!bandasAlfabeticoContainer) {
        console.error("DEBUG: Elemento #bandasAlfabeticoContainer no encontrado. No se pueden mostrar las bandas.");
        return;
    }
    bandasAlfabeticoContainer.innerHTML = ''; // Limpiar contenido anterior

    if (bandasAMostrar.length === 0) {
        bandasAlfabeticoContainer.innerHTML = '<p>No se encontraron bandas que coincidan con la búsqueda.</p>';
        return;
    }

    // Agrupar bandas por la primera letra de su nombre
    const gruposPorLetra = {};
    bandasAMostrar.forEach(banda => {
        // Asegúrate de que Nombre_Banda exista antes de acceder a charAt(0)
        const primeraLetra = banda.Nombre_Banda ? banda.Nombre_Banda.charAt(0).toUpperCase() : '#';
        if (!gruposPorLetra[primeraLetra]) {
            gruposPorLetra[primeraLetra] = [];
        }
        gruposPorLetra[primeraLetra].push(banda);
    });

    // Ordenar las letras alfabéticamente
    const letrasOrdenadas = Object.keys(gruposPorLetra).sort();

    // Crear el contenedor del grid para los encabezados de las letras
    const accordionGridHeaders = document.createElement('div');
    accordionGridHeaders.classList.add('accordion-grid-headers');
    bandasAlfabeticoContainer.appendChild(accordionGridHeaders);

    // Iterar sobre las letras para crear los encabezados y sus contenidos asociados
    letrasOrdenadas.forEach(letra => {
        const bandasDeEstaLetra = gruposPorLetra[letra].sort((a, b) => {
            if (a.Nombre_Banda && b.Nombre_Banda) {
                return a.Nombre_Banda.localeCompare(b.Nombre_Banda);
            }
            return 0;
        });

        // Crear el encabezado de la letra para el grid
        const accordionHeader = document.createElement('div');
        accordionHeader.classList.add('accordion-header');
        accordionHeader.innerHTML = `<h3>${letra} (${bandasDeEstaLetra.length})</h3>`;
        accordionHeader.dataset.letter = letra; // Para identificar esta letra

        // Crear el contenedor del contenido de la banda (inicialmente oculto)
        const accordionContent = document.createElement('div');
        accordionContent.classList.add('accordion-content');
        accordionContent.dataset.letter = letra; // También para identificar el contenido
        accordionContent.style.display = 'none'; // Por defecto, oculto

        bandasDeEstaLetra.forEach(banda => {
            const bandaCard = document.createElement('div');
            bandaCard.classList.add('band-card');
            bandaCard.innerHTML = `
                <h3>${banda.Nombre_Banda || 'Nombre no disponible'}</h3>
                <p>Género: ${banda.Genero || 'No disponible'}</p>
                <p>Años de actividad: ${banda.Anos_Actividad || 'Sin fecha'}</p>
                <button class="ver-mas-btn" data-id="${banda.ID_Banda}">Ver más</button>
            `;
            bandaCard.querySelector('.ver-mas-btn').addEventListener('click', () => {
                mostrarDetalleBanda(banda);
            });
            accordionContent.appendChild(bandaCard);
        });

        // Añadir el encabezado al grid de encabezados
        accordionGridHeaders.appendChild(accordionHeader);
        // Añadir el contenido al contenedor principal (se mostrará debajo de la cuadrícula)
        bandasAlfabeticoContainer.appendChild(accordionContent);

        // Lógica de clic para mostrar/ocultar el contenido
        accordionHeader.addEventListener('click', () => {
            // Ocultar todos los contenidos de acordeón abiertos
            document.querySelectorAll('.accordion-content').forEach(content => {
                if (content.dataset.letter !== letra) { // Si no es el contenido de la letra actual
                    content.style.display = 'none';
                }
            });
            // Remover la clase 'active' de todos los headers
            document.querySelectorAll('.accordion-header').forEach(header => {
                if (header.dataset.letter !== letra) { // Si no es el header de la letra actual
                    header.classList.remove('active');
                }
            });

            // Alternar la visibilidad del contenido actual y la clase 'active' del header
            const isVisible = accordionContent.style.display === 'block';
            accordionContent.style.display = isVisible ? 'none' : 'block';
            accordionHeader.classList.toggle('active', !isVisible);
        });
    });

    // Ocultar el botón de cargar más si existe, ya que todas las bandas se renderizarán alfabéticamente
    if (loadMoreBandsBtn) {
        loadMoreBandsBtn.style.display = 'none';
    }
}


/**
 * Muestra los detalles de una banda en una alerta/modal.
 * @param {Object} bandaSeleccionada - El objeto de la banda seleccionada.
 */
function mostrarDetalleBanda(bandaSeleccionada) {
    console.log("DEBUG: Banda seleccionada para detalle:", bandaSeleccionada.Nombre_Banda, 'ID:', bandaSeleccionada.ID_Banda);

    // Filtrar integrantes de esta banda
    const integrantesDeBanda = todosLosIntegrantes.filter(integrante => {
        const int_ID_Banda_RAW = integrante.ID_Banda;
        if (!int_ID_Banda_RAW || int_ID_Banda_RAW.trim() === '') {
            return false;
        }
        const integranteBandasIDs = int_ID_Banda_RAW.split(',').map(id => id.trim());
        return integranteBandasIDs.includes(bandaSeleccionada.ID_Banda);
    });
    const nombresIntegrantes = integrantesDeBanda.map(int => int.Nombre_Integrante).join(', ') || 'No disponibles';

    // Filtrar eventos donde participe esta banda
    const eventosParticipados = todosLosEventos.filter(evento => {
        const evento_Bandas_Participantes_IDs_RAW = evento.Bandas_Participantes_IDs;
        if (!evento_Bandas_Participantes_IDs_RAW || evento_Bandas_Participantes_IDs_RAW.trim() === '') {
            return false;
        }
        const eventoBandasIDs = evento_Bandas_Participantes_IDs_RAW.split(',').map(id => id.trim());
        return eventoBandasIDs.includes(bandaSeleccionada.ID_Banda);
    });
    const nombresEventos = eventosParticipados.map(evento => {
        const fecha = evento.Fecha ? new Date(evento.Fecha).toLocaleDateString() : 'Sin fecha';
        return `${evento.Descripcion || 'Evento sin título'} (${fecha})`;
    }).join('\n- ') || 'Ninguno';

    // Filtrar multimedia relacionada con esta banda
    const multimediaRelacionada = todaLaMultimedia.filter(multimedia => {
        if (!multimedia.Tipo_Relacion || !multimedia.ID_Item_Relacionado) {
            return false;
        }
        return multimedia.Tipo_Relacion === 'Banda' && multimedia.ID_Item_Relacionado === bandaSeleccionada.ID_Banda;
    });

    let multimediaDetail = multimediaRelacionada.length > 0 ? '\nMultimedia relacionada:\n' : 'Multimedia: Ninguno';
    multimediaRelacionada.forEach(media => {
        let mediaLink = 'N/A';
        if (media.Tipo === 'Video' && media.URL) {
            const youtubeRegex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|watch\?v=|youtu\.be\/|\/v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
            const videoMatch = media.URL.match(youtubeRegex);
            if (videoMatch && videoMatch[1]) {
                mediaLink = `https://www.youtube.com/watch?v=${videoMatch[1]}`;
            } else {
                mediaLink = media.URL;
            }
        } else if (media.URL) {
            mediaLink = media.URL;
        }

        multimediaDetail += `- ${media.Descripcion || 'Sin descripción'} (Tipo: ${media.Tipo || 'N/A'}) [${mediaLink}]\n`;
    });

    alert(
        `Detalle de Banda: ${bandaSeleccionada.Nombre_Banda || 'N/A'}\n` +
        `Género: ${bandaSeleccionada.Genero || 'N/A'}\n` +
        `Años de actividad: ${bandaSeleccionada.Anos_Actividad || 'Sin fecha'}\n` +
        `Biografía: ${bandaSeleccionada.Biografia || 'No disponible'}\n` +
        `Integrantes: ${nombresIntegrantes}\n\n` +
        `Eventos Participados:\n- ${nombresEventos}\n\n` +
        multimediaDetail
    );
}


// --- Búsqueda Global (Integrantes, Eventos, Géneros) ---
function inicializarBusquedaGlobal() {
    if (buscarGlobalBtn && buscarGlobalInput) {
        buscarGlobalBtn.addEventListener('click', realizarBusquedaGlobal);
        buscarGlobalInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                realizarBusquedaGlobal();
            }
        });
        console.log("DEBUG: Elementos de búsqueda global encontrados e inicializados.");
    } else {
        console.warn("DEBUG: Elementos de búsqueda global no encontrados.");
    }
}

function realizarBusquedaGlobal() {
    const searchTerm = buscarGlobalInput.value.toLowerCase();
    console.log("DEBUG: Realizando búsqueda global para:", searchTerm);

    const resultadosBandas = todasLasBandas.filter(banda =>
        (banda.Nombre_Banda && banda.Nombre_Banda.toLowerCase().includes(searchTerm)) ||
        (banda.Genero && banda.Genero.toLowerCase().includes(searchTerm))
    );

    const resultadosIntegrantes = todosLosIntegrantes.filter(integrante =>
        (integrante.Nombre_Integrante && integrante.Nombre_Integrante.toLowerCase().includes(searchTerm)) ||
        (integrante.Instrumento && integrante.Instrumento.toLowerCase().includes(searchTerm))
    );

    const resultadosEventos = todosLosEventos.filter(evento =>
        (evento.Descripcion && evento.Descripcion.toLowerCase().includes(searchTerm)) ||
        (evento.Fecha && evento.Fecha.toLowerCase().includes(searchTerm)) ||
        (evento.Lugar && evento.Lugar.toLowerCase().includes(searchTerm))
    );

    let resultadosHTML = '<h4>Resultados de Búsqueda:</h4>';

    if (resultadosBandas.length > 0) {
        resultadosHTML += '<h5>Bandas:</h5>';
        resultadosBandas.forEach(banda => {
            resultadosHTML += `<p>${banda.Nombre_Banda} (Género: ${banda.Genero || 'N/A'}) <button class="ver-mas-btn" data-id="${banda.ID_Banda}" data-type="banda">Ver más</button></p>`;
        });
    } else {
        resultadosHTML += '<p>No se encontraron bandas.</p>';
    }

    if (resultadosIntegrantes.length > 0) {
        resultadosHTML += '<h5>Integrantes:</h5>';
        resultadosIntegrantes.forEach(integrante => {
            resultadosHTML += `<p>${integrante.Nombre_Integrante} (Instrumento: ${integrante.Instrumento || 'N/A'})</p>`;
        });
    } else {
        resultadosHTML += '<p>No se encontraron integrantes.</p>';
    }

    if (resultadosEventos.length > 0) {
        resultadosHTML += '<h5>Eventos:</h5>';
        resultadosEventos.forEach(evento => {
            resultadosHTML += `<p>${evento.Descripcion} (Fecha: ${evento.Fecha || 'N/A'}, Lugar: ${evento.Lugar || 'N/A'})</p>`;
        });
    } else {
        resultadosHTML += '<p>No se encontraron eventos.</p>';
    }

    const searchResultsDiv = document.getElementById('searchResults');
    if (searchResultsDiv) {
        searchResultsDiv.innerHTML = resultadosHTML;
        searchResultsDiv.querySelectorAll('.ver-mas-btn[data-type="banda"]').forEach(button => {
            button.addEventListener('click', () => {
                const bandaId = button.dataset.id;
                const banda = todasLasBandas.find(b => b.ID_Banda === bandaId);
                if (banda) {
                    mostrarDetalleBanda(banda);
                }
            });
        });
    } else {
        console.warn("DEBUG: Elemento #searchResults no encontrado para mostrar resultados de búsqueda global.");
    }
}


// --- Búsqueda de Bandas Específica ---
function inicializarBusquedaBandas() {
    if (buscarBandasBtn && buscarBandasInput) {
        buscarBandasBtn.addEventListener('click', realizarBusquedaBandas);
        buscarBandasInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                realizarBusquedaBandas();
            }
        });
        console.log("DEBUG: Elementos de búsqueda de bandas encontrados e inicializados.");
    } else {
        console.warn("DEBUG: Elementos de búsqueda de bandas no encontrados.");
    }
}

function realizarBusquedaBandas() {
    const searchTerm = buscarBandasInput.value.toLowerCase();
    console.log("DEBUG: Realizando búsqueda de bandas para:", searchTerm);

    const resultadosFiltrados = todasLasBandas.filter(banda =>
        (banda.Nombre_Banda && banda.Nombre_Banda.toLowerCase().includes(searchTerm)) ||
        (banda.Genero && banda.Genero.toLowerCase().includes(searchTerm))
    );
    mostrarBandasEnCardsAlfabetico(resultadosFiltrados);
}


// --- Inicialización al Cargar la Página ---
document.addEventListener('DOMContentLoaded', () => {
    inicializarDatos();
    inicializarBusquedaGlobal();
    inicializarBusquedaBandas();

    if (eventosHistoricosDiv) {
        eventosHistoricosDiv.innerHTML = `
            <h2>Eventos históricos</h2>
            <p>Listado de eventos disponible en breve.</p>
        `;
        console.log("DEBUG: Elemento eventosHistoricosDiv encontrado.");
    } else {
        console.warn("DEBUG: Elemento eventosHistoricosDiv no encontrado.");
    }

    if (galeriaMultimediaDiv) {
        galeriaMultimediaDiv.innerHTML = `
            <h2>Galería multimedia</h2>
            <p>Contenido multimedia disponible en breve.</p>
        `;
        console.log("DEBUG: Elemento galeriaMultimediaDiv encontrado.");
    } else {
        console.warn("DEBUG: Elemento galeriaMultimediaDiv no encontrado.");
    }

    const downloadBookBtn = document.getElementById('downloadBookBtn');
    if (downloadBookBtn) {
        downloadBookBtn.addEventListener('click', () => {
            alert('Haz clic en Aceptar para descargar el libro en formato PDF.');
            // Aquí iría la lógica para iniciar la descarga:
            // window.open('ruta/a/tu/libro.pdf', '_blank');
        });
    }
});
