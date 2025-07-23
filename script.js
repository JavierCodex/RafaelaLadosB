// =========================================================
// 1. URLs de tus hojas de Google Sheets publicadas como CSV
// =========================================================
const URL_BANDAS_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRfgSR2opPADo7NWgalg4kZsLHBBMZuks1AoJlP2Xhek2dOMOaX36eVcxc36sfq_1U8iv3TS5SO7JOu/pub?gid=481254535&single=true&output=csv';
const URL_INTEGRANTES_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRfgSR2opPADo7NWgalg4kZsLHBBMZuks1AoJlP2Xhek2dOMOaX36eVcxc36sfq_1U8iv3TS5SO7JOu/pub?gid=667742130&single=true&output=csv';
const URL_EVENTOS_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRfgSR2opPADo7NWgalg4kZsLHBBMZuks1AoJlP2Xhek2dOMOaX36eVcxc36sfq_1U8iv3TS5SO7JOu/pub?gid=716304521&single=true&output=csv';
const URL_MULTIMEDIA_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRfgSR2opPADo7NWgalg4kZsLHBBMZuks1AoJlP2Xhek2dOMOaX36eVcxc36sfq_1U8iv3TS5SO7JOu/pub?gid=174575575&single=true&output=csv';

// =========================================================
// 2. Variables para almacenar los datos cargados
// =========================================================
let todasLasBandas = [];
let todosLosIntegrantes = [];
let todosLosEventos = [];
let todoElMultimedia = [];

// =========================================================
// 3. Variables para la paginación de Bandas
// =========================================================
const bandsPerPage = 20; // Cuántas bandas mostrar por lote
let currentBandIndex = 0; // Para llevar la cuenta de qué banda estamos mostrando
let displayedBandsCount = 0; // Contador de bandas actualmente mostradas en el grid
let currentFilteredBands = []; // Para almacenar las bandas actualmente filtradas por la búsqueda

// =========================================================
// 4. Función auxiliar para parsear CSV a un array de objetos
// =========================================================
function parseCsv(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return []; // Manejar CSV vacío
    
    // Filtra líneas vacías antes de procesar
    const nonEmptyLines = lines.filter(line => line.trim() !== '');

    if (nonEmptyLines.length < 2) { // Si solo hay encabezados o está completamente vacío
        return [];
    }

    const headers = nonEmptyLines[0].split(',').map(header => header.trim());
    const data = [];

    for (let i = 1; i < nonEmptyLines.length; i++) {
        const values = nonEmptyLines[i].split(',').map(value => value.trim());
        const row = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = values[j];
        }
        data.push(row);
    }
    return data;
}

// =========================================================
// 5. Funciones para cargar los datos desde Google Sheets
// =========================================================
async function cargarDatosDesdeSheets() {
    try {
        // Cargar Bandas
        const responseBandas = await fetch(URL_BANDAS_CSV);
        const csvBandas = await responseBandas.text();
        todasLasBandas = parseCsv(csvBandas);
        console.log('Bandas cargadas:', todasLasBandas);

        // Cargar Integrantes
        const responseIntegrantes = await fetch(URL_INTEGRANTES_CSV);
        const csvIntegrantes = await responseIntegrantes.text();
        todosLosIntegrantes = parseCsv(csvIntegrantes);
        console.log('Integrantes cargados:', todosLosIntegrantes);

        // Cargar Eventos
        const responseEventos = await fetch(URL_EVENTOS_CSV);
        const csvEventos = await responseEventos.text();
        todosLosEventos = parseCsv(csvEventos);
        console.log('Eventos cargados:', todosLosEventos);

        // Cargar Multimedia
        const responseMultimedia = await fetch(URL_MULTIMEDIA_CSV);
        const csvMultimedia = await responseMultimedia.text();
        todoElMultimedia = parseCsv(csvMultimedia);
        console.log('Multimedia cargado:', todoElMultimedia);

        // Una vez que todos los datos están cargados, inicializa la visualización
        inicializarSitio();

    } catch (error) {
        console.error('Error al cargar datos desde Google Sheets:', error);
        document.getElementById('bandasGrid').innerHTML = '<p>Error al cargar los datos. Por favor, revisa tu conexión y las URLs de Google Sheets.</p>';
        // Ocultar el botón "Ver más" si hay un error de carga
        const loadMoreBandsBtn = document.getElementById('loadMoreBandsBtn');
        if (loadMoreBandsBtn) loadMoreBandsBtn.style.display = 'none';
    }
}

