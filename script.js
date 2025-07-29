// --- CONSTANTES GLOBALES Y URLS DE LA API DE GOOGLE SHEETS ---
// IMPORTANTE: Tu API Key. Reemplaza 'TU_API_KEY' con tu clave real.
// Para proyectos de mayor escala o con datos sensibles,
// no se recomienda exponer la API Key directamente en el frontend.
// Para este caso con datos públicos, es aceptable.
const API_KEY = 'AIzaSyAP4nFhq5mON1hT0yllhtT9uj8zqPjw-3E';

// Tu Spreadsheet ID. Reemplaza 'TU_SPREADSHEET_ID' con tu ID real.
// Este ID es el mismo para todas tus hojas de cálculo en el mismo archivo.
const SPREADSHEET_ID = '19g6yEmw7goAvQLSO5sGu87rHpEPRSknr-YNSTFCSrVY';

// URLs de la API para cada hoja, solicitando el formato JSON (&alt=json)
const URL_BANDAS_API_JSON = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Bandas?key=${API_KEY}&alt=json`;
const URL_INTEGRANTES_API_JSON = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Integrantes?key=${API_KEY}&alt=json`;
const URL_EVENTOS_API_JSON = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Eventos?key=${API_KEY}&alt=json`;
const URL_MULTIMEDIA_API_JSON = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Multimedia?key=${API_KEY}&alt=json`;
// --- FIN CONSTANTES GLOBALES ---


// Variables globales para almacenar los datos
let todosLosBandas = [];
let todosLosIntegrantes = [];
let todosLosEventos = [];
let todosLosMultimedia = [];

// Elementos del DOM (asegúrate de que los IDs coincidan con tu HTML)
const buscarInput = document.getElementById('buscar');
const buscarBtn = document.getElementById('buscarBtn');
const busquedaResultadosDiv = document.getElementById('busquedaResultados');

const buscarBandasInput = document.getElementById('buscarBandas');
const buscarBandasBtn = document.getElementById('buscarBandasBtn');
const bandasAlfabeticoContainer = document.getElementById('bandasAlfabeticoContainer'); // Contenedor para el agrupamiento alfabético
const loadMoreBandsBtn = document.getElementById('loadMoreBandsBtn'); // Podría no ser necesario o usarse diferente

const eventosHistoricosDiv = document.getElementById('eventosHistoricos');
const galeriaMultimediaDiv = document.getElementById('galeriaMultimedia');


