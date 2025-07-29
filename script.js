// --- Variables Globales ---
// URLs de tus hojas de Google Sheets (¡ASEGÚRATE DE QUE ESTÉN PUBLICADAS PÚBLICAMENTE!)
// Reemplaza estos placeholders con los URLs reales de tus hojas publicadas.
const URL_BANDAS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgsG2ogpA4J9oZNSFbnSKRr-YNSTTC5VVjVoEdf7gpd/pub?output=csv'; // Ejemplo de URL CSV
const URL_INTEGRANTES = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgsG2ogpA4J9oZNSFbnSKRr-YNSTTC5VVjVoEdf7gpd/pub?output=csv'; // Ejemplo de URL CSV
const URL_EVENTOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgsG2ogpA4J9oZNSFbnSKRr-YNSTTC5VVjVoEdf7gpd/pub?output=csv'; // Ejemplo de URL CSV
const URL_MULTIMEDIA = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgsG2ogpA4J9oZNSFbnSKRr-YNSTTC5VVjVoEdf7gpd/pub?output=csv'; // Ejemplo de URL CSV


let todasLasBandas = [];
let todosLosIntegrantes = [];
let todosLosEventos = [];
let todaLaMultimedia = [];

// Referencias a elementos del DOM
const bandasContainer = document.getElementById('bandasContainer');
const integrantesContainer = document.getElementById('integrantesContainer');
const eventosContainer = document.getElementById('eventosContainer');
const multimediaContainer = document.getElementById('multimediaContainer');
const bandasAlfabeticoContainer = document.getElementById('bandasAlfabeticoContainer'); // Contenedor para el listado alfabético de bandas

const buscarGlobalInput = document.getElementById('buscarGlobalInput');
const buscarGlobalBtn = document.getElementById('buscarGlobalBtn');
const buscarBandasInput = document.getElementById('buscarBandasInput');
const buscarBandasBtn = document.getElementById('buscarBandasBtn');

// Referencias a los contenedores de elementos históricos y galería multimedia
const eventosHistoricosDiv = document.getElementById('eventosHistoricosDiv');
const galeriaMultimediaDiv = document.getElementById('galeriaMultimediaDiv');

// Botón "Ver más bandas" (se mantiene por si acaso, aunque no se usa en el listado alfabético)
const loadMoreBandsBtn = document.getElementById('loadMoreBandsBtn');

// --- Funciones de Carga de Datos ---

/**
 * Carga datos desde una URL de Google Sheet y los parsea a un array de objetos.
 * @param {string} url - La URL pública de la hoja de cálculo.
 * @param {string} sheetName - El nombre de la hoja (para logs).
 * @returns {Promise<Array<Object>>} - Una promesa que resuelve con los datos parseados.
 */