// =========================================================
// 6. Funciones para mostrar los datos en la página
// =========================================================

// Función para crear el HTML de una tarjeta de banda
function createBandCardHTML(banda) {
    const integrantesDeBanda = todosLosIntegrantes.filter(
        integrante => integrante.ID_Banda === banda.ID_Banda
    );
    const nombresIntegrantes = integrantesDeBanda.map(int => int.Nombre_Integrante).join(', ');

    return `
        <div class="banda-card">
            <h3>${banda.Nombre_Banda}</h3>
            <p><strong>Género:</strong> ${banda.Genero}</p>
            <p><strong>Años de actividad:</strong> ${banda.Anos_Actividad || 'Sin fecha'}</p>
            ${nombresIntegrantes ? `<p><strong>Integrantes:</strong> ${nombresIntegrantes}</p>` : ''}
            <button class="ver-mas-btn" data-id="${banda.ID_Banda}" data-tipo="banda">Ver más</button>
        </div>
    `;
}

// Muestra un lote de bandas en el grid
function appendBandsToGrid(bandsArray, containerElement) {
    bandsArray.forEach(banda => {
        containerElement.insertAdjacentHTML('beforeend', createBandCardHTML(banda));
    });

    // Añadir event listeners a los botones "Ver más" recién creados
    containerElement.querySelectorAll('.ver-mas-btn[data-tipo="banda"]').forEach(button => {
        button.removeEventListener('click', handleVerMasClick); // Evitar duplicados
        button.addEventListener('click', handleVerMasClick);
    });
}

// =========================================================
// 7. Lógica de Paginación para Bandas (Ver Más)
// =========================================================
function loadMoreBands() {
    const bandasGrid = document.getElementById('bandasGrid');
    const loadMoreBandsBtn = document.getElementById('loadMoreBandsBtn');

    // Si es la primera carga o si estamos filtrando, usamos currentFilteredBands
    const dataSource = currentFilteredBands.length > 0 ? currentFilteredBands : todasLasBandas;

    const startIndex = displayedBandsCount;
    const endIndex = startIndex + bandsPerPage;
    const bandsToDisplay = dataSource.slice(startIndex, endIndex);

    if (bandsToDisplay.length > 0) {
        // Eliminar el mensaje "Cargando bandas..." si existe
        if (bandasGrid.querySelector('p')) {
            bandasGrid.innerHTML = '';
        }
        appendBandsToGrid(bandsToDisplay, bandasGrid);
        displayedBandsCount += bandsToDisplay.length;
    }

    // Ocultar el botón si ya no hay más bandas por cargar
    if (displayedBandsCount >= dataSource.length) {
        loadMoreBandsBtn.style.display = 'none';
    } else {
        loadMoreBandsBtn.style.display = 'block'; // Asegurarse de que esté visible si hay más
    }
}

// =========================================================
// 8. Funciones para mostrar Eventos y Multimedia (sin paginación por ahora)
// =========================================================
function mostrarEventos(eventosAMostrar) {
    const listaEventosDiv = document.getElementById('lista-eventos');
    listaEventosDiv.innerHTML = '';

    if (eventosAMostrar.length === 0) {
        listaEventosDiv.innerHTML = '<p>No se encontraron eventos.</p>';
        return;
    }

    eventosAMostrar.forEach(evento => {
        const bandasParticipantes = evento.Bandas_Participantes_IDs
            ? evento.Bandas_Participantes_IDs.split(',').map(id => id.trim())
                .map(bandaId => todasLasBandas.find(b => b.ID_Banda === bandaId)?.Nombre_Banda || 'Banda Desconocida')
                .join(', ')
            : 'No especificadas';

        const eventoDiv = document.createElement('div');
        eventoDiv.classList.add('evento-card');
        eventoDiv.innerHTML = `
            <h3>${evento.Descripcion}</h3>
            <p><strong>Fecha:</strong> ${evento.Fecha}</p>
            <p><strong>Lugar:</strong> ${evento.Lugar}</p>
            <p><strong>Bandas:</strong> ${bandasParticipantes}</p>
            <button class="ver-mas-btn" data-id="${evento.ID_Evento}" data-tipo="evento">Ver más</button>
        `;
        listaEventosDiv.appendChild(eventoDiv);
    });

    document.querySelectorAll('.ver-mas-btn[data-tipo="evento"]').forEach(button => {
        button.removeEventListener('click', handleVerMasClick); // Evitar duplicados
        button.addEventListener('click', handleVerMasClick);
    });
}