// Función para cargar datos desde la API de Google Sheets (JSON)
async function fetchJsonData(url, type) {
    console.log(`DEBUG: Intentando cargar ${type} desde: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error al cargar ${type}: ${response.status} (${response.statusText}) - Respuesta: ${errorText} para URL: ${url}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(`DEBUG: ${type} cargados correctamente. Datos JSON recibidos.`, data);

        if (!data.values || data.values.length === 0) {
            console.warn(`Advertencia: No se encontraron datos en la hoja ${type}.`);
            return [];
        }

        const headers = data.values[0].map(header => header.trim()); // El primer array son los encabezados
        const rows = data.values.slice(1); // El resto son los datos

        return rows.map(row => {
            let obj = {};
            headers.forEach((header, index) => {
                // Asegurarse de que el valor existe, si no, usar cadena vacía y limpiar espacios
                obj[header] = row[index] !== undefined ? String(row[index]).trim() : '';
            });
            return obj;
        }).filter(obj => {
            // Filtrar filas completamente vacías (donde todos los valores son "")
            const hasAnyValue = Object.values(obj).some(val => val !== '');
            return hasAnyValue;
        });

    } catch (error) {
        console.error(`Error de red o parseo para ${type}:`, error);
        return []; // Retorna un array vacío para que el programa no se detenga y la app siga funcionando
    }
}

// Función principal para cargar todos los datos al inicio
document.addEventListener('DOMContentLoaded', () => {
    Promise.all([
        fetchJsonData(URL_BANDAS_API_JSON, 'Bandas'),
        fetchJsonData(URL_INTEGRANTES_API_JSON, 'Integrantes'),
        fetchJsonData(URL_EVENTOS_API_JSON, 'Eventos'),
        fetchJsonData(URL_MULTIMEDIA_API_JSON, 'Multimedia')
    ]).then(([bandas, integrantes, eventos, multimedia]) => {
        // Asignar los datos cargados a las variables globales
        todosLosBandas = bandas;
        todosLosIntegrantes = integrantes;
        todosLosEventos = eventos;
        todosLosMultimedia = multimedia;

        console.log("DEBUG: Datos iniciales cargados. Cantidad de:");
        console.log("DEBUG: - Bandas:", todosLosBandas.length);
        console.log("DEBUG: - Integrantes:", todosLosIntegrantes.length);
        console.log("DEBUG: - Eventos:", todosLosEventos.length);
        console.log("DEBUG: - Multimedia:", todosLosMultimedia.length);

        // Inicializar la interfaz una vez que los datos estén cargados
        mostrarBandasEnCardsAlfabetico(todosLosBandas); // Llamada a la nueva función
        inicializarEventosYMultimedia();
        inicializarBusquedaGlobal();
    })
    .catch(error => {
        console.error('Error general al cargar datos iniciales de la API:', error);
        alert('Hubo un error al cargar los datos. Por favor, inténtalo de nuevo más tarde. Revisa la consola para más detalles.');
    });
});

// --- Funciones para mostrar datos en la interfaz ---

// Nueva función para mostrar las bandas agrupadas alfabéticamente en acordeones
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
        const primeraLetra = banda.Nombre_Banda ? banda.Nombre_Banda.charAt(0).toUpperCase() : '#'; // Usa '#' para bandas sin nombre o con nombre que no empieza por letra
        if (!gruposPorLetra[primeraLetra]) {
            gruposPorLetra[primeraLetra] = [];
        }
        gruposPorLetra[primeraLetra].push(banda);
    });

    // Ordenar las letras alfabéticamente
    const letrasOrdenadas = Object.keys(gruposPorLetra).sort();

    letrasOrdenadas.forEach(letra => {
        const bandasDeEstaLetra = gruposPorLetra[letra].sort((a, b) => {
            if (a.Nombre_Banda && b.Nombre_Banda) {
                return a.Nombre_Banda.localeCompare(b.Nombre_Banda);
            }
            return 0; // Si no hay nombre, mantener el orden actual
        });

        // Crear el desplegable (acordeón) para cada letra
        const accordionItem = document.createElement('div');
        accordionItem.classList.add('accordion-item');

        const accordionHeader = document.createElement('div');
        accordionHeader.classList.add('accordion-header');
        accordionHeader.innerHTML = `<h3>${letra} (${bandasDeEstaLetra.length})</h3>`;
        accordionItem.appendChild(accordionHeader);

        const accordionContent = document.createElement('div');
        accordionContent.classList.add('accordion-content');
        // Por defecto, oculto
        accordionContent.style.display = 'none';

        bandasDeEstaLetra.forEach(banda => {
            const bandaCard = document.createElement('div');
            bandaCard.classList.add('band-card');
            bandaCard.innerHTML = `
                <h3>${banda.Nombre_Banda || 'Nombre no disponible'}</h3>
                <p>Género: ${banda.Genero || 'No disponible'}</p>
                <p>Años de actividad: ${banda.Anos_Actividad || 'Sin fecha'}</p>
                <button class="ver-mas-btn" data-id="${banda.ID_Banda}">Ver más</button>
            `;
            // Añadir el evento click al botón "Ver más" de cada tarjeta
            bandaCard.querySelector('.ver-mas-btn').addEventListener('click', () => {
                mostrarDetalleBanda(banda);
            });
            accordionContent.appendChild(bandaCard);
        });

        accordionItem.appendChild(accordionContent);
        bandasAlfabeticoContainer.appendChild(accordionItem);

        // Añadir evento para expandir/colapsar el contenido del acordeón
        accordionHeader.addEventListener('click', () => {
            const isVisible = accordionContent.style.display === 'block';
            accordionContent.style.display = isVisible ? 'none' : 'block';
            accordionHeader.classList.toggle('active', !isVisible); // Clase para estilos cuando está activo
        });
    });

    // Ocultar el botón de cargar más si existe, ya que todas las bandas se renderizarán alfabéticamente
    if (loadMoreBandsBtn) {
        loadMoreBandsBtn.style.display = 'none';
    }
}


// Función para mostrar el detalle de una banda en un alert
function mostrarDetalleBanda(bandaSeleccionada) {
    console.log(`DEBUG: Mostrar detalle para banda: ${bandaSeleccionada.Nombre_Banda} (ID: ${bandaSeleccionada.ID_Banda})`);

    // Convertir el ID de la banda seleccionada a mayúsculas y limpiar espacios
    const bandaSeleccionadaID_Upper = bandaSeleccionada.ID_Banda.trim().toUpperCase();
    console.log(`DEBUG: ID de la banda seleccionada (limpio y MAYÚSCULAS): '${bandaSeleccionadaID_Upper}'`);

    // Filtrar integrantes de la banda seleccionada
    const integrantesFiltrados = todosLosIntegrantes.filter(int => {
        console.log(`DEBUG: Procesando integrante: ${int.Nombre_Integrante || 'N/A'} ID_Banda del integrante RAW: '${int.ID_Banda}'`);

        if (!int.ID_Banda || int.ID_Banda.trim() === '') {
            console.log(`DEBUG: Integrante sin ID_Banda o ID_Banda vacío. Saltando: ${int.Nombre_Integrante}`);
            return false;
        }

        // Dividir la cadena de ID_Banda, limpiar espacios, convertir a mayúsculas y filtrar elementos vacíos
        const integranteBandasIDs = int.ID_Banda.split(',').map(id => id.trim().toUpperCase()).filter(id => id !== '');
        console.log(`DEBUG: IDs de banda del integrante (parseados a MAYÚSCULAS y limpios):`, integranteBandasIDs);


        const isMatch = integranteBandasIDs.includes(bandaSeleccionadaID_Upper);
        console.log(`DEBUG: Coincide el ID de banda de la banda seleccionada ('${bandaSeleccionadaID_Upper}') con el integrante ('${int.Nombre_Integrante}')? ${isMatch}`);
        return isMatch;
    });

    const nombresIntegrantes = integrantesFiltrados.map(int => int.Nombre_Integrante).join(', ');
    console.log(`DEBUG: Nombres de integrantes resultantes para el alert: ${nombresIntegrantes || 'No disponibles'}`);

    // Filtrar eventos de la banda seleccionada
    let eventosParticipados = 'Ninguno';
    if (todosLosEventos && todosLosEventos.length > 0) {
        const eventosFiltrados = todosLosEventos.filter(evento => {
            // Asumiendo que el campo en tu hoja de Eventos para el ID de banda es 'Bandas_Participantes_ID'
            if (!evento.Bandas_Participantes_ID || evento.Bandas_Participantes_ID.trim() === '') {
                return false;
            }
            const eventoBandasIDs = evento.Bandas_Participantes_ID.split(',').map(id => id.trim().toUpperCase()).filter(id => id !== '');
            return eventoBandasIDs.includes(bandaSeleccionadaID_Upper);
        });
        if (eventosFiltrados.length > 0) {
            // Asumiendo que los campos en tu hoja de Eventos son 'Descripción' y 'Fecha'
            eventosParticipados = eventosFiltrados.map(e => `${e.Descripción || 'Sin descripción'} [${e.Fecha || 'Sin fecha'}]`).join('; ');
        }
    } else {
        console.warn('DEBUG: todosLosEventos no está cargado o está vacío para filtrar.');
    }


    // Filtrar multimedia de la banda seleccionada
    let multimediaRelacionada = 'Ninguno';
    if (todosLosMultimedia && todosLosMultimedia.length > 0) {
        const multimediaFiltrada = todosLosMultimedia.filter(item => {
            // Asumiendo que el campo en tu hoja de Multimedia para el ID de banda es 'ID_Relacionado'
            if (!item.ID_Relacionado || item.ID_Relacionado.trim() === '') {
                return false;
            }
            const multimediaRelacionadoIDs = item.ID_Relacionado.split(',').map(id => id.trim().toUpperCase()).filter(id => id !== '');
            return multimediaRelacionadoIDs.includes(bandaSeleccionadaID_Upper);
        });
        if (multimediaFiltrada.length > 0) {
            multimediaRelacionada = multimediaFiltrada.map(item => {
                let mediaLink = item.URL || 'N/A';
                // Para videos de YouTube, solo mostramos el enlace ya que no podemos incrustar en un alert
                // Asumiendo que los campos en tu hoja de Multimedia son 'Descripción' y 'Tipo_Relacion'
                if (item.Tipo_Relacion && item.Tipo_Relacion.toUpperCase().includes('VIDEO') && mediaLink.includes('youtube.com/watch')) {
                    const videoIdMatch = mediaLink.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/);
                    if (videoIdMatch && videoIdMatch[1]) {
                        mediaLink = `https://www.youtube.com/watch?v=${videoIdMatch[1]}`;
                    }
                }
                return `${item.Descripción || 'Sin descripción'} [Tipo: ${item.Tipo_Relacion || 'N/A'}]: ${mediaLink}`;
            }).join('; ');
        }
    } else {
        console.warn('DEBUG: todosLosMultimedia no está cargado o está vacío para filtrar.');
    }


    // Mostrar el alert con los detalles
    alert(`Detalle de Banda: ${bandaSeleccionada.Nombre_Banda}
-------------------------------------
Género: ${bandaSeleccionada.Genero || '-'}
Años de actividad: ${bandaSeleccionada.Anos_Actividad || '-'}
Biografía: ${bandaSeleccionada.Biografia || '-'}
Integrantes: ${nombresIntegrantes || 'No disponibles'}
Eventos Participados: ${eventosParticipados}
Multimedia: ${multimediaRelacionada}`);
}

