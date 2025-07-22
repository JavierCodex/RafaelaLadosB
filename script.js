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
// 3. Función auxiliar para parsear CSV a un array de objetos
// =========================================================
function parseCsv(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(value => value.trim());
        const row = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = values[j];
        }
        data.push(row);
    }
    return data;
}

// =========================================================
// 4. Funciones para cargar los datos desde Google Sheets
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
        document.getElementById('lista-bandas').innerHTML = '<p>Error al cargar los datos. Por favor, revisa tu conexión y las URLs de Google Sheets.</p>';
    }
}

// =========================================================
// 5. Funciones para mostrar los datos en la página
// =========================================================
function mostrarBandas(bandasAMostrar) {
    const listaBandasDiv = document.getElementById('lista-bandas');
    listaBandasDiv.innerHTML = '';

    if (bandasAMostrar.length === 0) {
        listaBandasDiv.innerHTML = '<p>No se encontraron bandas que coincidan con tu búsqueda.</p>';
        return;
    }

    bandasAMostrar.forEach(banda => {
        const integrantesDeBanda = todosLosIntegrantes.filter(
            integrante => integrante.ID_Banda === banda.ID_Banda
        );
        const nombresIntegrantes = integrantesDeBanda.map(int => int.Nombre_Integrante).join(', ');

        const bandaDiv = document.createElement('div');
        bandaDiv.classList.add('banda-card');
        bandaDiv.innerHTML = `
            <h3>${banda.Nombre_Banda}</h3>
            <p><strong>Género:</strong> ${banda.Genero}</p>
            <p><strong>Años de actividad:</strong> ${banda.Anos_Actividad || 'Sin fecha'}</p>
            ${nombresIntegrantes ? `<p><strong>Integrantes:</strong> ${nombresIntegrantes}</p>` : ''}
            <button class="ver-mas-btn" data-id="${banda.ID_Banda}" data-tipo="banda">Ver más</button>
        `;
        listaBandasDiv.appendChild(bandaDiv);
    });

    document.querySelectorAll('.ver-mas-btn[data-tipo="banda"]').forEach(button => {
        button.addEventListener('click', (event) => {
            mostrarDetalleBanda(event.target.dataset.id);
        });
    });
}

function mostrarEventos(eventosAMostrar) {
    const listaEventosDiv = document.getElementById('lista-eventos');
    listaEventosDiv.innerHTML = '';

    if (eventosAMostrar.length === 0) {
        listaEventosDiv.innerHTML = '<p>No se encontraron eventos.</p>';
        return;
    }

    eventosAMostrar.forEach(evento => {
        // Esta línea maneja múltiples IDs de banda separados por coma
        const bandasParticipantes = evento.Bandas_Participantes_IDs
            ? evento.Bandas_Participantes_IDs.split(',').map(id => id.trim())
                .map(bandaId => todasLasBandas.find(b => b.ID_Banda === bandaId)?.Nombre_Banda || 'Banda Desconocida')
                .join(', ')
            : 'No especificadas'; // Si está vacío o undefined, mostrar "No especificadas"

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
        button.addEventListener('click', (event) => {
            mostrarDetalleEvento(event.target.dataset.id);
        });
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
            // Ejemplo para videos de YouTube, necesitaráas el ID del video en la URL
            contentHtml = `
                <iframe class="media-video" src="https://www.youtube.com/embed/${item.URL.split('v=')[1]}" 
                        frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen>
                </iframe>
            `;
        }

        const relacionadoCon = item.Tipo_Relacion === 'Banda'
            ? todasLasBandas.find(b => b.ID_Banda === item.ID_Relacionado)?.Nombre_Banda
            : todosLosEventos.find(e => e.ID_Evento === item.ID_Relacionado)?.Descripcion;
       
        

        itemDiv.innerHTML = `
            ${contentHtml}
            <h4>${item.Descripcion}</h4>
            <p>Tipo: ${item.Tipo}</p>
            ${relacionadoCon ? `<p class="media-relacion">Relacionado con: ${relacionadoCon}</p>` : ''}
            <button class="ver-mas-btn" data-id="${item.ID_Media}" data-tipo="multimedia">Ver más</button>
        `;
        galeriaDiv.appendChild(itemDiv);
    });

    document.querySelectorAll('.ver-mas-btn[data-tipo="multimedia"]').forEach(button => {
        button.addEventListener('click', (event) => {
            mostrarDetalleMultimedia(event.target.dataset.id);
        });
    });
}

