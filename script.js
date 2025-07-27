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
            // Asigna el valor, asegurándose de que sea una cadena, incluso si la celda está vacía
            row[headers[j]] = values[j] !== undefined ? values[j] : '';
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
        const bandasGrid = document.getElementById('bandasGrid');
        if (bandasGrid) {
            bandasGrid.innerHTML = '<p style="text-align: center; width: 100%;">Error al cargar los datos. Por favor, revisa tu conexión y las URLs de Google Sheets.</p>';
        }
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
        integrante => {
            // Verifica que ID_Banda del integrante exista y sea una cadena
            if (!integrante.ID_Banda) return false;
            // Divide la cadena de IDs del integrante y busca si el ID de la banda está presente
            return integrante.ID_Banda.split(',').map(id => id.trim()).includes(banda.ID_Banda);
        }
    );
    const nombresIntegrantes = integrantesDeBanda.map(int => int.Nombre_Integrante).join(', ');

    return `
        <div class="banda-card">
            <h3>${banda.Nombre_Banda}</h3>
            <p><strong>Género:</strong> ${banda.Genero || 'N/A'}</p>
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
        // Eliminar el mensaje "Cargando bandas..." si existe o si no hay nada en el grid y es la primera carga
        if (bandasGrid.innerHTML.includes('Cargando bandas...') || displayedBandsCount === 0) {
            bandasGrid.innerHTML = '';
        }
        appendBandsToGrid(bandsToDisplay, bandasGrid);
        displayedBandsCount += bandsToDisplay.length;
    }

    // Ocultar el botón si ya no hay más bandas por cargar
    if (displayedBandsCount >= dataSource.length) {
        if (loadMoreBandsBtn) loadMoreBandsBtn.style.display = 'none';
    } else {
        if (loadMoreBandsBtn) loadMoreBandsBtn.style.display = 'block'; // Asegurarse de que esté visible si hay más
    }

    // Si no hay bandas para mostrar después de un filtro y el grid está vacío
    if (dataSource.length === 0 && displayedBandsCount === 0) {
        bandasGrid.innerHTML = '<p style="text-align: center; width: 100%;">No se encontraron bandas para tu búsqueda.</p>';
        if (loadMoreBandsBtn) loadMoreBandsBtn.style.display = 'none';
    }
}

// =========================================================
// 8. Funciones para mostrar Eventos y Multimedia (sin paginación por ahora)
// =========================================================
function mostrarEventos(eventosAMostrar) {
    const listaEventosDiv = document.getElementById('lista-eventos');
    listaEventosDiv.innerHTML = ''; // Limpiar siempre al mostrar eventos

    if (!eventosAMostrar || eventosAMostrar.length === 0) {
        listaEventosDiv.innerHTML = '<p>No se encontraron eventos.</p>';
        return;
    }

    eventosAMostrar.forEach(evento => {
        // Asegúrate de que Bandas_Participantes_IDs sea una cadena antes de split
        const bandasParticipantes = (evento.Bandas_Participantes_IDs && evento.Bandas_Participantes_IDs.trim() !== '')
            ? evento.Bandas_Participantes_IDs.split(',').map(id => id.trim())
                .map(bandaId => todasLasBandas.find(b => b.ID_Banda === bandaId)?.Nombre_Banda || 'Banda Desconocida')
                .join(', ')
            : 'No especificadas';

        const eventoDiv = document.createElement('div');
        eventoDiv.classList.add('evento-card');
        eventoDiv.innerHTML = `
            <h3>${evento.Descripcion || 'Evento sin título'}</h3>
            <p><strong>Fecha:</strong> ${evento.Fecha || 'Sin fecha'}</p>
            <p><strong>Lugar:</strong> ${evento.Lugar || 'Sin lugar'}</p>
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
    galeriaDiv.innerHTML = ''; // Limpiar siempre al mostrar multimedia

    if (!multimediaAMostrar || multimediaAMostrar.length === 0) {
        galeriaDiv.innerHTML = '<p>No se encontró contenido multimedia.</p>';
        return;
    }

    multimediaAMostrar.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('media-item');
        let contentHtml = '';

        if (item.Tipo === 'Foto' || item.Tipo === 'Afiche' || item.Tipo === 'Entrada') {
            contentHtml = `<img src="${item.URL || 'placeholder.png'}" alt="${item.Descripcion || 'Imagen'}" class="media-image">`;
        } else if (item.Tipo === 'Audio') {
            contentHtml = `
                <audio controls class="media-audio">
                    <source src="${item.URL || ''}" type="audio/mpeg">
                    Tu navegador no soporta el elemento de audio.
                </audio>
            `;
        } else if (item.Tipo === 'Video') {
            const url = item.URL || '';
            const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|.+\?v=))([^&]+)/);
            const videoId = videoIdMatch ? videoIdMatch[1] : null;

            if (videoId) {
                contentHtml = `
                    <iframe class="media-video" src="https://www.youtube.com/embed/${videoId}"
                            frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen>
                    </iframe>
                `;
            } else {
                contentHtml = `<p>Error al cargar el video. URL no válida: ${url}</p>`;
            }
        }

        // Obtener la relación, añadiendo verificaciones para evitar errores
        let relacionadoCon = 'N/A';
        if (item.Tipo_Relacion === 'Banda' && item.ID_Relacionado) {
            relacionadoCon = todasLasBandas.find(b => b.ID_Banda === item.ID_Relacionado)?.Nombre_Banda || 'Banda Desconocida';
        } else if (item.Tipo_Relacion === 'Evento' && item.ID_Relacionado) {
            relacionadoCon = todosLosEventos.find(e => e.ID_Evento === item.ID_Relacionado)?.Descripcion || 'Evento Desconocido';
        }
       
        itemDiv.innerHTML = `
            ${contentHtml}
            <h4>${item.Descripcion || 'Sin descripción'}</h4>
            <p>Tipo: ${item.Tipo || 'N/A'}</p>
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
        (banda.Nombre_Banda && banda.Nombre_Banda.toLowerCase().includes(textoNormalizado)) ||
        (banda.Genero && banda.Genero.toLowerCase().includes(textoNormalizado)) ||
        (banda.Biografia && banda.Biografia.toLowerCase().includes(textoNormalizado)) ||
        todosLosIntegrantes.some(int =>
            // Cambio importante aquí para la búsqueda también
            (int.ID_Banda && int.ID_Banda.split(',').map(id => id.trim()).includes(banda.ID_Banda)) && (int.Nombre_Integrante && int.Nombre_Integrante.toLowerCase().includes(textoNormalizado))
        )
    );

    // Reiniciar y mostrar los resultados filtrados
    bandasGrid.innerHTML = ''; // Limpiar el grid actual
    displayedBandsCount = 0; // Reiniciar contador de bandas mostradas

    if (currentFilteredBands.length === 0) {
        bandasGrid.innerHTML = '<p style="text-align: center; width: 100%;">No se encontraron bandas para tu búsqueda.</p>';
        if (loadMoreBandsBtn) loadMoreBandsBtn.style.display = 'none';
        return;
    }

    loadMoreBands(); // Cargar el primer lote de bandas filtradas
}


// Búsqueda global (afecta a todas las secciones visibles)
function realizarBusquedaGlobal(texto) {
    const textoNormalizado = texto.toLowerCase();

    // === Búsqueda y visualización de Bandas ===
    // Reseteamos el estado de paginación para la búsqueda
    currentBandIndex = 0; // Not used currently, can be removed if not needed elsewhere
    displayedBandsCount = 0;

    currentFilteredBands = todasLasBandas.filter(banda =>
        (banda.Nombre_Banda && banda.Nombre_Banda.toLowerCase().includes(textoNormalizado)) ||
        (banda.Genero && banda.Genero.toLowerCase().includes(textoNormalizado)) ||
        (banda.Biografia && banda.Biografia.toLowerCase().includes(textoNormalizado)) ||
        todosLosIntegrantes.some(int =>
            // Cambio importante aquí para la búsqueda global
            (int.ID_Banda && int.ID_Banda.split(',').map(id => id.trim()).includes(banda.ID_Banda)) && (int.Nombre_Integrante && int.Nombre_Integrante.toLowerCase().includes(textoNormalizado))
        )
    );
    const bandasGrid = document.getElementById('bandasGrid');
    bandasGrid.innerHTML = ''; // Limpiar el grid de bandas
    if (currentFilteredBands.length === 0) {
        bandasGrid.innerHTML = '<p style="text-align: center; width: 100%;">No se encontraron bandas que coincidan.</p>';
        if (loadMoreBandsBtn) loadMoreBandsBtn.style.display = 'none';
    } else {
        loadMoreBands(); // Cargar el primer lote de resultados de búsqueda para bandas
    }


    // === Búsqueda y visualización de Eventos ===
    const eventosFiltrados = todosLosEventos.filter(evento =>
        (evento.Descripcion && evento.Descripcion.toLowerCase().includes(textoNormalizado)) ||
        (evento.Lugar && evento.Lugar.toLowerCase().includes(textoNormalizado)) ||
        (evento.Bandas_Participantes_IDs && evento.Bandas_Participantes_IDs.split(',').some(id => {
            const banda = todasLasBandas.find(b => b.ID_Banda === id.trim());
            return banda && (banda.Nombre_Banda && banda.Nombre_Banda.toLowerCase().includes(textoNormalizado));
        }))
    );
    mostrarEventos(eventosFiltrados);


    // === Búsqueda y visualización de Multimedia ===
    const multimediaFiltrado = todoElMultimedia.filter(item =>
        (item.Descripcion && item.Descripcion.toLowerCase().includes(textoNormalizado)) ||
        (item.Tipo && item.Tipo.toLowerCase().includes(textoNormalizado)) ||
        (item.Tipo_Relacion === 'Banda' && item.ID_Relacionado && todasLasBandas.find(b => b.ID_Banda === item.ID_Relacionado)?.Nombre_Banda.toLowerCase().includes(textoNormalizado)) ||
        (item.Tipo_Relacion === 'Evento' && item.ID_Relacionado && todosLosEventos.find(e => e.ID_Evento === item.ID_Relacionado)?.Descripcion.toLowerCase().includes(textoNormalizado))
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
// Esta es una versión simple que usa alert(). Lo ideal sería usar un modal (ventana emergente)
// o llevar a una nueva página de detalle para cada elemento.
function handleVerMasClick(event) {
    const id = event.target.dataset.id;
    // CORRECCIÓN CLAVE AQUÍ: debe ser .dataset.tipo
    const tipo = event.target.dataset.tipo; 

    console.log('DEBUG: Clic en "Ver más". ID:', id, 'Tipo:', tipo); // Añadido para depuración

    if (tipo === 'banda') {
        mostrarDetalleBanda(id);
    } else if (tipo === 'evento') {
        mostrarDetalleEvento(id);
    } else if (tipo === 'multimedia') {
        mostrarDetalleMultimedia(id);
    } else {
        console.warn('DEBUG: Tipo de elemento desconocido para Ver más:', tipo); // Advertencia si el tipo no coincide
    }
}


function mostrarDetalleBanda(idBanda) {
    const bandaSeleccionada = todasLasBandas.find(banda => banda.ID_Banda === idBanda);
    if (bandaSeleccionada) {
        console.log('DEBUG: Banda seleccionada para detalle:', bandaSeleccionada.Nombre_Banda, 'ID:', bandaSeleccionada.ID_Banda); // Nuevo log

        const integrantesDeBanda = todosLosIntegrantes.filter(int => {
            console.log('DEBUG: Procesando integrante:', int.Nombre_Integrante, 'ID_Banda del integrante RAW:', int.ID_Banda); // Nuevo log
            // Asegúrate de que int.ID_Banda exista y no esté vacío antes de intentar split
            if (!int.ID_Banda || int.ID_Banda.trim() === '') {
                console.log('DEBUG: Integrante sin ID_Banda o ID_Banda vacío (return false):', int.Nombre_Integrante); // Nuevo log
                return false;
            }
            const integranteBandasIDs = int.ID_Banda.split(',').map(id => id.trim());
            console.log('DEBUG: IDs de banda del integrante (parseados):', integranteBandasIDs); // Nuevo log
            const isMatch = integranteBandasIDs.includes(bandaSeleccionada.ID_Banda);
            console.log('DEBUG: Coincide el ID de banda (' + bandaSeleccionada.ID_Banda + ') con el integrante?', isMatch); // Nuevo log
            return isMatch;
        });
        
        const nombresIntegrantes = integrantesDeBanda.map(int => int.Nombre_Integrante).join(', ');
        console.log('DEBUG: Nombres de integrantes resultantes:', nombresIntegrantes); // Nuevo log

        const eventosDeBanda = todosLosEventos.filter(evento =>
            evento.Bandas_Participantes_IDs && evento.Bandas_Participantes_IDs.split(',').includes(bandaSeleccionada.ID_Banda)
        );
        const nombresEventos = eventosDeBanda.map(e => `${e.Descripcion || 'Evento sin título'} (${e.Fecha || 'Sin fecha'})`).join('; ');

        // La declaración de multimediaDeBanda se movió aquí para que esté definida antes de usarse
        const multimediaDeBanda = todoElMultimedia.filter(item =>
            item.Tipo_Relacion === 'Banda' && item.ID_Relacionado === bandaSeleccionada.ID_Banda
        );
        let multimediaHtml = multimediaDeBanda.length > 0 ? '\n\nMultimedia relacionado:\n' : '';
        multimediaDeBanda.forEach(item => {
            let mediaLink = item.URL || 'N/A';
            if (item.Tipo === 'Video') {
                 // Para videos de YouTube, solo mostramos el enlace ya que no podemos incrustar en un alert
                 const videoIdMatch = (item.URL || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|.+\?v=))([^&]+)/);
                 const videoId = videoIdMatch ? videoIdMatch[1] : null;
                 if (videoId) {
                     mediaLink = `https://www.youtube.com/watch?v=${videoId}`;
                 }
            }
            multimediaHtml += `- ${item.Descripcion || 'Sin descripción'} (Tipo: ${item.Tipo || 'N/A'}): ${mediaLink}\n`;
        });

        alert(`
            Detalle de Banda: ${bandaSeleccionada.Nombre_Banda}
            -----------------------------------
            Género: ${bandaSeleccionada.Genero || 'N/A'}
            Años de actividad: ${bandaSeleccionada.Anos_Actividad || 'Sin fecha'}
            Biografía: ${bandaSeleccionada.Biografia || 'No disponible'}
            Integrantes: ${nombresIntegrantes || 'No disponibles'}
            
            Eventos Participados: ${nombresEventos || 'Ninguno'}
            ${multimediaHtml}
        `);
    }
}