// --- Funciones de búsqueda global ---

// Función para inicializar la búsqueda global
function inicializarBusquedaGlobal() {
    if (buscarInput && buscarBtn && busquedaResultadosDiv) {
        buscarBtn.addEventListener('click', realizarBusquedaGlobal);
        buscarInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                realizarBusquedaGlobal();
            }
        });
        console.log("DEBUG: Búsqueda global inicializada.");
    } else {
        console.error("DEBUG: Elementos de búsqueda global no encontrados. Asegúrate de que los IDs 'buscar', 'buscarBtn' y 'busquedaResultados' existan en tu HTML.");
    }
}

function realizarBusquedaGlobal() {
    const terminoBusqueda = buscarInput.value.toLowerCase().trim();
    busquedaResultadosDiv.innerHTML = ''; // Limpiar resultados anteriores

    if (terminoBusqueda === '') {
        busquedaResultadosDiv.innerHTML = '<p>Por favor, introduce un término de búsqueda.</p>';
        return;
    }

    const resultados = {
        bandas: [],
        integrantes: [],
        eventos: [],
        multimedia: []
    };

    // Buscar en Bandas
    todosLosBandas.forEach(banda => {
        if (banda.Nombre_Banda && banda.Nombre_Banda.toLowerCase().includes(terminoBusqueda) ||
            (banda.Genero && banda.Genero.toLowerCase().includes(terminoBusqueda)) ||
            (banda.Anos_Actividad && banda.Anos_Actividad.toLowerCase().includes(terminoBusqueda)) ||
            (banda.Biografia && banda.Biografia.toLowerCase().includes(terminoBusqueda))) {
            resultados.bandas.push(banda);
        }
    });

    // Buscar en Integrantes
    todosLosIntegrantes.forEach(integrante => {
        if (integrante.Nombre_Integrante && integrante.Nombre_Integrante.toLowerCase().includes(terminoBusqueda) ||
            (integrante.Instrumento && integrante.Instrumento.toLowerCase().includes(terminoBusqueda))) {
            resultados.integrantes.push(integrante);
        }
    });

    // Buscar en Eventos (usando 'Descripción' y 'Lugar' como campos de búsqueda)
    todosLosEventos.forEach(evento => {
        if (evento.Descripción && evento.Descripción.toLowerCase().includes(terminoBusqueda) ||
            (evento.Fecha && evento.Fecha.toLowerCase().includes(terminoBusqueda)) ||
            (evento.Lugar && evento.Lugar.toLowerCase().includes(terminoBusqueda)) ||
            (evento.Bandas_Participantes_ID && evento.Bandas_Participantes_ID.toLowerCase().includes(terminoBusqueda))) { // Puedes ajustar este campo si no existe
            resultados.eventos.push(evento);
        }
    });

    // Buscar en Multimedia (usando 'Descripción' y 'Tipo_Relacion' como campos de búsqueda)
    todosLosMultimedia.forEach(media => {
        if (media.Descripción && media.Descripción.toLowerCase().includes(terminoBusqueda) ||
            (media.Tipo_Relacion && media.Tipo_Relacion.toLowerCase().includes(terminoBusqueda))) {
            resultados.multimedia.push(media);
        }
    });

    // Mostrar resultados
    let resultadosHTML = '';

    if (resultados.bandas.length > 0) {
        resultadosHTML += '<h4>Resultados en Bandas:</h4>';
        resultados.bandas.forEach(banda => {
            resultadosHTML += `<p>${banda.Nombre_Banda} (${banda.Genero || 'N/A'}) <button class="ver-mas-btn" data-id="${banda.ID_Banda}" data-type="banda">Ver más</button></p>`;
        });
    }

    if (resultados.integrantes.length > 0) {
        resultadosHTML += '<h4>Resultados en Integrantes:</h4>';
        resultados.integrantes.forEach(integrante => {
            resultadosHTML += `<p>${integrante.Nombre_Integrante} (${integrante.Instrumento || 'N/A'})</p>`;
        });
    }

    if (resultados.eventos.length > 0) {
        resultadosHTML += '<h4>Resultados en Eventos:</h4>';
        resultados.eventos.forEach(evento => {
            resultadosHTML += `<p>${evento.Descripción} (${evento.Fecha || 'N/A'})</p>`;
        });
    }

    if (resultados.multimedia.length > 0) {
        resultadosHTML += '<h4>Resultados en Multimedia:</h4>';
        resultados.multimedia.forEach(media => {
            resultadosHTML += `<p>${media.Descripción} (${media.Tipo_Relacion || 'N/A'})</p>`;
        });
    }

    if (resultadosHTML === '') {
        busquedaResultadosDiv.innerHTML = '<p>No se encontraron resultados para su búsqueda.</p>';
    } else {
        busquedaResultadosDiv.innerHTML = resultadosHTML;
    }

    // Re-adjuntar event listeners para los botones "Ver más" de la búsqueda global
    document.querySelectorAll('#busquedaResultados .ver-mas-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const id = event.target.dataset.id;
            const type = event.target.dataset.type; // 'banda'
            if (type === 'banda') {
                const bandaSeleccionada = todosLosBandas.find(b => b.ID_Banda === id);
                if (bandaSeleccionada) {
                    mostrarDetalleBanda(bandaSeleccionada);
                }
            }
        });
    });
}

