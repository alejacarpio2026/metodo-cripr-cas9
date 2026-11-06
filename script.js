const ASSETS = {
  characters: {
    cell: "ADN/IMAGENES/1.png",
    don: "ADN/IMAGENES/2.png",
    guide: "ADN/IMAGENES/3.png",
    detective: "ADN/IMAGENES/4.png"
  },
  backgrounds: {
    library: "url('ADN/IMAGENES/FONDOS/1.png')",
    home: "url('ADN/IMAGENES/FONDOS/2.png')",
    lab: "url('ADN/IMAGENES/FONDOS/3.png')",
    sunny: "url('ADN/IMAGENES/FONDOS/4.png')"
  }
};

const STORAGE_KEY = "adn-cuidador-celula-v1";
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const defaultState = () => ({
  screen: "home",
  dias: 1,
  maxDias: 6,
  integridadADN: 82,
  reparacionADN: 68,
  regulacionGenica: 78,
  estresCelular: 24,
  controlDivision: 80,
  damageDetected: 0,
  damageRepaired: 0,
  mutationsDetected: 0,
  regulationDetected: 0,
  persistentAlerts: 0,
  currentEvent: 0,
  repairSolved: false,
  detectiveRound: null,
  repairTarget: 3,
  unlocked: {
    library: false,
    epigenetics: false,
    repair: false,
    detective: false,
    report: false
  },
  geneState: {
    repair: "basal",
    cycle: "basal",
    stress: "basal",
    expression: "basal"
  },
  log: []
});

let state = loadState();
const game = document.querySelector("#game");
const modal = document.querySelector("#modal");
const modalTitle = document.querySelector("#modalTitle");
const modalKicker = document.querySelector("#modalKicker");
const modalBody = document.querySelector("#modalBody");
const modalActions = document.querySelector("#modalActions");

const events = [
  {
    title: "Exposicion a radiacion UV",
    bg: "sunny",
    text: "La celula estuvo expuesta a radiacion ultravioleta durante una salida al escenario soleado.",
    effect: { integridadADN: -13, estresCelular: 14, reparacionADN: -4 },
    unlock: "repair",
    capsule: "La radiacion UV puede producir determinados tipos de dano en el ADN. Las celulas cuentan con mecanismos que detectan y reparan algunos de estos danos; una exposicion concreta no significa automaticamente cancer."
  },
  {
    title: "Senales de regulacion genica",
    bg: "library",
    text: "Algunos genes cambiaron su nivel de acceso sin que cambiara la secuencia de letras del ADN.",
    effect: { regulacionGenica: -12, estresCelular: 8 },
    unlock: "epigenetics",
    capsule: "La epigenetica estudia cambios en la regulacion de la expresion genica que no implican cambiar la secuencia del ADN."
  },
  {
    title: "Error durante la replicacion",
    bg: "lab",
    text: "Durante la copia del ADN aparece una diferencia entre la secuencia original y la nueva.",
    effect: { integridadADN: -10, controlDivision: -7, estresCelular: 10 },
    unlock: "detective",
    capsule: "Una mutacion es un cambio en la secuencia del ADN. Sus efectos dependen de donde ocurre, que funcion tiene esa region y otros procesos celulares."
  },
  {
    title: "Control de division bajo presion",
    bg: "lab",
    text: "La celula recibe senales contradictorias sobre si debe avanzar o detener su ciclo.",
    effect: { controlDivision: -14, estresCelular: 12, regulacionGenica: -7 },
    unlock: "library",
    capsule: "El control del ciclo celular ayuda a coordinar crecimiento, reparacion y division. Alteraciones persistentes en estos procesos pueden contribuir a enfermedades, pero el cancer es un proceso complejo."
  }
];

