// --- CONSTANTES GLOBALES Y URLS DE LA API DE GOOGLE SHEETS ---
// IMPORTANTE: Tu API Key. Para proyectos de mayor escala o con datos sensibles,
// no se recomienda exponer la API Key directamente en el frontend.
// Para este caso con datos públicos, es aceptable.
const API_KEY = 'AIzaSyAP4nFhq5mON1hT0yllhtT9uj8zqPjw-3E';

// Tu Spreadsheet ID. Este ID es el mismo para todas tus hojas de cálculo en el mismo archivo.
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
        const data = await response.json(); // Esperamos JSON
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
        mostrarBandasEnCards(todosLosBandas);
        inicializarEventosYMultimedia();
        inicializarBusquedaGlobal();
    })
    .catch(error => {
        console.error('Error general al cargar datos iniciales de la API:', error);
        alert('Hubo un error al cargar los datos. Por favor, inténtalo de nuevo más tarde.');
    });
});

// --- Funciones para mostrar datos en la interfaz ---

// Función para mostrar las bandas en cards
function mostrarBandasEnCards(bandasAMostrar) {
    const contenedorBandas = document.getElementById('contenedorBandas');
    if (!contenedorBandas) {
        console.error("DEBUG: Elemento #contenedorBandas no encontrado.");
        return;
    }
    contenedorBandas.innerHTML = ''; // Limpiar contenido anterior

    if (bandasAMostrar.length === 0) {
        contenedorBandas.innerHTML = '<p>No se encontraron bandas que coincidan con la búsqueda.</p>';
        return;
    }

    bandasAMostrar.forEach(banda => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${banda.Nombre_Banda}</h3>
            <p>Género: ${banda.Genero || 'No disponible'}</p>
            <p>Años de actividad: ${banda.Anos_Actividad || 'Sin fecha'}</p>
            <button class="ver-mas-btn" data-id="${banda.ID_Banda}">Ver más</button>
        `;
        contenedorBandas.appendChild(card);
    });

    // Añadir event listeners a los botones "Ver más"
    document.querySelectorAll('.ver-mas-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const bandaId = event.target.dataset.id;
            const bandaSeleccionada = todosLosBandas.find(b => b.ID_Banda === bandaId);
            if (bandaSeleccionada) {
                mostrarDetalleBanda(bandaSeleccionada);
            } else {
                console.warn(`DEBUG: No se encontró la banda con ID: ${bandaId}`);
            }
        });
    });
}

// Función para mostrar el detalle de una banda en un alert
function mostrarDetalleBanda(bandaSeleccionada) {
    console.log(`DEBUG: Mostrar detalle para banda: ${bandaSeleccionada.Nombre_Banda} (ID: ${bandaSeleccionada.ID_Banda})`);

    // Convertir el ID de la banda seleccionada a mayúsculas y limpiar espacios
    const bandaSeleccionadaID_Upper = bandaSeleccionada.ID_Banda.trim().toUpperCase();

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
            if (!evento.Bandas_Participantes_ID || evento.Bandas_Participantes_ID.trim() === '') {
                return false;
            }
            const eventoBandasIDs = evento.Bandas_Participantes_ID.split(',').map(id => id.trim().toUpperCase()).filter(id => id !== '');
            return eventoBandasIDs.includes(bandaSeleccionadaID_Upper);
        });
        if (eventosFiltrados.length > 0) {
            eventosParticipados = eventosFiltrados.map(e => `${e.Descripcion || 'Sin descripción'} [${e.Fecha || 'Sin fecha'}]`).join('; ');
        }
    } else {
        console.warn('DEBUG: todosLosEventos no está cargado o está vacío para filtrar.');
    }


    // Filtrar multimedia de la banda seleccionada
    let multimediaRelacionada = 'Ninguno';
    if (todosLosMultimedia && todosLosMultimedia.length > 0) {
        const multimediaFiltrada = todosLosMultimedia.filter(item => {
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
                if (item.Tipo === 'Video' && mediaLink.includes('youtube.com/watch')) {
                    const videoIdMatch = mediaLink.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/);
                    if (videoIdMatch && videoIdMatch[1]) {
                        mediaLink = `https://www.youtube.com/watch?v=${videoIdMatch[1]}`;
                    }
                }
                return `${item.Descripcion || 'Sin descripción'} [Tipo: ${item.Tipo || 'N/A'}]: ${mediaLink}`;
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

// --- Funciones de búsqueda ---