async function cargarDatosDesdeSheet(url, sheetName) {
    console.log(`DEBUG: Intentando cargar ${sheetName} desde: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            // Si la respuesta no es 2xx (ej. 404, 500)
            const errorText = await response.text();
            throw new Error(`Error HTTP ${response.status} al cargar ${sheetName}: ${response.statusText} - ${errorText}`);
        }
        const csvText = await response.text();
        console.log(`DEBUG: ${sheetName} cargados correctamente. Datos CSV recibidos.`);
        return parsearCSV(csvText);
    } catch (error) {
        console.error(`ERROR al cargar ${sheetName}:`, error);
        // Dependiendo del error, podrías mostrar un mensaje al usuario
        // alert(`No se pudieron cargar los datos de ${sheetName}. Por favor, verifica la conexión o la configuración de la hoja.`);
        return []; // Retornar un array vacío para que la aplicación no falle
    }
}

/**
 * Parsea un string CSV a un array de objetos.
 * La primera fila se usa como cabeceras de los objetos.
 * @param {string} csv - El string en formato CSV.
 * @returns {Array<Object>} - Array de objetos representando las filas del CSV.
 */
function parsearCSV(csv) {
    const lines = csv.split('\n').filter(line => line.trim() !== ''); // Filtrar líneas vacías
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(header => header.trim()); // Limpiar espacios de los encabezados
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(value => value.trim()); // Limpiar espacios de los valores
        if (values.length === headers.length) {
            const rowObject = {};
            headers.forEach((header, index) => {
                rowObject[header] = values[index];
            });
            data.push(rowObject);
        } else {
            console.warn(`WARN: Fila CSV con número de columnas inconsistente en la línea ${i + 1}:`, lines[i]);
        }
    }
    return data;
}

/**
 * Inicializa la carga de todos los datos necesarios al cargar la página.
 */
async function inicializarDatos() {
    console.log("DEBUG: Iniciando carga de datos iniciales.");
    try {
        [todasLasBandas, todosLosIntegrantes, todosLosEventos, todaLaMultimedia] = await Promise.all([
            cargarDatosDesdeSheet(URL_BANDAS, 'Bandas'),
            cargarDatosDesdeSheet(URL_INTEGRANTES, 'Integrantes'),
            cargarDatosDesdeSheet(URL_EVENTOS, 'Eventos'),
            cargarDatosDesdeSheet(URL_MULTIMEDIA, 'Multimedia')
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
            bandasAlfabeticoContainer.innerHTML = '<p>Lo sentimos, no pudimos cargar los datos. Por favor, inténtalo de nuevo más tarde o contacta al administrador.</p>';
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
        const primeraLetra = banda.Nombre_Banda ? banda.Nombre_Banda.charAt(0).toUpperCase() : '#'; // Usa '#' para bandas sin nombre
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
        // Asegúrate de que ID_Banda existe y no está vacío antes de intentar split
        const int_ID_Banda_RAW = integrante.ID_Banda;
        console.log("DEBUG: Procesando integrante:", integrante.Nombre_Integrante, 'ID_Banda del integrante RAW:', int_ID_Banda_RAW);

        if (!int_ID_Banda_RAW || int_ID_Banda_RAW.trim() === '') {
            console.log("DEBUG: Integrante sin ID_Banda o ID_Banda vacío (return false):", integrante.Nombre_Integrante);
            return false; // Si el integrante no tiene ID_Banda, no lo incluimos
        }

        const integranteBandasIDs = int_ID_Banda_RAW.split(',').map(id => id.trim());
        console.log("DEBUG: IDs de banda del integrante (parseados):", integranteBandasIDs);

        const isMatch = integranteBandasIDs.includes(bandaSeleccionada.ID_Banda);
        console.log("DEBUG: Coincide el ID de banda (", bandaSeleccionada.ID_Banda, ") con el integrante?", isMatch, integrante.Nombre_Integrante);
        return isMatch;
    });
    const nombresIntegrantes = integrantesDeBanda.map(int => int.Nombre_Integrante).join(', ') || 'No disponibles';
    console.log("DEBUG: Nombres de integrantes resultantes:", nombresIntegrantes);

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
        // Formatear la fecha si existe
        const fecha = evento.Fecha ? new Date(evento.Fecha).toLocaleDateString() : 'Sin fecha';
        return `${evento.Descripcion || 'Evento sin título'} (${fecha})`;
    }).join('\n- ') || 'Ninguno';

    // Filtrar multimedia relacionada con esta banda
    const multimediaRelacionada = todaLaMultimedia.filter(multimedia => {
        // Asegúrate de que Tipo_Relacion y ID_Item_Relacionado existen
        if (!multimedia.Tipo_Relacion || !multimedia.ID_Item_Relacionado) {
            return false;
        }
        return multimedia.Tipo_Relacion === 'Banda' && multimedia.ID_Item_Relacionado === bandaSeleccionada.ID_Banda;
    });

    let multimediaDetail = multimediaRelacionada.length > 0 ? '\nMultimedia relacionada:\n' : 'Multimedia: Ninguno';
    multimediaRelacionada.forEach(media => {
        let mediaLink = 'N/A';
        // Si es un video de YouTube, mostrar el enlace directamente
        if (media.Tipo === 'Video' && media.URL) {
            // Expresión regular para extraer el ID de video de YouTube de varias URLs
            const youtubeRegex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|watch\?v=|youtu\.be\/|\/v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
            const videoMatch = media.URL.match(youtubeRegex);
            if (videoMatch && videoMatch[1]) {
                mediaLink = `https://www.youtube.com/watch?v=${videoMatch[1]}`;
            } else {
                mediaLink = media.URL; // Enlace original si no es un video de YouTube o no se puede parsear
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
        `Biografía: ${bandaSeleccionada.Biografia || 'No disponibles'}\n` +
        `Integrantes: ${nombresIntegrantes}\n\n` +
        `Eventos Participados: ${nombresEventos}\n\n` +
        multimediaDetail
    );
}