function mostrarDetalleEvento(idEvento) {
    const eventoSeleccionado = todosLosEventos.find(evento => evento.ID_Evento === idEvento);
    if (eventoSeleccionado) {
        const bandasParticipantes = (eventoSeleccionado.Bandas_Participantes_IDs && eventoSeleccionado.Bandas_Participantes_IDs.trim() !== '')
            ? eventoSeleccionado.Bandas_Participantes_IDs.split(',').map(id => id.trim())
                .map(bandaId => todasLasBandas.find(b => b.ID_Banda === bandaId)?.Nombre_Banda || 'Banda Desconocida')
                .join(', ')
            : 'No especificadas';

        const multimediaDeEvento = todoElMultimedia.filter(item =>
            item.Tipo_Relacion === 'Evento' && item.ID_Relacionado === eventoSeleccionado.ID_Evento
        );
        let multimediaHtml = multimediaDeEvento.length > 0 ? '\n\nMultimedia relacionado:\n' : '';
        multimediaDeEvento.forEach(item => {
            let mediaLink = item.URL || 'N/A';
            if (item.Tipo === 'Video') {
                 const videoIdMatch = (item.URL || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|.+\?v=))([^&]+)/);
                 const videoId = videoIdMatch ? videoIdMatch[1] : null;
                 if (videoId) {
                     mediaLink = `https://www.youtube.com/watch?v=${videoId}`;
                 }
            }
            multimediaHtml += `- ${item.Descripcion || 'Sin descripción'} (Tipo: ${item.Tipo || 'N/A'}): ${mediaLink}\n`;
        });


        alert(`
            Detalle de Evento: ${eventoSeleccionado.Descripcion}
            ------------------------------------
            Fecha: ${eventoSeleccionado.Fecha || 'Sin fecha'}
            Lugar: ${eventoSeleccionado.Lugar || 'Sin lugar'}
            Bandas Participantes: ${bandasParticipantes}
            ${multimediaHtml}
        `);
    }
}