function mostrarMultimedia(multimediaAMostrar) {
    const galeriaDiv = document.getElementById('galeria-multimedia');
    galeriaDiv.innerHTML = '';

    if (multimediaAMostrar.length === 0) {
        galeriaDiv.innerHTML = '<p>No se encontró contenido multimedia.</p>';
        return;
    }

    multimediaAMostrar.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('media-item');
        let contentHtml = '';

        if (item.Tipo === 'Foto' || item.Tipo === 'Afiche' || item.Tipo === 'Entrada') {
            contentHtml = `<img src="${item.URL}" alt="${item.Descripcion}" class="media-image">`;
        } else if (item.Tipo === 'Audio') {
            contentHtml = `
                <audio controls class="media-audio">
                    <source src="${item.URL}" type="audio/mpeg">
                    Tu navegador no soporta el elemento de audio.
                </audio>
            `;
        } else if (item.Tipo === 'Video') {
            // Se asume que item.URL para Video es el ID del video de YouTube o una URL que se puede parsear
            const videoIdMatch = item.URL.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|.+\?v=))([^&]+)/);
            const videoId = videoIdMatch ? videoIdMatch[1] : null;

            if (videoId) {
                contentHtml = `
                    <iframe class="media-video" src="https://www.youtube.com/embed/${videoId}"
                            frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen>
                    </iframe>
                `;
            } else {
                contentHtml = `<p>Error al cargar el video. URL no válida.</p>`;
            }
        }

        const relacionadoCon = item.Tipo_Relacion === 'Banda'
            ? todasLasBandas.find(b => b.ID_Banda === item.ID_Relacionado)?.Nombre_Banda || 'Banda Desconocida'
            : todosLosEventos.find(e => e.ID_Evento === item.ID_Relacionado)?.Descripcion || 'Evento Desconocido';
       
        itemDiv.innerHTML = `
            ${contentHtml}
            <h4>${item.Descripcion}</h4>
            <p>Tipo: ${item.Tipo}</p>
            ${relacionadoCon !== 'N/A' ? `<p class="media-relacion">Relacionado con: ${relacionadoCon}</p>` : ''}
            <button class="ver-mas-btn" data-id="${item.ID_Media}" data-tipo="multimedia">Ver más</button>
        `;
        galeriaDiv.appendChild(itemDiv);
    });

    document.querySelectorAll('.ver-mas-btn[data-tipo="multimedia"]').forEach(button => {
        button.removeEventListener('click', handleVerMasClick); // Evitar duplicados
        button.addEventListener('click', handleVerMasClick);
    });
}


// =========================================================
// 9. Lógica de Búsqueda (global y para bandas)
// =========================================================
const globalSearchInput = document.getElementById('searchInput'); // ID del input de búsqueda global
const globalSearchButton = document.getElementById('searchButton'); // ID del botón de búsqueda global

const bandSearchInput = document.getElementById('searchInputBands'); // ID del input de búsqueda de bandas
const bandSearchButton = document.getElementById('searchButtonBands'); // ID del botón de búsqueda de bandas

// Event listener para el botón "Ver más bandas"
const loadMoreBandsBtn = document.getElementById('loadMoreBandsBtn');
if (loadMoreBandsBtn) {
    loadMoreBandsBtn.addEventListener('click', loadMoreBands);
}

// Event listeners para la búsqueda global (si existe)
if (globalSearchInput && globalSearchButton) {
    globalSearchButton.addEventListener('click', () => {
        realizarBusquedaGlobal(globalSearchInput.value);
    });

    globalSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            realizarBusquedaGlobal(globalSearchInput.value);
        }
    });
}