// --- Función para inicializar eventos y multimedia ---

function inicializarEventosYMultimedia() {
    if (eventosHistoricosDiv) {
        eventosHistoricosDiv.innerHTML = '<h3>Eventos históricos</h3>';
        if (todosLosEventos.length > 0) {
            todosLosEventos.forEach(evento => {
                const eventoCard = document.createElement('div');
                eventoCard.classList.add('event-card');
                eventoCard.innerHTML = `
                    <h4>${evento.Descripción || 'Sin Descripción'}</h4>
                    <p>Fecha: ${evento.Fecha || 'Sin fecha'}</p>
                    <p>Lugar: ${evento.Lugar || 'Desconocido'}</p>
                    <p>Bandas: ${evento.Bandas_Participantes_ID || 'N/A'}</p>
                `;
                eventosHistoricosDiv.appendChild(eventoCard);
            });
            console.log("DEBUG: Eventos cargados y mostrados.");
        } else {
            eventosHistoricosDiv.innerHTML += '<p>No se encontraron eventos.</p>';
            console.log("DEBUG: No hay eventos para mostrar.");
        }
    } else {
        console.error("DEBUG: Elemento #eventosHistoricos no encontrado. Asegúrate de que exista en tu HTML.");
    }

    if (galeriaMultimediaDiv) {
        galeriaMultimediaDiv.innerHTML = '<h3>Galería multimedia</h3>';
        if (todosLosMultimedia.length > 0) {
            todosLosMultimedia.forEach(item => {
                const mediaCard = document.createElement('div');
                mediaCard.classList.add('media-card');
                let mediaContent = `<p>Tipo: ${item.Tipo_Relacion || 'N/A'}</p><p>Descripción: ${item.Descripción || 'Sin descripción'}</p>`;
                if (item.URL && item.Tipo_Relacion && item.Tipo_Relacion.toUpperCase() === 'IMAGEN') {
                    mediaContent += `<img src="${item.URL}" alt="${item.Descripción}" style="max-width: 100%; height: auto;">`;
                } else if (item.URL && item.Tipo_Relacion && item.Tipo_Relacion.toUpperCase().includes('VIDEO')) {
                    // Extraer ID de YouTube si es posible y usar un iframe para incrustar
                    const youtubeMatch = item.URL.match(/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                    if (youtubeMatch && youtubeMatch[1]) {
                        mediaContent += `<iframe width="280" height="157" src="https://www.youtube.com/embed/${youtubeMatch[1]}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
                    } else {
                        mediaContent += `<a href="${item.URL}" target="_blank">Ver video</a>`;
                    }
                } else if (item.URL) {
                     mediaContent += `<a href="${item.URL}" target="_blank">Ver contenido</a>`;
                }
                mediaCard.innerHTML = mediaContent;
                galeriaMultimediaDiv.appendChild(mediaCard);
            });
            console.log("DEBUG: Multimedia cargada y mostrada.");
        } else {
            galeriaMultimediaDiv.innerHTML += '<p>No se encontró contenido multimedia.</p>';
            console.log("DEBUG: No hay contenido multimedia para mostrar.");
        }
    } else {
        console.error("DEBUG: Elemento #galeriaMultimedia no encontrado. Asegúrate de que exista en tu HTML.");
    }
}