// Función para inicializar la búsqueda global
function inicializarBusquedaGlobal() {
    const buscarInput = document.getElementById('buscar');
    const buscarBtn = document.getElementById('buscarBtn');
    const busquedaResultados = document.getElementById('busquedaResultados');

    if (!buscarInput || !buscarBtn || !busquedaResultados) {
        console.error("DEBUG: Elementos de búsqueda global no encontrados.");
        return;
    }

    buscarBtn.addEventListener('click', () => {
        realizarBusquedaGlobal();
    });

    buscarInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            realizarBusquedaGlobal();
        }
    });

    function realizarBusquedaGlobal() {
        const terminoBusqueda = buscarInput.value.toLowerCase();
        busquedaResultados.innerHTML = ''; // Limpiar resultados anteriores

        if (terminoBusqueda === '') {
            busquedaResultados.innerHTML = '<p>Por favor, introduce un término de búsqueda.</p>';
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
            if (banda.Nombre_Banda.toLowerCase().includes(terminoBusqueda) ||
                (banda.Genero && banda.Genero.toLowerCase().includes(terminoBusqueda)) ||
                (banda.Anos_Actividad && banda.Anos_Actividad.toLowerCase().includes(terminoBusqueda)) ||
                (banda.Biografia && banda.Biografia.toLowerCase().includes(terminoBusqueda))) {
                resultados.bandas.push(banda);
            }
        });

        // Buscar en Integrantes
        todosLosIntegrantes.forEach(integrante => {
            if (integrante.Nombre_Integrante.toLowerCase().includes(terminoBusqueda) ||
                (integrante.Instrumento && integrante.Instrumento.toLowerCase().includes(terminoBusqueda))) {
                resultados.integrantes.push(integrante);
            }
        });

        // Buscar en Eventos
        todosLosEventos.forEach(evento => {
            if (evento.Descripcion.toLowerCase().includes(terminoBusqueda) ||
                (evento.Fecha && evento.Fecha.toLowerCase().includes(terminoBusqueda)) ||
                (evento.Lugar && evento.Lugar.toLowerCase().includes(terminoBusqueda)) ||
                (evento.Bandas_Participantes && evento.Bandas_Participantes.toLowerCase().includes(terminoBusqueda))) {
                resultados.eventos.push(evento);
            }
        });

        // Buscar en Multimedia
        todosLosMultimedia.forEach(media => {
            if (media.Descripcion.toLowerCase().includes(terminoBusqueda) ||
                (media.Tipo && media.Tipo.toLowerCase().includes(terminoBusqueda))) {
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
                resultadosHTML += `<p>${evento.Descripcion} (${evento.Fecha || 'N/A'})</p>`;
            });
        }

        if (resultados.multimedia.length > 0) {
            resultadosHTML += '<h4>Resultados en Multimedia:</h4>';
            resultados.multimedia.forEach(media => {
                resultadosHTML += `<p>${media.Descripcion} (${media.Tipo || 'N/A'})</p>`;
            });
        }

        if (resultadosHTML === '') {
            busquedaResultados.innerHTML = '<p>No se encontraron resultados para su búsqueda.</p>';
        } else {
            busquedaResultados.innerHTML = resultadosHTML;
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
}

// Función para inicializar eventos y multimedia
function inicializarEventosYMultimedia() {
    const eventosHistoricosDiv = document.getElementById('eventosHistoricos');
    const galeriaMultimediaDiv = document.getElementById('galeriaMultimedia');

    if (!eventosHistoricosDiv || !galeriaMultimediaDiv) {
        console.error("DEBUG: Elementos eventosHistoricosDiv o galeriaMultimediaDiv no encontrados.");
        return;
    }

    // Mostrar un mensaje si no hay eventos cargados
    if (todosLosEventos.length === 0) {
        eventosHistoricosDiv.innerHTML = '<h3>Eventos históricos</h3><p>No se encontraron eventos.</p>';
    } else {
        // Podrías implementar una lógica para mostrar eventos aquí si lo deseas
        eventosHistoricosDiv.innerHTML = '<h3>Eventos históricos</h3><p>Eventos disponibles próximamente (o muestra aquí los eventos).</p>';
    }

    // Mostrar un mensaje si no hay multimedia cargada
    if (todosLosMultimedia.length === 0) {
        galeriaMultimediaDiv.innerHTML = '<h3>Galería multimedia</h3><p>No se encontró contenido multimedia.</p>';
    } else {
        // Podrías implementar una lógica para mostrar multimedia aquí si lo deseas
        galeriaMultimediaDiv.innerHTML = '<h3>Galería multimedia</h3><p>Contenido multimedia disponible próximamente (o muestra aquí el contenido).</p>';
    }
}
