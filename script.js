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

// Variables para paginación de Eventos y Multimedia
const ITEMS_PER_PAGE = 5; // Cantidad de elementos a mostrar por cada "Ver más"
let currentEventPage = 1;
let currentMultimediaPage = 1;


// Elementos del DOM (asegúrate de que los IDs coincidan con tu HTML)
const buscarInput = document.getElementById('buscar');
const buscarBtn = document.getElementById('buscarBtn');
const busquedaResultadosDiv = document.getElementById('busquedaResultados');

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
        inicializarEventosYMultimedia(); // Ahora esta función manejará la paginación
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
            return 0; // Si no hay nombre, mantener el orden actual
        });

        // Crear el encabezado de la letra para el grid
        const accordionHeader = document.createElement('div');
        accordionHeader.classList.add('accordion-header');
        accordionHeader.innerHTML = `<h3>${letra} (${bandasDeEstaLetra.length})</h3>`;
        accordionHeader.dataset.letter = letra; // Para identificar esta letra

        // Crear el contenedor del contenido de la banda (inicialmente oculto)
        // Este contenido se añadirá directamente al bandasAlfabeticoContainer, no dentro del grid
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
            // Añadir el evento click al botón "Ver más" de cada tarjeta
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
            const currentContent = accordionContent; // Referencia al div de contenido para este encabezado específico
            const currentHeader = accordionHeader;   // Referencia al div de encabezado para este encabezado específico

            const isCurrentlyVisible = currentContent.style.display === 'block';

            // Primero, cierra todos los demás acordeones abiertos
            document.querySelectorAll('#bandas .accordion-content').forEach(content => {
                if (content !== currentContent) { // No ocultes el actual todavía
                    content.style.display = 'none';
                }
            });
            document.querySelectorAll('#bandas .accordion-header').forEach(header => {
                if (header !== currentHeader) { // No quites la clase 'active' del actual todavía
                    header.classList.remove('active');
                }
            });

            // Ahora, alterna el acordeón actual
            if (isCurrentlyVisible) {
                currentContent.style.display = 'none';
                currentHeader.classList.remove('active');
            } else {
                currentContent.style.display = 'block';
                currentHeader.classList.add('active');
            }
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
            // Usar el nombre de columna exacto de tu hoja: 'Bandas_Participantes_IDs'
            if (!evento.Bandas_Participantes_IDs || evento.Bandas_Participantes_IDs.trim() === '') {
                return false;
            }
            const eventoBandasIDs = evento.Bandas_Participantes_IDs.split(',').map(id => id.trim().toUpperCase()).filter(id => id !== '');
            return eventoBandasIDs.includes(bandaSeleccionadaID_Upper);
        });
        if (eventosFiltrados.length > 0) {
            // Usar el nombre de columna exacto de tu hoja: 'Descripcion'
            eventosParticipados = eventosFiltrados.map(e => `${e.Descripcion || 'Sin descripción'} [${e.Fecha || 'Sin fecha'}]`).join('; ');
        }
    } else {
        console.warn('DEBUG: todosLosEventos no está cargado o está vacío para filtrar.');
    }


    // Filtrar multimedia de la banda seleccionada
    let multimediaRelacionada = 'Ninguno';
    if (todosLosMultimedia && todosLosMultimedia.length > 0) {
        const multimediaFiltrada = todosLosMultimedia.filter(item => {
            // Asumiendo que el campo en tu hoja de Multimedia para el ID de banda es 'ID_Relacionado'
            // Asegúrate de que el nombre del campo sea correcto en tu hoja
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
                // Asumiendo que los campos en tu hoja de Multimedia son 'Descripcion' y 'Tipo_Relacion'
                if (item.Tipo_Relacion && item.Tipo_Relacion.toUpperCase().includes('VIDEO') && mediaLink.includes('youtube.com/watch')) {
                    const videoIdMatch = mediaLink.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/);
                    if (videoIdMatch && videoIdMatch[1]) {
                        mediaLink = `https://www.youtube.com/watch?v=${videoIdMatch[1]}`;
                    }
                }
                return `${item.Descripcion || 'Sin descripción'} [Tipo: ${item.Tipo_Relacion || 'N/A'}]: ${mediaLink}`;
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
    // Renombrado de variables para coincidir con tu HTML actual:
    const buscarGlobalInput = document.getElementById('buscar');
    const buscarGlobalBtn = document.getElementById('buscarBtn');
    const busquedaResultadosDiv = document.getElementById('busquedaResultados');


    if (buscarGlobalInput && buscarGlobalBtn && busquedaResultadosDiv) {
        buscarGlobalBtn.addEventListener('click', realizarBusquedaGlobal);
        buscarGlobalInput.addEventListener('keypress', (event) => {
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
    const terminoBusqueda = document.getElementById('buscar').value.toLowerCase().trim(); // Usar el ID correcto
    const busquedaResultadosDiv = document.getElementById('busquedaResultados'); // Usar el ID correcto
    busquedaResultadosDiv.innerHTML = ''; // Limpiar resultados anteriores

    if (terminoBusqueda === '') {
        busquedaResultadosDiv.innerHTML = '<p>Por favor, introduce un término de búsqueda.</p>';
        return;
    }

    const resultados = {
        bandas: [],
        integrantes: [],
        eventos: [],
        multimedia: [],
        bandasPorIntegrantes: [] // Nueva categoría para bandas encontradas por integrante
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

    // Buscar en Integrantes Y sus Bandas
    const integrantesEncontrados = todosLosIntegrantes.filter(integrante =>
        (integrante.Nombre_Integrante && integrante.Nombre_Integrante.toLowerCase().includes(terminoBusqueda)) ||
        (integrante.Instrumento && integrante.Instrumento.toLowerCase().includes(terminoBusqueda))
    );
    resultados.integrantes = integrantesEncontrados; // Agregamos los integrantes encontrados a los resultados

    const bandasRelacionadasIDs = new Set(); // Para almacenar IDs de bandas únicas
    integrantesEncontrados.forEach(integrante => {
        if (integrante.ID_Banda) {
            integrante.ID_Banda.split(',').map(id => id.trim().toUpperCase()).forEach(id => {
                if (id) bandasRelacionadasIDs.add(id);
            });
        }
    });

    if (bandasRelacionadasIDs.size > 0) {
        todosLosBandas.forEach(banda => {
            if (banda.ID_Banda && bandasRelacionadasIDs.has(banda.ID_Banda.trim().toUpperCase())) {
                resultados.bandasPorIntegrantes.push(banda);
            }
        });
    }


    // Buscar en Eventos (usando 'Descripcion' y 'Lugar' como campos de búsqueda)
    todosLosEventos.forEach(evento => {
        if (evento.Descripcion && evento.Descripcion.toLowerCase().includes(terminoBusqueda) ||
            (evento.Fecha && evento.Fecha.toLowerCase().includes(terminoBusqueda)) ||
            (evento.Lugar && evento.Lugar.toLowerCase().includes(terminoBusqueda)) ||
            (evento.Bandas_Participantes_IDs && evento.Bandas_Participantes_IDs.toLowerCase().includes(terminoBusqueda))) {
            resultados.eventos.push(evento);
        }
    });

    // Buscar en Multimedia (usando 'Descripcion' y 'Tipo_Relacion' como campos de búsqueda)
    todosLosMultimedia.forEach(media => {
        if (media.Descripcion && media.Descripcion.toLowerCase().includes(terminoBusqueda) ||
            (media.Tipo_Relacion && media.Tipo_Relacion.toLowerCase().includes(terminoBusqueda))) {
            resultados.multimedia.push(media);
        }
    });

    // Mostrar resultados
    let resultadosHTML = '';
    let foundAnyResult = false; // Flag para saber si se encontró algún resultado

    if (resultados.bandas.length > 0) {
        resultadosHTML += '<h4>Resultados en Bandas:</h4>';
        resultados.bandas.forEach(banda => {
            resultadosHTML += `<p>${banda.Nombre_Banda} (${banda.Genero || 'N/A'}) <button class="ver-mas-btn" data-id="${banda.ID_Banda}" data-type="banda">Ver más</button></p>`;
        });
        foundAnyResult = true;
    }

    if (resultados.integrantes.length > 0) {
        resultadosHTML += '<h4>Resultados en Integrantes:</h4>';
        resultados.integrantes.forEach(integrante => {
            resultadosHTML += `<p>${integrante.Nombre_Integrante} (${integrante.Instrumento || 'N/A'})</p>`;
        });
        foundAnyResult = true;
    }

    // Nueva sección para bandas encontradas por integrante
    if (resultados.bandasPorIntegrantes.length > 0) {
        resultadosHTML += '<h4>Bandas relacionadas con el integrante:</h4>';
        resultados.bandasPorIntegrantes.forEach(banda => {
            resultadosHTML += `<p>${banda.Nombre_Banda} (${banda.Genero || 'N/A'}) <button class="ver-mas-btn" data-id="${banda.ID_Banda}" data-type="banda">Ver más</button></p>`;
        });
        foundAnyResult = true;
    }

    if (resultados.eventos.length > 0) {
        resultadosHTML += '<h4>Resultados en Eventos:</h4>';
        resultados.eventos.forEach(evento => {
            resultadosHTML += `<p>${evento.Descripcion} (${evento.Fecha || 'N/A'})</p>`;
        });
        foundAnyResult = true;
    }

    if (resultados.multimedia.length > 0) {
        resultadosHTML += '<h4>Resultados en Multimedia:</h4>';
        resultados.multimedia.forEach(media => {
            resultadosHTML += `<p>${media.Descripcion} (${media.Tipo_Relacion || 'N/A'})</p>`;
        });
        foundAnyResult = true;
    }

    if (!foundAnyResult) {
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
// Esta función ahora manejará la paginación y la visualización de miniaturas
function inicializarEventosYMultimedia() {
    // Eventos
    if (eventosHistoricosDiv) {
        // eventosHistoricosDiv.innerHTML = '<h3>Eventos históricos</h3>'; // COMENTADO: El título h2 ya está en index.html
        const totalEvents = todosLosEventos.length;
        
        // Limpiar solo los eventos renderizados previamente (no el título h3)
        const existingEventCards = eventosHistoricosDiv.querySelectorAll('.event-card');
        existingEventCards.forEach(card => card.remove());

        // Resetear la página actual de eventos al inicializar
        currentEventPage = 1; 
        renderEvents(0, ITEMS_PER_PAGE); // Renderiza la primera página de eventos

        // Eliminar el botón "Ver más eventos" existente antes de añadir uno nuevo
        const oldLoadMoreEventsBtn = eventosHistoricosDiv.querySelector('.load-more-events');
        if (oldLoadMoreEventsBtn) {
            oldLoadMoreEventsBtn.remove();
        }

        if (totalEvents > ITEMS_PER_PAGE) {
            const loadMoreEventsBtn = document.createElement('button');
            loadMoreEventsBtn.classList.add('ver-mas-btn', 'load-more-events');
            loadMoreEventsBtn.textContent = 'Ver más eventos';
            eventosHistoricosDiv.appendChild(loadMoreEventsBtn);

            loadMoreEventsBtn.addEventListener('click', () => {
                currentEventPage++;
                const newStartIndex = (currentEventPage - 1) * ITEMS_PER_PAGE;
                const newEndIndex = Math.min(currentEventPage * ITEMS_PER_PAGE, totalEvents);
                renderEvents(newStartIndex, newEndIndex);

                if (newEndIndex === totalEvents) {
                    loadMoreEventsBtn.style.display = 'none'; // Ocultar si ya no hay más
                }
            });
        } else if (totalEvents === 0) {
            // Asegurarse de que el mensaje "No se encontraron eventos" solo se muestre una vez
            if (!eventosHistoricosDiv.querySelector('p.no-events-found')) {
                const noEventsMessage = document.createElement('p');
                noEventsMessage.classList.add('no-events-found');
                noEventsMessage.textContent = 'No se encontraron eventos.';
                eventosHistoricosDiv.appendChild(noEventsMessage);
            }
        }
        console.log("DEBUG: Eventos históricos inicializados con paginación.");
    } else {
        console.error("DEBUG: Elemento #eventosHistoricos no encontrado. Asegúrate de que exista en tu HTML.");
    }

    // Multimedia
    if (galeriaMultimediaDiv) {
        // galeriaMultimediaDiv.innerHTML = '<h3>Galería multimedia</h3>'; // COMENTADO: El título h2 ya está en index.html
        const totalMultimedia = todosLosMultimedia.length;
        
        // Limpiar solo los elementos multimedia renderizados previamente (no el título h3)
        const existingMediaCards = galeriaMultimediaDiv.querySelectorAll('.media-card');
        existingMediaCards.forEach(card => card.remove());

        // Resetear la página actual de multimedia al inicializar
        currentMultimediaPage = 1;
        renderMultimedia(0, ITEMS_PER_PAGE); // Renderiza la primera página de multimedia

        // Eliminar el botón "Ver más multimedia" existente antes de añadir uno nuevo
        const oldLoadMoreMultimediaBtn = galeriaMultimediaDiv.querySelector('.load-more-multimedia');
        if (oldLoadMoreMultimediaBtn) {
            oldLoadMoreMultimediaBtn.remove();
        }

        if (totalMultimedia > ITEMS_PER_PAGE) {
            const loadMoreMultimediaBtn = document.createElement('button');
            loadMoreMultimediaBtn.classList.add('ver-mas-btn', 'load-more-multimedia');
            loadMoreMultimediaBtn.textContent = 'Ver más multimedia';
            galeriaMultimediaDiv.appendChild(loadMoreMultimediaBtn);

            loadMoreMultimediaBtn.addEventListener('click', () => {
                currentMultimediaPage++;
                const newStartIndex = (currentMultimediaPage - 1) * ITEMS_PER_PAGE;
                const newEndIndex = Math.min(currentMultimediaPage * ITEMS_PER_PAGE, totalMultimedia);
                renderMultimedia(newStartIndex, newEndIndex);

                if (newEndIndex === totalMultimedia) {
                    loadMoreMultimediaBtn.style.display = 'none'; // Ocultar si ya no hay más
                }
            });
        } else if (totalMultimedia === 0) {
            // Asegurarse de que el mensaje "No se encontró contenido multimedia" solo se muestre una vez
            if (!galeriaMultimediaDiv.querySelector('p.no-multimedia-found')) {
                const noMultimediaMessage = document.createElement('p');
                noMultimediaMessage.classList.add('no-multimedia-found');
                noMultimediaMessage.textContent = 'No se encontró contenido multimedia.';
                galeriaMultimediaDiv.appendChild(noMultimediaMessage);
            }
        }
        console.log("DEBUG: Galería multimedia inicializada con paginación.");
    } else {
        console.error("DEBUG: Elemento #galeriaMultimedia no encontrado. Asegúrate de que exista en tu HTML.");
    }
}

/**
 * Renderiza un rango de eventos en el DOM.
 * @param {number} startIndex - Índice de inicio para la renderización.
 * @param {number} endIndex - Índice de fin para la renderización.
 */
function renderEvents(startIndex, endIndex) {
    const fragment = document.createDocumentFragment();
    for (let i = startIndex; i < endIndex; i++) {
        const evento = todosLosEventos[i];
        if (!evento) continue; // Saltar si el evento no existe (ej. por datos inconsistentes)

        console.log("DEBUG: Datos del evento para renderizar:", evento); // Añadido para depuración

        const eventoCard = document.createElement('div');
        eventoCard.classList.add('event-card');

        // Procesar las bandas participantes para hacerlas clicables
        let bandasHtml = 'N/A';
        // Usar el nombre de columna exacto de tu hoja: 'Bandas_Participantes_IDs'
        if (evento.Bandas_Participantes_IDs) { 
            const bandaIDs = evento.Bandas_Participantes_IDs.split(',').map(id => id.trim().toUpperCase());
            const bandasEncontradas = todosLosBandas.filter(banda => banda.ID_Banda && bandaIDs.includes(banda.ID_Banda.trim().toUpperCase()));
            
            if (bandasEncontradas.length > 0) {
                // Crear un array de spans para las bandas y luego unirlos
                const bandSpans = bandasEncontradas.map(banda => {
                    const span = document.createElement('span');
                    span.classList.add('event-band-link');
                    span.dataset.bandId = banda.ID_Banda;
                    span.textContent = banda.Nombre_Banda || 'Banda sin nombre';
                    // Adjuntar el event listener directamente al span creado
                    span.addEventListener('click', (e) => {
                        const clickedBandId = e.target.dataset.bandId;
                        const clickedBanda = todosLosBandas.find(b => b.ID_Banda === clickedBandId);
                        if (clickedBanda) {
                            mostrarDetalleBanda(clickedBanda);
                        }
                    });
                    return span.outerHTML; // Devolver el HTML del span para unirlo
                });
                bandasHtml = bandSpans.join(', ');
            }
        }

        eventoCard.innerHTML = `
            <h4>${evento.Descripcion || 'Evento sin título'}</h4>
            <p>Fecha: ${evento.Fecha || 'Sin fecha'}</p>
            <p>Lugar: ${evento.Lugar || 'Desconocido'}</p>
            <p>Bandas: ${bandasHtml}</p>
        `;
        fragment.appendChild(eventoCard);
    }
    
    // Añadir al contenedor de eventos, pero antes del botón "Ver más" si existe
    const loadMoreBtn = eventosHistoricosDiv.querySelector('.load-more-events');
    if (loadMoreBtn) {
        eventosHistoricosDiv.insertBefore(fragment, loadMoreBtn);
    } else {
        eventosHistoricosDiv.appendChild(fragment);
    }
}

/**
 * Renderiza un rango de elementos multimedia en el DOM.
 * @param {number} startIndex - Índice de inicio para la renderización.
 * @param {number} endIndex - Índice de fin para la renderización.
 */
function renderMultimedia(startIndex, endIndex) {
    const fragment = document.createDocumentFragment();
    for (let i = startIndex; i < endIndex; i++) {
        const item = todosLosMultimedia[i];
        if (!item) continue; // Saltar si el item no existe

        const mediaCard = document.createElement('div');
        mediaCard.classList.add('media-card');
        
        // Solo el nombre dado en Descripcion
        let mediaContentHTML = `<h4>${item.Descripcion || 'Contenido sin título'}</h4>`; 

        if (item.URL && item.Tipo_Relacion) {
            const type = item.Tipo_Relacion.toUpperCase();
            if (type === 'IMAGEN') {
                mediaContentHTML += `<img src="${item.URL}" alt="${item.Descripcion || 'Imagen'}" onerror="this.onerror=null;this.src='https://placehold.co/280x157/cccccc/333333?text=Error+Imagen';" style="max-width: 100%; height: auto;">`;
            } else if (type.includes('VIDEO')) {
                // Extraer ID de YouTube si es posible y usar un iframe para incrustar
                const youtubeMatch = item.URL.match(/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                if (youtubeMatch && youtubeMatch[1]) {
                    const videoId = youtubeMatch[1];
                    // Usar la URL de miniatura de YouTube
                    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`; 
                    
                    mediaContentHTML += `
                        <div class="video-thumbnail-container">
                            <img src="${thumbnailUrl}" alt="Miniatura de ${item.Descripcion || 'video'}" class="video-thumbnail" onerror="this.onerror=null;this.src='https://placehold.co/280x157/cccccc/333333?text=Error+Video';" data-video-id="${videoId}">
                            <div class="play-button">&#9658;</div>
                        </div>
                    `;
                } else {
                    // Si no es YouTube o no se puede parsear, mostrar un enlace
                    mediaContentHTML += `<p><a href="${item.URL}" target="_blank">Ver video externo</a></p>`;
                }
            } else {
                // Para otros tipos de URL que no son imagen/video
                mediaContentHTML += `<p><a href="${item.URL}" target="_blank">Ver contenido</a></p>`;
            }
        } else {
            mediaContentHTML += `<p>Contenido no disponible o URL/Tipo no especificado.</p>`;
        }
        
        mediaCard.innerHTML = mediaContentHTML;
        fragment.appendChild(mediaCard);
    }
    // Añadir al contenedor de multimedia, pero antes del botón "Ver más" si existe
    const loadMoreBtn = galeriaMultimediaDiv.querySelector('.load-more-multimedia');
    if (loadMoreBtn) {
        galeriaMultimediaDiv.insertBefore(fragment, loadMoreBtn);
    } else {
        galeriaMultimediaDiv.appendChild(fragment);
    }

    // Añadir event listeners para los botones de play de video
    galeriaMultimediaDiv.querySelectorAll('.video-thumbnail-container').forEach(container => {
        container.addEventListener('click', function() {
            const videoId = this.querySelector('.video-thumbnail').dataset.videoId;
            if (videoId) {
                const iframe = document.createElement('iframe');
                iframe.setAttribute('width', '100%'); // Ajustar al 100% del contenedor
                iframe.setAttribute('height', '157'); // Mantener la altura original o ajustar
                iframe.setAttribute('src', `https://www.youtube.com/embed/${videoId}?autoplay=1`);
                iframe.setAttribute('frameborder', '0');
                iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
                iframe.setAttribute('allowfullscreen', '');
                this.replaceWith(iframe); // Reemplazar la miniatura con el iframe
            }
        });
    });
}