// =========================================================
// 6. Lógica de Búsqueda General y Recomendaciones
// =========================================================
const inputBusqueda = document.getElementById('busqueda');
const btnBuscar = document.getElementById('btn-buscar');

if (inputBusqueda) {
    inputBusqueda.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            realizarBusqueda(inputBusqueda.value);
        }
    });
}

if (btnBuscar) {
    btnBuscar.addEventListener('click', () => {
        realizarBusqueda(inputBusqueda.value);
    });
}

function realizarBusqueda(texto) {
    const textoNormalizado = texto.toLowerCase();

    // 1. Filtrar y mostrar Bandas
    const bandasFiltradas = todasLasBandas.filter(banda =>
        banda.Nombre_Banda.toLowerCase().includes(textoNormalizado) ||
        banda.Genero.toLowerCase().includes(textoNormalizado) ||
        banda.Biografia.toLowerCase().includes(textoNormalizado) ||
        todosLosIntegrantes.some(int =>
            int.ID_Banda === banda.ID_Banda && int.Nombre_Integrante.toLowerCase().includes(textoNormalizado)
        )
    );
    mostrarBandas(bandasFiltradas);

    // 2. Filtrar y mostrar Eventos
    const eventosFiltrados = todosLosEventos.filter(evento =>
        evento.Descripcion.toLowerCase().includes(textoNormalizado) ||
        evento.Lugar.toLowerCase().includes(textoNormalizado) ||
        // Buscar por bandas participantes
        evento.Bandas_Participantes_IDs.split(',').some(id => {
            const banda = todasLasBandas.find(b => b.ID_Banda === id.trim());
            return banda && banda.Nombre_Banda.toLowerCase().includes(textoNormalizado);
        })
    );
    mostrarEventos(eventosFiltrados);

    // 3. Filtrar y mostrar Multimedia
    const multimediaFiltrado = todoElMultimedia.filter(item =>
        item.Descripcion.toLowerCase().includes(textoNormalizado) ||
        item.Tipo.toLowerCase().includes(textoNormalizado) ||
        // Buscar por banda o evento relacionado
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
// 7. Funciones para mostrar detalles (requieren un modal o vista de detalle)
// =========================================================
// Esta es una versión simple. Lo ideal sería usar un modal (ventana emergente)
// o llevar a una nueva página de detalle para cada elemento.
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
            }
            // Agrega más tipos de multimedia aquí
        });

        // Generar recomendaciones
        const recomendaciones = obtenerRecomendaciones(idBanda);
        let recomendacionesHtml = '';
        if (recomendaciones.length > 0) {
            recomendacionesHtml = '<h4>También te podria interesar:</h4><ul>';
            recomendaciones.forEach(rec => {
                recomendacionesHtml += `<li>${rec.Nombre_Banda} (${rec.Genero})</li>`;
            });
            recomendacionesHtml += '</ul>';
        }

        // Usa un alert simple por ahora, pero reemplázalo por un modal
        alert(`
            Detalles de ${bandaSeleccionada.Nombre_Banda}
            -------------------------------------
            Género: ${bandaSeleccionada.Genero}
            Años de actividad: ${bandaSeleccionada.Anos_Actividad}
            Integrantes: ${nombresIntegrantes || 'No especificados'}
            Biografía: ${bandaSeleccionada.Biografia}

            Eventos en los que participó:
            ${nombresEventos || 'Ninguno conocido'}

            ${multimediaHtml}
            ${recomendacionesHtml}
        `);
    }
}