const genes = [
  {
    id: "repair",
    title: "Gen de reparacion",
    text: "Representa instrucciones relacionadas con procesos de reparacion del ADN.",
    simple: "Los genes contienen instrucciones que permiten fabricar proteinas y realizar funciones especificas.",
    activate: { reparacionADN: 9, estresCelular: -3 },
    silence: { reparacionADN: -8, regulationDetected: 1 }
  },
  {
    id: "cycle",
    title: "Control del ciclo celular",
    text: "Simboliza funciones que ayudan a decidir cuando una celula puede dividirse.",
    simple: "La division celular necesita puntos de control que revisan si la celula esta lista.",
    activate: { controlDivision: 8, estresCelular: -2 },
    silence: { controlDivision: -10, regulationDetected: 1 }
  },
  {
    id: "stress",
    title: "Respuesta al estres",
    text: "Agrupa respuestas celulares frente a condiciones que alteran su equilibrio.",
    simple: "La respuesta al estres no es una cura; es una red de senales para adaptarse o detener procesos.",
    activate: { estresCelular: -8, regulacionGenica: 3 },
    silence: { estresCelular: 8, regulationDetected: 1 }
  },
  {
    id: "expression",
    title: "Expresion genica",
    text: "Muestra que un gen puede estar mas o menos disponible para ser leido.",
    simple: "Regular un gen cambia cuanto se expresa, no necesariamente sus letras A, T, C y G.",
    activate: { regulacionGenica: 7 },
    silence: { regulacionGenica: -7, regulationDetected: 1 }
  }
];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...defaultState(), ...saved } : defaultState();
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setBg(name) {
  game.style.setProperty("--screen-bg", ASSETS.backgrounds[name] || ASSETS.backgrounds.home);
}

function render() {
  saveState();
  const screens = {
    home: renderHome,
    case: renderCase,
    main: renderMain,
    event: renderEvent,
    library: renderLibrary,
    repair: renderRepair,
    detective: renderDetective,
    report: renderReport
  };
  (screens[state.screen] || renderHome)();
}

function topbar() {
  const unlocks = [
    ["library", "Biblioteca"],
    ["epigenetics", "Epigenetica"],
    ["repair", "Reparacion"],
    ["detective", "Detective"],
    ["report", "Reporte"]
  ];
  return `
    <div class="topbar">
      <div class="brand"><span class="brand-mark">ADN</span><span>Cuidador de la Celula</span></div>
      <div class="progress-pills">
        ${unlocks.map(([key, label]) => `<span class="pill ${state.unlocked[key] ? "" : "locked"}">${state.unlocked[key] ? "Abierto" : "Bloqueado"} ${label}</span>`).join("")}
      </div>
    </div>
  `;
}

function character(name, className = "character") {
  return `<img class="${className}" src="${ASSETS.characters[name]}" alt="${name}">`;
}

function renderHome() {
  setBg("home");
  game.innerHTML = `
    <section class="screen hero">
      <div class="hero-copy">
        <h1>ADN: CUIDADOR DE LA CELULA</h1>
        <p>Un pequeno viaje por la genetica, la epigenetica y la reparacion del ADN.</p>
        <div class="actions">
          <button class="primary" data-action="start">COMENZAR CASO</button>
          <button class="ghost" data-action="how">Como se juega</button>
        </div>
      </div>
      <aside class="hero-card">
        <p class="kicker">Caso educativo</p>
        <h2>Cuida procesos celulares, no una barra medica.</h2>
        <p>Observa eventos, explora genes, repara danos y compara secuencias para entender conceptos reales sin convertirlos en diagnosticos.</p>
      </aside>
    </section>
  `;
}

function renderCase() {
  setBg("home");
  game.innerHTML = `
    <section class="screen case-layout">
      ${topbar()}
      <div class="panel case-card">
        <p class="kicker">CASO #001</p>
        <h2>Esta celula acaba de entrar bajo tu cuidado.</h2>
        <p>Durante los proximos dias deberas observar su estado, responder a diferentes situaciones y descubrir que ocurre con su ADN.</p>
        <p>Tu mision es mantener procesos celulares funcionando lo mejor posible mientras aprendes que el dano, la reparacion y la regulacion son parte de una historia compleja.</p>
        <button class="primary" data-action="accept">ACEPTAR CASO</button>
      </div>
      <div class="character-zone">${character("cell")}</div>
    </section>
  `;
}