// Event listeners para la búsqueda de bandas específica
if (bandSearchInput && bandSearchButton) {
    bandSearchButton.addEventListener('click', () => {
        realizarBusquedaBandas(bandSearchInput.value);
    });

    bandSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            realizarBusquedaBandas(bandSearchInput.value);
        }
    });
}

// Búsqueda para bandas específicamente
function realizarBusquedaBandas(texto) {
    const textoNormalizado = texto.toLowerCase();
    const bandasGrid = document.getElementById('bandasGrid');

    currentFilteredBands = todasLasBandas.filter(banda =>
        banda.Nombre_Banda.toLowerCase().includes(textoNormalizado) ||
        banda.Genero.toLowerCase().includes(textoNormalizado) ||
        banda.Biografia.toLowerCase().includes(textoNormalizado) ||
        todosLosIntegrantes.some(int =>
            int.ID_Banda === banda.ID_Banda && int.Nombre_Integrante.toLowerCase().includes(textoNormalizado)
        )
    );

    // Reiniciar y mostrar los resultados filtrados
    bandasGrid.innerHTML = ''; // Limpiar el grid actual
    displayedBandsCount = 0; // Reiniciar contador de bandas mostradas

    if (currentFilteredBands.length === 0) {
        bandasGrid.innerHTML = '<p style="text-align: center; width: 100%;">No se encontraron bandas para tu búsqueda.</p>';
        loadMoreBandsBtn.style.display = 'none';
        return;
    }

    loadMoreBands(); // Cargar el primer lote de bandas filtradas
}


// Búsqueda global (afecta a todas las secciones visibles)
function realizarBusquedaGlobal(texto) {
    const textoNormalizado = texto.toLowerCase();

    // === Búsqueda y visualización de Bandas ===
    // Reseteamos el estado de paginación para la búsqueda
    currentBandIndex = 0;
    displayedBandsCount = 0;

    currentFilteredBands = todasLasBandas.filter(banda =>
        banda.Nombre_Banda.toLowerCase().includes(textoNormalizado) ||
        banda.Genero.toLowerCase().includes(textoNormalizado) ||
        banda.Biografia.toLowerCase().includes(textoNormalizado) ||
        todosLosIntegrantes.some(int =>
            int.ID_Banda === banda.ID_Banda && int.Nombre_Integrante.toLowerCase().includes(textoNormalizado)
        )
    );
    const bandasGrid = document.getElementById('bandasGrid');
    bandasGrid.innerHTML = ''; // Limpiar el grid de bandas
    if (currentFilteredBands.length === 0) {
        bandasGrid.innerHTML = '<p style="text-align: center; width: 100%;">No se encontraron bandas que coincidan.</p>';
        loadMoreBandsBtn.style.display = 'none';
    } else {
        loadMoreBands(); // Cargar el primer lote de resultados de búsqueda para bandas
    }


    // === Búsqueda y visualización de Eventos ===
    const eventosFiltrados = todosLosEventos.filter(evento =>
        evento.Descripcion.toLowerCase().includes(textoNormalizado) ||
        evento.Lugar.toLowerCase().includes(textoNormalizado) ||
        evento.Bandas_Participantes_IDs.split(',').some(id => {
            const banda = todasLasBandas.find(b => b.ID_Banda === id.trim());
            return banda && banda.Nombre_Banda.toLowerCase().includes(textoNormalizado);
        })
    );
    mostrarEventos(eventosFiltrados);


    // === Búsqueda y visualización de Multimedia ===
    const multimediaFiltrado = todoElMultimedia.filter(item =>
        item.Descripcion.toLowerCase().includes(textoNormalizado) ||
        item.Tipo.toLowerCase().includes(textoNormalizado) ||
        (item.Tipo_Relacion === 'Banda' && todasLasBandas.find(b => b.ID_Banda === item.ID_Relacionado)?.Nombre_Banda.toLowerCase().includes(textoNormalizado)) ||
        (item.Tipo_Relacion === 'Evento' && todosLosEventos.find(e => e.ID_Evento === item.ID_Relacionado)?.Descripcion.toLowerCase().includes(textoNormalizado))
    );
    mostrarMultimedia(multimediaFiltrado);
}