function mostrarDetalleEvento(idEvento) {
    const eventoSeleccionado = todosLosEventos.find(evento => evento.ID_Evento === idEvento);
    if (eventoSeleccionado) {
        const bandasParticipantes = eventoSeleccionado.Bandas_Participantes_IDs.split(',').map(id => id.trim())
            .map(bandaId => todasLasBandas.find(b => b.ID_Banda === bandaId)?.Nombre_Banda || 'Banda Desconocida')
            .join(', ');

        const multimediaDeEvento = todoElMultimedia.filter(item =>
            item.Tipo_Relacion === 'Evento' && item.ID_Relacionado === eventoSeleccionado.ID_Evento
        );
        let multimediaHtml = multimediaDeEvento.length > 0 ? '<h4>Multimedia del evento:</h4>' : '';
        multimediaDeEvento.forEach(item => {
            if (item.Tipo === 'Foto' || item.Tipo === 'Afiche' || item.Tipo === 'Entrada') {
                multimediaHtml += `<p><img src="${item.URL}" alt="${item.Descripcion}" style="max-width: 100px; max-height: 100px;"> ${item.Descripcion}</p>`;
            }
        });

        alert(`
            Detalles del Evento: ${eventoSeleccionado.Descripcion}
            ------------------------------------------
            Fecha: ${eventoSeleccionado.Fecha}
            Lugar: ${eventoSeleccionado.Lugar}
            Bandas Participantes: ${bandasParticipantes || 'No especificadas'}

            ${multimediaHtml}
        `);
    }
}

function mostrarDetalleMultimedia(idMedia) {
    const mediaSeleccionado = todoElMultimedia.find(item => item.ID_Media === idMedia);
    if (mediaSeleccionado) {
        let relacionadoCon = 'N/A';
        if (mediaSeleccionado.Tipo_Relacion === 'Banda') {
            relacionadoCon = todasLasBandas.find(b => b.ID_Banda === mediaSeleccionado.ID_Relacionado)?.Nombre_Banda || 'Banda Desconocida';
        } else if (mediaSeleccionado.Tipo_Relacion === 'Evento') {
            relacionadoCon = todosLosEventos.find(e => e.ID_Evento === mediaSeleccionado.ID_Relacionado)?.Descripcion || 'Evento Desconocido';
        }

        let mediaContent = '';
        if (mediaSeleccionado.Tipo === 'Foto' || mediaSeleccionado.Tipo === 'Afiche' || mediaSeleccionado.Tipo === 'Entrada') {
            mediaContent = `<img src="${mediaSeleccionado.URL}" alt="${mediaSeleccionado.Descripcion}" style="max-width: 300px;">`;
        } else if (mediaSeleccionado.Tipo === 'Audio') {
            mediaContent = `<audio controls><source src="${mediaSeleccionado.URL}" type="audio/mpeg"></audio>`;
        } else if (mediaSeleccionado.Tipo === 'Video') {
             mediaContent = `
                <iframe width="300" height="200" src="https://www.youtube.com/embed/${mediaSeleccionado.URL.split('v=')[1]}" 
                        frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen>
                </iframe>
            `;
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
// 8. Inicialización del sitio cuando todos los datos están cargados
// =========================================================
function inicializarSitio() {
    // Mostrar todas las bandas, eventos y multimedia al cargar la página
    mostrarBandas(todasLasBandas);
    mostrarEventos(todosLosEventos);
    mostrarMultimedia(todoElMultimedia);
    // Puedes añadir aquí otras inicializaciones, como el mapa si lo implementas.
}

// Llama a la función principal para cargar los datos cuando el DOM está completamente cargado.
document.addEventListener('DOMContentLoaded', cargarDatosDesdeSheets);