function renderMain() {
  setBg(state.dias % 2 ? "home" : "lab");
  const needsAlert = state.estresCelular > 70 || state.controlDivision < 38 || state.integridadADN < 42;
  game.innerHTML = `
    <section class="screen main-layout">
      ${topbar()}
      <div class="character-zone">${character("cell")}</div>
      <div class="panel">
        <div class="status-title">
          <div>
            <p class="kicker">Panel principal</p>
            <h2>Estado actual de la celula</h2>
          </div>
          <span class="day-badge">Dia ${state.dias}</span>
        </div>
        ${bars()}
        <p class="note">Indicadores educativos del estado celular, no valores medicos reales.</p>
        ${needsAlert ? `<div class="panel alert"><strong>ALERTA CELULAR</strong><p>Se han acumulado alteraciones en procesos relacionados con regulacion genica, reparacion del ADN o control de division celular.</p></div>` : ""}
        <div class="choice-grid">
          <button class="choice" data-action="next-event">Atender situacion<span>Avanza el caso y desbloquea conceptos.</span></button>
          <button class="choice" data-action="library" ${state.unlocked.library ? "" : "disabled"}>Biblioteca del ADN<span>Genes como libros interactivos.</span></button>
          <button class="choice" data-action="repair" ${state.unlocked.repair ? "" : "disabled"}>Reparacion del ADN<span>Detecta y repara una zona danada.</span></button>
          <button class="choice" data-action="detective" ${state.unlocked.detective ? "" : "disabled"}>Detective del ADN<span>Compara secuencias ATCG.</span></button>
          <button class="choice" data-action="epigenetics" ${state.unlocked.epigenetics ? "" : "disabled"}>Epigenetica<span>Regulacion sin cambiar secuencia.</span></button>
          <button class="choice" data-action="finish" ${state.dias >= state.maxDias ? "" : "disabled"}>Reporte final<span>Disponible al terminar el caso.</span></button>
        </div>
      </div>
    </section>
  `;
}

function bars() {
  const rows = [
    ["Integridad del ADN", state.integridadADN, "linear-gradient(90deg, #2f7de1, #35b7c2)"],
    ["Reparacion del ADN", state.reparacionADN, "linear-gradient(90deg, #45a863, #89c85b)"],
    ["Regulacion genica", state.regulacionGenica, "linear-gradient(90deg, #7653c8, #4a8de1)"],
    ["Estres celular", state.estresCelular, "linear-gradient(90deg, #f5be44, #dc4f54)"],
    ["Control de division", state.controlDivision, "linear-gradient(90deg, #1f9a9a, #2f72d2)"]
  ];
  return `<div class="bars">${rows.map(([label, value, color]) => `
    <div class="bar-row">
      <div class="bar-label"><span>${label}</span><span>${value}%</span></div>
      <div class="track"><div class="fill" style="--value:${value}%;--bar-color:${color}"></div></div>
    </div>
  `).join("")}</div>`;
}

function renderEvent() {
  const event = events[state.currentEvent % events.length];
  setBg(event.bg);
  game.innerHTML = `
    <section class="screen main-layout">
      ${topbar()}
      <div class="character-zone">${character("cell")}</div>
      <div class="panel event-card">
        <p class="kicker">Situacion del dia ${state.dias}</p>
        <h2>${event.title}</h2>
        <p>${event.text}</p>
        <div class="choice-grid">
          <button class="choice" data-action="observe">Observar el dano<span>Ver explicacion cientifica.</span></button>
          <button class="choice" data-action="try-repair">Intentar reparar<span>Llama a Don ReparADN.</span></button>
          <button class="choice" data-action="continue-event">Continuar<span>Registrar cambios y avanzar.</span></button>
        </div>
      </div>
    </section>
  `;
}