function mostrarDetalleMultimedia(idMedia) {
    const mediaSeleccionado = todoElMultimedia.find(item => item.ID_Media === idMedia);
    if (mediaSeleccionado) {
        let mediaContent = ''; // Para mostrar el URL o ID del video/audio en el alert
        if (mediaSeleccionado.URL) {
            if (mediaSeleccionado.Tipo === 'Foto' || mediaSeleccionado.Tipo === 'Afiche' || mediaSeleccionado.Tipo === 'Entrada') {
                mediaContent = `URL de la Imagen: ${mediaSeleccionado.URL}`;
            } else if (mediaSeleccionado.Tipo === 'Audio') {
                mediaContent = `URL del Audio: ${mediaSeleccionado.URL}`;
            } else if (mediaSeleccionado.Tipo === 'Video') {
                const videoIdMatch = (mediaSeleccionado.URL || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|.+\?v=))([^&]+)/);
                const videoId = videoIdMatch ? videoIdMatch[1] : null;
                if (videoId) {
                    mediaContent = `URL del Video de YouTube: https://www.youtube.com/watch?v=${videoId}`;
                } else {
                    mediaContent = `URL del Video (no YouTube): ${mediaSeleccionado.URL}`;
                }
            }
        } else {
            mediaContent = 'URL no disponible.';
        }


        let relacionadoCon = 'N/A';
        if (mediaSeleccionado.Tipo_Relacion === 'Banda' && mediaSeleccionado.ID_Relacionado) {
            relacionadoCon = todasLasBandas.find(b => b.ID_Banda === mediaSeleccionado.ID_Relacionado)?.Nombre_Banda || 'Banda Desconocida';
        } else if (mediaSeleccionado.Tipo_Relacion === 'Evento' && mediaSeleccionado.ID_Relacionado) {
            relacionadoCon = todosLosEventos.find(e => e.ID_Evento === mediaSeleccionado.ID_Relacionado)?.Descripcion || 'Evento Desconocida';
        }

        alert(`
            Detalle de Contenido Multimedia
            ------------------------------
            Descripción: ${mediaSeleccionado.Descripcion || 'Sin descripción'}
            Tipo: ${mediaSeleccionado.Tipo || 'N/A'}
            Relacionado con: ${relacionadoCon}
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
    
    const bandasGrid = document.getElementById('bandasGrid');
    if (bandasGrid) {
        bandasGrid.innerHTML = '<p style="text-align: center; width: 100%;">Cargando bandas...</p>';
    }

    loadMoreBands(); // Cargar el primer lote

    // Mostrar todos los eventos y multimedia (sin paginación por ahora)
    mostrarEventos(todosLosEventos);
    mostrarMultimedia(todoElMultimedia);
}

// Llama a la función principal para cargar los datos cuando el DOM está completamente cargado.
document.addEventListener('DOMContentLoaded', cargarDatosDesdeSheets);