// --- Búsqueda Global (Integrantes, Eventos, Géneros) ---
/**
 * Inicializa la funcionalidad de búsqueda global.
 */
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

/**
 * Realiza una búsqueda global en bandas, integrantes y eventos.
 */
function realizarBusquedaGlobal() {
    const searchTerm = buscarGlobalInput.value.toLowerCase();
    console.log("DEBUG: Realizando búsqueda global para:", searchTerm);

    // Buscar en bandas (por nombre o género)
    const resultadosBandas = todasLasBandas.filter(banda =>
        (banda.Nombre_Banda && banda.Nombre_Banda.toLowerCase().includes(searchTerm)) ||
        (banda.Genero && banda.Genero.toLowerCase().includes(searchTerm))
    );

    // Buscar en integrantes (por nombre o instrumento)
    const resultadosIntegrantes = todosLosIntegrantes.filter(integrante =>
        (integrante.Nombre_Integrante && integrante.Nombre_Integrante.toLowerCase().includes(searchTerm)) ||
        (integrante.Instrumento && integrante.Instrumento.toLowerCase().includes(searchTerm))
    );

    // Buscar en eventos (por descripción, fecha o lugar)
    const resultadosEventos = todosLosEventos.filter(evento =>
        (evento.Descripcion && evento.Descripcion.toLowerCase().includes(searchTerm)) ||
        (evento.Fecha && evento.Fecha.toLowerCase().includes(searchTerm)) ||
        (evento.Lugar && evento.Lugar.toLowerCase().includes(searchTerm))
    );

    // Mostrar resultados (aquí podrías hacer algo más sofisticado, como renderizar en diferentes secciones)
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

    // Mostrar en el contenedor de resultados de búsqueda (asumiendo que tienes uno)
    const searchResultsDiv = document.getElementById('searchResults');
    if (searchResultsDiv) {
        searchResultsDiv.innerHTML = resultadosHTML;
        // Añadir event listeners a los nuevos botones "Ver más"
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
/**
 * Inicializa la funcionalidad de búsqueda de bandas.
 */
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

/**
 * Realiza una búsqueda de bandas por nombre o género.
 */
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
    inicializarBusquedaBandas(); // Asegúrate de que esta función exista si tienes un segundo formulario de búsqueda

    // Inicializar secciones de eventos históricos y galería multimedia
    // Estas funciones son placeholders si no tienen contenido dinámico por ahora
    if (eventosHistoricosDiv) {
        eventosHistoricosDiv.innerHTML = `
            <h2>Eventos históricos</h2>
            <p>Eventos disponibles próximamente (o muestra aquí los eventos).</p>
        `;
        console.log("DEBUG: Elemento eventosHistoricosDiv encontrado.");
    } else {
        console.warn("DEBUG: Elemento eventosHistoricosDiv no encontrado.");
    }

    if (galeriaMultimediaDiv) {
        galeriaMultimediaDiv.innerHTML = `
            <h2>Galería multimedia</h2>
            <p>Contenido multimedia disponible próximamente (o muestra aquí el contenido).</p>
        `;
        console.log("DEBUG: Elemento galeriaMultimediaDiv encontrado.");
    } else {
        console.warn("DEBUG: Elemento galeriaMultimediaDiv no encontrado.");
    }

    // Listener para el botón de "Descargar" el libro (si existe)
    const downloadBookBtn = document.getElementById('downloadBookBtn');
    if (downloadBookBtn) {
        downloadBookBtn.addEventListener('click', () => {
            alert('Haz clic en Aceptar para descargar el libro en formato PDF.');
            // Aquí iría la lógica para iniciar la descarga, por ejemplo:
            // window.open('ruta/a/tu/libro.pdf', '_blank');
        });
    }
});