function renderLibrary() {
  setBg("library");
  game.innerHTML = `
    <section class="screen library-layout">
      ${topbar()}
      <div>
        <div class="panel">
          <p class="kicker">Biblioteca del ADN</p>
          <h2>Genes representados como libros</h2>
          <p>Cada libro simboliza instrucciones celulares. Activar o silenciar modifica estados educativos del juego, no produce efectos medicos reales.</p>
        </div>
        <div class="books-grid">
          ${genes.map(g => `
            <button class="book" data-action="book" data-gene="${g.id}">
              <h3>${g.title}</h3>
              <p>${g.text}</p>
              <span class="tag">${state.geneState[g.id] === "silenced" ? "Marcado: menor acceso" : state.geneState[g.id] === "active" ? "Activo: mayor expresion" : "Estado basal"}</span>
            </button>
          `).join("")}
        </div>
      </div>
      <div class="character-zone">
        ${character("guide", "character medium")}
        <div class="dialogue">
          <strong>Guia de biblioteca</strong>
          <p>Piensa en los genes como instrucciones consultables. La celula no lee todo al mismo tiempo: regula que usa, cuando y cuanto.</p>
        </div>
        <button class="ghost" data-action="main">Volver al panel</button>
      </div>
    </section>
  `;
}

function renderEpigeneticsModal() {
  showModal({
    kicker: "Epigenetica",
    title: "Cambio en regulacion vs. cambio en secuencia",
    body: `
      <p>La epigenetica estudia cambios en la regulacion de la expresion genica que no implican cambiar la secuencia de letras del ADN.</p>
      <div class="epigenetic-demo">
        <div class="mini-card"><strong>ANTES</strong><div class="mini-book">Libro accesible</div></div>
        <div class="mini-card"><strong>DESPUES</strong><div class="mini-book silenced">Acceso reducido</div></div>
      </div>
      <p><strong>Cambio en la secuencia:</strong> cambia una o mas letras A, T, C o G.</p>
      <p><strong>Cambio en la regulacion:</strong> cambia cuanto se expresa un gen sin necesariamente cambiar sus letras.</p>
    `,
    actions: [{ label: "Entendido", className: "primary", action: closeModal }]
  });
  state.unlocked.epigenetics = true;
  state.regulationDetected += 1;
  saveState();
}

function renderRepair() {
  setBg("lab");
  const nodes = ["A", "T", "C", "G", "A", "T", "G", "C"];
  game.innerHTML = `
    <section class="screen lab-layout">
      ${topbar()}
      <div>
        <div class="panel">
          <p class="kicker">Sistema de reparacion</p>
          <h2>Dano, deteccion, reparacion, recuperacion</h2>
          <p>Identifica el segmento afectado y activa el proceso. Este minijuego ensena el concepto general, no simula cada paso molecular.</p>
          <div class="dna-repair">
            ${nodes.map((letter, index) => `<button class="dna-node ${index === state.repairTarget ? "damaged" : ""}" data-action="repair-node" data-index="${index}" aria-label="${index === state.repairTarget ? "Segmento danado" : "Segmento " + letter}">${index === state.repairTarget ? "!" : letter}</button>`).join("")}
          </div>
          <div class="actions">
            <button class="primary" data-action="repair-hint">Haz clic en el segmento !</button>
            <button class="ghost" data-action="main">Volver</button>
          </div>
        </div>
      </div>
      <div class="character-zone">
        ${character("don", "character medium")}
        <div class="dialogue">
          <strong>Don ReparADN</strong>
          <p>¡¿PERO QUE LE PASO A ESTE ADN?! Primero detectamos el sitio afectado, despues elegimos una via de reparacion posible. ¡A reparar se ha dicho!</p>
        </div>
      </div>
    </section>
  `;
}

function newDetectiveRound() {
  const letters = ["A", "T", "C", "G"];
  const original = Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * letters.length)]);
  const index = Math.floor(Math.random() * original.length);
  let replacement = original[index];
  while (replacement === original[index]) replacement = letters[Math.floor(Math.random() * letters.length)];
  const changed = [...original];
  changed[index] = replacement;
  state.detectiveRound = { original, changed, index, answered: false };
}

