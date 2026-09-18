// ==========================================
// LOGICA DI GIOCO & MOTORE DI UNDO (ANNULLA)
// ==========================================

// Chiave LocalStorage
const LOCAL_STORAGE_KEY = 'gatevolley_scout_state';

// Variabili di Stato Globali
let scoreNoi = 0;
let scoreLoro = 0;
let currentSet = 1;
let serviceOwner = "Noi"; // Chi serve per primo
let currentRotation = ["Schiacciatore 1", "Centrale 1", "Opposto", "Schiacciatore 2", "Centrale 2", "Palleggiatore"]; // Posizioni da P1 a P6
let actionsLog = []; // Archivio delle azioni registrate per il file CSV

// Variabile per memorizzare lo stato precedente
let previousState = null;

// Variabile temporanea per l'azione corrente in fase di inserimento
let activeAction = null;

/**
 * Cattura e memorizza lo stato attuale prima di applicare qualsiasi modifica.
 * Questo permette di abilitare la funzione "Undo" (1 livello).
 */
function savePreviousState() {
    previousState = {
        scoreNoi: scoreNoi,
        scoreLoro: scoreLoro,
        currentSet: currentSet,
        serviceOwner: serviceOwner,
        currentRotation: [...currentRotation],
        actionsLog: JSON.parse(JSON.stringify(actionsLog))
    };
    updateUndoButtonState();
}

/**
 * Ripristina l'applicazione allo stato catturato prima dell'ultima azione.
 */
function undoLastAction() {
    if (!previousState) {
        alert("Nessuna azione da annullare!");
        return;
    }

    // Ripristiniamo i valori di gioco dallo stato catturato
    scoreNoi = previousState.scoreNoi;
    scoreLoro = previousState.scoreLoro;
    currentSet = previousState.currentSet;
    serviceOwner = previousState.serviceOwner;
    currentRotation = [...previousState.currentRotation];
    actionsLog = JSON.parse(JSON.stringify(previousState.actionsLog));

    // Consumiamo lo stato precedente
    previousState = null;

    // Nascondiamo l'eventuale pannello di inserimento se era aperto
    document.getElementById('action-panel').style.display = 'none';
    activeAction = null;

    // Aggiorniamo l'interfaccia e salviamo nel browser
    updateScoreboardDisplay();
    renderPlayersOnCourt();
    updateUndoButtonState();
    saveToLocalStorage();

    console.log("Azione annullata con successo.");
}

/**
 * Aggiorna lo stato visivo (abilitato/disabilitato) del pulsante Undo
 */
function updateUndoButtonState() {
    const undoBtn = document.getElementById('btn-undo');
    if (undoBtn) {
        if (previousState) {
            undoBtn.removeAttribute('disabled');
            undoBtn.style.opacity = '1';
        } else {
            undoBtn.setAttribute('disabled', 'true');
            undoBtn.style.opacity = '0.5';
        }
    }
}
// ==========================================
// AUTOSAVE (LOCALSTORAGE), ROTAZIONI E CSV
// ==========================================

/**
 * Salva i dati correnti nel LocalStorage del browser.
 */
function saveToLocalStorage() {
    const stateToSave = {
        scoreNoi: scoreNoi,
        scoreLoro: scoreLoro,
        currentSet: currentSet,
        serviceOwner: serviceOwner,
        currentRotation: currentRotation,
        actionsLog: actionsLog
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
}

/**
 * Carica in automatico i dati salvati all'avvio dell'applicazione.
 */
function loadFromLocalStorage() {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!savedData) return;

    try {
        const loadedState = JSON.parse(savedData);
        scoreNoi = loadedState.scoreNoi;
        scoreLoro = loadedState.scoreLoro;
        currentSet = loadedState.currentSet;
        serviceOwner = loadedState.serviceOwner;
        currentRotation = loadedState.currentRotation;
        actionsLog = loadedState.actionsLog;

        updateScoreboardDisplay();
        renderPlayersOnCourt();
        console.log("Stato di gioco ripristinato automaticamente dall'autosave.");
    } catch (e) {
        console.error("Impossibile caricare i dati di gioco salvati:", e);
    }
}

/**
 * Resetta l'applicazione cancellando i dati in memoria per iniziare una nuova partita.
 */
function startNewMatch() {
    if (confirm("Attenzione: vuoi davvero cancellare i dati attuali e iniziare una nuova partita?")) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        window.location.reload();
    }
}

/**
 * Modifica il punteggio e gestisce la logica di cambio palla / servizio / rotazione.
 */