// Función de recomendación básica (puedes expandirla)
function obtenerRecomendaciones(bandaId) {
    const bandaBase = todasLasBandas.find(b => b.ID_Banda === bandaId);
    if (!bandaBase) return [];

    // Recomendaciones por género similar
    const recomendaciones = todasLasBandas.filter(b =>
        b.ID_Banda !== bandaBase.ID_Banda && b.Genero === bandaBase.Genero
    );

    // Aquí podrías añadir más lógica:
    // - Bandas con integrantes en común (si el ID_Integrante aparece en varias bandas)
    // - Bandas que tocaron en los mismos eventos
    // - Bandas de la misma "época" (años de actividad)

    return recomendaciones.slice(0, 3); // Devolver un máximo de 3 recomendaciones
}

// =========================================================
// 10. Funciones para mostrar detalles (requieren un modal o vista de detalle)
// =========================================================
// Esta es una versión simple. Lo ideal sería usar un modal (ventana emergente)
// o llevar a una nueva página de detalle para cada elemento.
function handleVerMasClick(event) {
    const id = event.target.dataset.id;
    const tipo = event.target.dataset.tipo;

    if (tipo === 'banda') {
        mostrarDetalleBanda(id);
    } else if (tipo === 'evento') {
        mostrarDetalleEvento(id);
    } else if (tipo === 'multimedia') {
        mostrarDetalleMultimedia(id);
    }
}


function mostrarDetalleBanda(idBanda) {
    const bandaSeleccionada = todasLasBandas.find(banda => banda.ID_Banda === idBanda);
    if (bandaSeleccionada) {
        const integrantesDeBanda = todosLosIntegrantes.filter(int => int.ID_Banda === bandaSeleccionada.ID_Banda);
        const nombresIntegrantes = integrantesDeBanda.map(int => int.Nombre_Integrante).join(', ');

        const eventosDeBanda = todosLosEventos.filter(evento =>
            evento.Bandas_Participantes_IDs.split(',').includes(bandaSeleccionada.ID_Banda)
        );
        const nombresEventos = eventosDeBanda.map(e => `${e.Descripcion} (${e.Fecha})`).join('; ');

        const multimediaDeBanda = todoElMultimedia.filter(item =>
            item.Tipo_Relacion === 'Banda' && item.ID_Relacionado === bandaSeleccionada.ID_Banda
        );
        let multimediaHtml = multimediaDeBanda.length > 0 ? '<h4>Multimedia relacionado:</h4>' : '';
        multimediaDeBanda.forEach(item => {
            if (item.Tipo === 'Foto' || item.Tipo === 'Afiche' || item.Tipo === 'Entrada') {
                multimediaHtml += `<p><img src="${item.URL}" alt="${item.Descripcion}" style="max-width: 100px; max-height: 100px;"> ${item.Descripcion}</p>`;
            } else if (item.Tipo === 'Audio') {
                multimediaHtml += `<p>${item.Descripcion}: <audio controls><source src="${item.URL}" type="audio/mpeg"></audio></p>`;
            } else if (item.Tipo === 'Video') {
                 const videoIdMatch = item.URL.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|.+\?v=))([^&]+)/);
                 const videoId = videoIdMatch ? videoIdMatch[1] : null;
                 if (videoId) {
                     multimediaHtml += `<p>${item.Descripcion}: <iframe width="150" height="100" src="https://www.youtube.com/embed/${videoId}"
                            frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen>
                    </iframe>
                `;
            } else {
                mediaContent = `<p>Error al cargar el video. URL no válida.</p>`;
            }
        }

        alert(`
            Detalle de Contenido Multimedia
            ------------------------------
            Descripción: ${mediaSeleccionado.Descripcion}
            Tipo: ${mediaSeleccionado.Tipo}
            Relacionado con: ${relacionadoCon}
            URL: ${mediaSeleccionado.URL}

            ${mediaContent}
        `);
    }
}


// =========================================================
// 11. Inicialización del sitio cuando todos los datos están cargados
// =========================================================
function inicializarSitio() {
    // Inicialmente, mostrar solo las primeras bandas
    currentFilteredBands = [...todasLasBandas]; // Al inicio, las bandas filtradas son todas las bandas
    loadMoreBands(); // Cargar el primer lote

    // Mostrar todos los eventos y multimedia (sin paginación por ahora)
    mostrarEventos(todosLosEventos);
    mostrarMultimedia(todoElMultimedia);
}