function renderDetective() {
  setBg("lab");
  if (!state.detectiveRound || state.detectiveRound.answered) newDetectiveRound();
  const round = state.detectiveRound;
  game.innerHTML = `
    <section class="screen lab-layout">
      ${topbar()}
      <div>
        <div class="panel">
          <p class="kicker">Detective del ADN</p>
          <h2>Donde esta el cambio?</h2>
          <p>Compara la secuencia original con la nueva y haz clic en la posicion que cambio.</p>
          <div class="sequence-board">
            <div class="sequence-row"><span class="sequence-label">Original</span>${round.original.map(base => `<span class="seq-cell">${base}</span>`).join("")}</div>
            <div class="sequence-row"><span class="sequence-label">Nueva</span>${round.changed.map((base, index) => `<button class="seq-cell target" data-action="detect-base" data-index="${index}">${base}</button>`).join("")}</div>
          </div>
          <div class="actions">
            <button class="secondary" data-action="new-round">Nuevo ejemplo</button>
            <button class="ghost" data-action="main">Volver</button>
          </div>
        </div>
      </div>
      <div class="character-zone">
        ${character("detective", "character medium")}
        <div class="dialogue">
          <strong>Detective del ADN</strong>
          <p>Una diferencia en letras puede ser una pista. Pero una mutacion no implica automaticamente cancer: importa el contexto biologico.</p>
        </div>
      </div>
    </section>
  `;
}

function renderReport() {
  setBg("home");
  state.unlocked.report = true;
  saveState();
  const narrative = buildNarrative();
  game.innerHTML = `
    <section class="screen report-layout">
      ${topbar()}
      <div class="report-card">
        <p class="kicker">REPORTE DEL CUIDADOR</p>
        <h2>CASO #001</h2>
        <div class="report-grid">
          ${reportItem("Dias bajo cuidado", state.dias)}
          ${reportItem("Estado de integridad del ADN", `${state.integridadADN}%`)}
          ${reportItem("Actividad de reparacion", `${state.reparacionADN}%`)}
          ${reportItem("Regulacion genica", `${state.regulacionGenica}%`)}
          ${reportItem("Estres celular", `${state.estresCelular}%`)}
          ${reportItem("Control de division celular", `${state.controlDivision}%`)}
          ${reportItem("Danos detectados", state.damageDetected)}
          ${reportItem("Danos reparados", state.damageRepaired)}
          ${reportItem("Cambios de secuencia detectados", state.mutationsDetected)}
          ${reportItem("Alteraciones de regulacion detectadas", state.regulationDetected)}
        </div>
        <p>${narrative}</p>
        <p>Alteraciones persistentes en reparacion del ADN, regulacion genica o control de division pueden contribuir al desarrollo de enfermedades como el cancer, aunque el desarrollo del cancer es complejo y depende de multiples factores.</p>
        <button class="primary" data-action="reset">VOLVER A JUGAR</button>
      </div>
      <div class="character-zone">
        ${character("don", "character medium")}
        <div class="dialogue">
          <strong>Don ReparADN</strong>
          <p>Bueno... no quedo tan mal. Encontraste problemas, reparaste algunos danos y aprendiste que el ADN no es simplemente un libro que se queda quieto.</p>
          <p>¡Y LA PROXIMA VEZ CUIDA MEJOR ESE ADN!</p>
        </div>
      </div>
    </section>
  `;
}

function reportItem(label, value) {
  return `<div class="report-item"><strong>${label}</strong><span>${value}</span></div>`;
}

function buildNarrative() {
  const parts = [];
  if (state.damageDetected) parts.push("detectaste danos en el ADN");
  if (state.damageRepaired) parts.push("activaste mecanismos de reparacion");
  if (state.mutationsDetected) parts.push("identificaste cambios de secuencia");
  if (state.regulationDetected) parts.push("observaste cambios de regulacion genica sin cambiar directamente la secuencia");
  return parts.length
    ? `Durante este caso ${parts.join(", ")}. Cada decision mostro una parte distinta de como una celula mantiene y usa su informacion.`
    : "Durante este caso mantuviste a la celula bajo observacion, pero quedan conceptos por explorar en futuras rondas.";
}