function changeScore(team, offset) {
    savePreviousState(); // Permette l'undo di questa modifica

    if (team === 'noi') {
        scoreNoi = Math.max(0, scoreNoi + offset);
        if (offset > 0 && serviceOwner !== "Noi") {
            serviceOwner = "Noi";
            rotateTeam(); // Rotazione automatica al cambio palla guadagnato
        }
    } else {
        scoreLoro = Math.max(0, scoreLoro + offset);
        if (offset > 0 && serviceOwner !== "Loro") {
            serviceOwner = "Loro";
        }
    }

    updateScoreboardDisplay();
    saveToLocalStorage();
}

/**
 * Ruota le posizioni dei giocatori in senso orario.
 */
function rotateTeam() {
    // Rotazione standard pallavolo dell'array a 6 elementi (da P1 a P6)
    const lastPlayer = currentRotation.pop();
    currentRotation.unshift(lastPlayer);
    renderPlayersOnCourt();
}

/**
 * Ridisegna le informazioni sul tabellone
 */
function updateScoreboardDisplay() {
    document.getElementById('val-score-noi').innerText = scoreNoi;
    document.getElementById('val-score-loro').innerText = scoreLoro;
    document.getElementById('display-current-set').innerText = currentSet;
    document.getElementById('service-indicator').innerText = "Servizio: " + serviceOwner;
}

/**
 * Ridisegna i nomi dei giocatori sul campo grafico
 */
function renderPlayersOnCourt() {
    document.getElementById('p-1').innerText = currentRotation[0];
    document.getElementById('p-2').innerText = currentRotation[1];
    document.getElementById('p-3').innerText = currentRotation[2];
    document.getElementById('p-4').innerText = currentRotation[3];
    document.getElementById('p-5').innerText = currentRotation[4];
    document.getElementById('p-6').innerText = currentRotation[5];
}

/**
 * Gestisce la selezione di una zona del campo per avviare la compilazione di un'azione.
 */
function selectZone(zone) {
    savePreviousState(); // Salva lo stato prima di iniziare la nuova azione di scouting

    // Determiniamo il giocatore in quella zona (l'indice corrisponde alla posizione)
    // Le posizioni 1-6 corrispondono agli indici 0-5 dell'array di rotazione
    const player = currentRotation[zone - 1];

    activeAction = {
        idPartita: "Match_" + new Date().toLocaleDateString().replace(/\//g, "-"),
        idSet: currentSet,
        rallyID: actionsLog.length + 1,
        orario: new Date().toLocaleTimeString(),
        punteggioNoi: scoreNoi,
        punteggioLoro: scoreLoro,
        servizioA: serviceOwner,
        giocatore: player,
        posizione: "P" + zone,
        fondamentale: "",
        voto: ""
    };

    document.getElementById('action-panel-title').innerText = "Azione per: " + player + " (" + activeAction.posizione + ")";
    document.getElementById('action-panel').style.display = 'block';
}

function setFundamental(fundamental) {
    if (!activeAction) return;
    activeAction.fondamentale = fundamental;
}

function setVote(vote) {
    if (!activeAction || !activeAction.fondamentale) {
        alert("Seleziona prima un fondamentale!");
        return;
    }
    activeAction.voto = vote;

    // Aggiungiamo l'azione al log principale
    actionsLog.push(activeAction);
    
    // Nascondiamo il pannello e puliamo l'azione temporanea
    document.getElementById('action-panel').style.display = 'none';
    activeAction = null;

    // Aggiorniamo il database locale e l'UI
    saveToLocalStorage();
    updateUndoButtonState();
    console.log("Azione salvata nel log.");
}

/**
 * Esporta tutte le statistiche accumulate in un file CSV scaricabile.
 */
function exportToCSV() {
    if (actionsLog.length === 0) {
        alert("Nessun dato da esportare!");
        return;
    }

    const headers = ["ID_Partita", "ID_Set", "RallyID", "Orario", "PunteggioNoi", "PunteggioLoro", "ServizioA", "Giocatore", "Posizione", "Fondamentale", "Voto"];
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";

    actionsLog.forEach(action => {
        const row = [
            action.idPartita,
            action.idSet,
            action.rallyID,
            action.orario,
            action.punteggioNoi,
            action.punteggioLoro,
            action.servizioA,
            action.giocatore,
            action.posizione,
            action.fondamentale,
            action.voto
        ];
        csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Scout_Set_${currentSet}_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Funzione di avvio sessione
function startMatchSession() {
    const noi = document.getElementById('team-noi').value;
    const loro = document.getElementById('team-loro').value;
    document.getElementById('display-team-noi').innerText = noi;
    document.getElementById('display-team-loro').innerText = loro;
    saveToLocalStorage();
}

// Inizializzazione automatica all'avvio della pagina
window.onload = function() {
    loadFromLocalStorage();
};