// Llama a la función principal para cargar los datos cuando el DOM está completamente cargado.
document.addEventListener('DOMContentLoaded', cargarDatosDesdeSheets);


Resumen de los Cambios Clave en script.js:
 * Variables de Paginación para Bandas (Sección 3):
   * bandsPerPage: Cuántas bandas se mostrarán por lote (por defecto 20).
   * currentBandIndex: Controla desde qué índice se cargan las bandas (se ha eliminado ya que usaremos displayedBandsCount).
   * displayedBandsCount: Lleva la cuenta de cuántas bandas se han añadido al DOM.
   * currentFilteredBands: Almacena la lista de bandas que se están mostrando actualmente (ya sea todas o las de un resultado de búsqueda). Esto es crucial para que la paginación funcione tanto con todas las bandas como con los resultados filtrados.
 * parseCsv mejorado:
   * Añadido manejo para CSVs completamente vacíos o con solo encabezados para evitar errores.
 * createBandCardHTML y appendBandsToGrid (Sección 6):
   * La lógica para construir la tarjeta HTML de una banda se ha extraído a createBandCardHTML para mayor limpieza.
   * appendBandsToGrid ahora se encarga de añadir un array de bandas al DOM y de reasignar los eventListeners a los botones "Ver más" de las nuevas tarjetas.
 * loadMoreBands() (Sección 7):
   * Esta es la nueva función principal para la paginación.
   * Obtiene el siguiente lote de bandas de currentFilteredBands (o todasLasBandas si no hay filtro activo).
   * Añade estas bandas al bandasGrid.
   * Actualiza displayedBandsCount.
   * Oculta el botón "Ver más" si ya se mostraron todas las bandas disponibles.
   * Elimina el mensaje "Cargando bandas..." una vez que se muestra el primer lote.
 * Ajustes en mostrarBandas, mostrarEventos, mostrarMultimedia:
   * Se eliminó el listaBandasDiv.innerHTML = ''; de mostrarBandas porque ahora loadMoreBands gestiona el borrado y la adición progresiva. (Se mantiene en Eventos y Multimedia ya que no tienen paginación).
   * Se cambió la forma de asignar los eventListeners para los botones "Ver más" en mostrarBandas, mostrarEventos y mostrarMultimedia usando removeEventListener antes de addEventListener para evitar duplicados si la función se llama varias veces.
   * La lógica de item.URL.split('v=')[1] para videos de YouTube se ha mejorado con una expresión regular para manejar más formatos de URL de YouTube y un null check.
 * Búsqueda (Sección 9):
   * IDs de búsqueda separados: He ajustado los IDs de los inputs y botones de búsqueda para que el que está en la sección de Bandas (searchInputBands, searchButtonBands) sea diferente del global (searchInput, searchButton). Esto es importante para que el script pueda diferenciar qué búsqueda se está activando.
   * realizarBusquedaBandas(texto): Esta nueva función se encarga de filtrar solo las bandas y luego llama a loadMoreBands() para mostrar los resultados, respetando la paginación.
   * realizarBusquedaGlobal(texto): La función de búsqueda original ahora se centra en filtrar y mostrar todas las secciones (bandas, eventos, multimedia) de golpe, reseteando la paginación de bandas para mostrar los resultados relevantes. El botón "Ver más" se oculta en una búsqueda global, ya que se asume que se muestran todos los resultados de una vez.
 * handleVerMasClick: Se creó una función unificada para manejar todos los clics de botones "Ver más" y delegar la llamada a la función de detalle correcta.
 * inicializarSitio() (Sección 11):
   * Ahora, al inicio, inicializarSitio llama a loadMoreBands() para cargar el primer lote de bandas y solo se llama a mostrarEventos y mostrarMultimedia directamente.
Ahora, por favor, copia este código y reemplaza completamente el contenido de tu archivo script.js con él.
Después de eso, asegúrate de que tu style.css tenga los estilos que te di en mi respuesta anterior para .load-more-container y el botón, para que se vea bien. Si no tienes esos estilos en tu style.css, por favor, indícamelo o envíame el contenido de tu style.css también.