function applyEffect(effect) {
  Object.entries(effect).forEach(([key, delta]) => {
    if (key in state && typeof state[key] === "number") {
      if (key === "estresCelular") state[key] = clamp(state[key] + delta);
      else state[key] = clamp(state[key] + delta);
    }
  });
  if (state.estresCelular > 70 || state.controlDivision < 38 || state.integridadADN < 42) {
    state.persistentAlerts += 1;
  }
}

function unlock(key) {
  if (key) state.unlocked[key] = true;
}

function continueEvent() {
  const event = events[state.currentEvent % events.length];
  applyEffect(event.effect);
  unlock(event.unlock);
  state.unlocked.library = true;
  state.currentEvent += 1;
  state.dias += 1;
  if (state.dias > state.maxDias) state.unlocked.report = true;
  state.screen = state.dias > state.maxDias ? "report" : "main";
  render();
}

function showModal({ kicker = "", title, body, actions = [] }) {
  modalKicker.textContent = kicker;
  modalTitle.textContent = title;
  modalBody.innerHTML = body;
  modalActions.innerHTML = "";
  actions.forEach(({ label, className = "secondary", action }) => {
    const button = document.createElement("button");
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", action);
    modalActions.appendChild(button);
  });
  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
}

function showScienceCapsule(event) {
  state.damageDetected += event.title.includes("dano") || event.title.includes("radiacion") ? 1 : 0;
  showModal({
    kicker: "Capsula cientifica",
    title: event.title,
    body: `<p>${event.capsule}</p>`,
    actions: [{ label: "Continuar", className: "primary", action: closeModal }]
  });
  saveState();
}

function showBook(geneId) {
  const gene = genes.find(item => item.id === geneId);
  showModal({
    kicker: "Biblioteca del ADN",
    title: gene.title,
    body: `<p>${gene.text}</p><p><strong>En terminos sencillos:</strong> ${gene.simple}</p>`,
    actions: [
      { label: "ACTIVAR", className: "primary", action: () => regulateGene(gene, "active") },
      { label: "SILENCIAR", className: "secondary", action: () => regulateGene(gene, "silenced") }
    ]
  });
}

function regulateGene(gene, mode) {
  state.geneState[gene.id] = mode;
  applyEffect(mode === "active" ? gene.activate : gene.silence);
  if (mode === "silenced") state.regulationDetected += 1;
  state.unlocked.epigenetics = true;
  closeModal();
  renderLibrary();
}

function tryRepairDialogue() {
  state.unlocked.repair = true;
  showModal({
    kicker: "Don ReparADN",
    title: "¡¿PERO QUE LE PASO A ESTE ADN?!",
    body: `<p><strong>Sistema de vias de reparacion del ADN.</strong></p><p>Las celulas poseen diferentes mecanismos para detectar y reparar determinados tipos de dano en el ADN. Algunos danos pueden corregirse; otros requieren respuestas especificas o detener procesos celulares.</p><p>¡A reparar se ha dicho!</p>`,
    actions: [
      { label: "Ir al minijuego", className: "primary", action: () => { closeModal(); state.screen = "repair"; render(); } },
      { label: "Cerrar", className: "secondary", action: closeModal }
    ]
  });
  saveState();
}

function completeRepair() {
  state.damageRepaired += 1;
  state.damageDetected += 1;
  state.integridadADN = clamp(state.integridadADN + 12);
  state.reparacionADN = clamp(state.reparacionADN + 10);
  state.estresCelular = clamp(state.estresCelular - 6);
  state.repairSolved = false;
  state.repairTarget = Math.floor(Math.random() * 8);
  showModal({
    kicker: "Reparacion completada",
    title: "Dano, deteccion, reparacion, recuperacion",
    body: `<p>Reparacion completada. Este resultado representa que la celula activo una respuesta de mantenimiento del ADN.</p><p>¡La proxima vez cuidalo mejor, eh!</p>`,
    actions: [{ label: "Volver al panel", className: "primary", action: () => { closeModal(); state.screen = "main"; render(); } }]
  });
}

function answerDetective(index) {
  const round = state.detectiveRound;
  if (!round) return;
  const correct = Number(index) === round.index;
  if (correct) {
    state.mutationsDetected += 1;
    state.detectiveRound.answered = true;
    showModal({
      kicker: "Cambio encontrado",
      title: "Posicion: " + (round.index + 1),
      body: `<p><strong>Original:</strong> ${round.original[round.index]}<br><strong>Nueva:</strong> ${round.changed[round.index]}</p><p>Una mutacion es un cambio en la secuencia del ADN. Las mutaciones no implican automaticamente cancer. Sus efectos dependen de factores como donde ocurre el cambio, que funcion tiene la region afectada y otros procesos celulares.</p>`,
      actions: [{ label: "Nuevo ejemplo", className: "primary", action: () => { closeModal(); newDetectiveRound(); renderDetective(); } }]
    });
  } else {
    state.estresCelular = clamp(state.estresCelular + 2);
    showModal({
      kicker: "Pista del detective",
      title: "Ese sitio coincide",
      body: `<p>Compara letra por letra. El cambio esta en una posicion donde la secuencia nueva ya no coincide con la original.</p>`,
      actions: [{ label: "Seguir buscando", className: "secondary", action: closeModal }]
    });
  }
  saveState();
}

game.addEventListener("click", event => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const currentEvent = events[state.currentEvent % events.length];

  if (action === "start") {
    state = defaultState();
    state.screen = "case";
    render();
  }
  if (action === "how") {
    showModal({
      kicker: "Como se juega",
      title: "Tu mision",
      body: `<p>Tu mision es cuidar una celula y mantener sus procesos celulares funcionando correctamente. Explora su ADN, regula genes, detecta danos y descubre como funcionan los mecanismos de reparacion.</p>`,
      actions: [{ label: "Listo", className: "primary", action: closeModal }]
    });
  }
  if (action === "accept") {
    state.unlocked.library = true;
    state.screen = "main";
    render();
  }
  if (action === "main") {
    state.screen = "main";
    render();
  }
  if (action === "next-event") {
    state.screen = "event";
    render();
  }
  if (action === "observe") showScienceCapsule(currentEvent);
  if (action === "try-repair") tryRepairDialogue();
  if (action === "continue-event") continueEvent();
  if (action === "library") {
    state.screen = "library";
    render();
  }
  if (action === "book") showBook(target.dataset.gene);
  if (action === "epigenetics") renderEpigeneticsModal();
  if (action === "repair") {
    state.screen = "repair";
    render();
  }
  if (action === "repair-node") {
    state.repairSolved = Number(target.dataset.index) === state.repairTarget;
    if (!state.repairSolved) {
      state.estresCelular = clamp(state.estresCelular + 3);
      showModal({
        kicker: "El dano permanece",
        title: "Segmento incorrecto",
        body: `<p>Algunos tipos de dano requieren mecanismos especificos. Busca el segmento marcado como afectado antes de activar la reparacion.</p>`,
        actions: [{ label: "Revisar de nuevo", className: "secondary", action: closeModal }]
      });
    } else {
      completeRepair();
    }
  }
  if (action === "repair-hint") {
    showModal({
      kicker: "Pista de reparacion",
      title: "Busca el signo de dano",
      body: `<p>Haz clic directamente sobre el segmento marcado con <strong>!</strong>. Ese clic representa detectar el dano y activar la reparacion en este minijuego.</p>`,
      actions: [{ label: "Entendido", className: "secondary", action: closeModal }]
    });
  }
  if (action === "detective") {
    state.screen = "detective";
    render();
  }
  if (action === "detect-base") answerDetective(target.dataset.index);
  if (action === "new-round") {
    newDetectiveRound();
    renderDetective();
  }
  if (action === "finish") {
    state.screen = "report";
    render();
  }
  if (action === "reset") {
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    render();
  }
});

document.querySelector(".close-modal").addEventListener("click", closeModal);
modal.addEventListener("click", event => {
  if (event.target === modal) closeModal();
});

render();
