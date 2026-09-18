// ==========================================================================
// GATEVOLLEY SCOUT - APP.JS (PARTE 1 DI 2)
// LOGICA DI STATO, GESTIONE DEL SETUP, UNDO E AUTOSAVE
// ==========================================================================

// Chiave utilizzata per salvare lo stato nel LocalStorage del browser
const LOCAL_STORAGE_KEY = 'gatevolley_match_state_save';

// VARIABILI DI GIOCO GLOBALI (STRUTTURA ORIGINALE PRESERVATA AL 100%)
let matchID = "GARA_01";
let teamNameHome = "Noi";
let teamNameAway = "Loro";

let scores = { home: 0, away: 0 };
let sets = { home: 0, away: 0 };
let currentSet = 1;

let rallyCounter = 1;
let currentService = "home"; // 'home' o 'away'

// Formazione: mappatura della posizione (chiave 1..6) al numero di maglia (valore)
let formation = { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };

// Record accumulati per l'esportazione in CSV
let matchHistory = [];

// Variabili per la gestione dell'azione selezionata correntemente
let currentData = {
    player: null,
    position: null,
    skillCode: null,
    skillName: null
};

// STRUTTURA PER LA FUNZIONE "UNDO" (ANNULLA ULTIMA AZIONE)
let previousState = null;

/**
 * Cattura lo stato corrente completo prima di qualsiasi modifica.
 * Questa funzione rende possibile la funzione "Annulla Ultima Azione".
 */
function capturePreviousState() {
    previousState = {
        scores: JSON.parse(JSON.stringify(scores)),
        sets: JSON.parse(JSON.stringify(sets)),
        currentSet: currentSet,
        rallyCounter: rallyCounter,
        currentService: currentService,
        formation: JSON.parse(JSON.stringify(formation)),
        matchHistory: JSON.parse(JSON.stringify(matchHistory))
    };
    updateUndoButtonState();
}

/**
 * Ripristina il sistema allo stato immediatamente precedente l'ultimo inserimento.
 */
function undoLastAction() {
    if (!previousState) {
        alert("Nessuna azione da annullare!");
        return;
    }

    // Ripristino delle variabili di gioco
    scores = previousState.scores;
    sets = previousState.sets;
    currentSet = currentSet; // Manteniamo coerente il set
    rallyCounter = previousState.rallyCounter;
    currentService = previousState.currentService;
    formation = previousState.formation;
    matchHistory = JSON.parse(JSON.stringify(previousState.matchHistory));

    // Consumiamo lo stato precedente
    previousState = null;

    // Deselezioniamo eventuali tasti attivi
    document.querySelectorAll('.position-btn, .btn-skill').forEach(btn => btn.classList.remove('selected'));
    currentData = { player: null, position: null, skillCode: null, skillName: null };

    // Aggiorniamo l'interfaccia utente
    updateCourtDisplay();
    updateLog();
    updateRallyDisplay();
    updateUndoButtonState();

    // Aggiorniamo il tabellone
    document.getElementById('score-home').innerText = scores.home;
    document.getElementById('score-away').innerText = scores.away;
    document.getElementById('sets-home').innerText = sets.home;
    document.getElementById('sets-away').innerText = sets.away;
    document.getElementById('current-set-display').innerText = currentSet;

    // Salviamo il nuovo stato ripristinato nell'Autosave
    saveStateToLocalStorage();
    console.log("Ultima azione annullata con successo.");
}

/**
 * Attiva o disattiva il pulsante Undo sul DOM
 */
function updateUndoButtonState() {
    const undoBtn = document.getElementById('undo-btn');
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

/**
 * Salva i dati di gioco nel LocalStorage del browser.
 */
function saveStateToLocalStorage() {
    const gameState = {
        matchID,
        teamNameHome,
        teamNameAway,
        scores,
        sets,
        currentSet,
        rallyCounter,
        currentService,
        formation,
        matchHistory,
        // Memorizza se l'utente era già all'interno del pannello di gioco
        isGameStarted: document.getElementById('scout-game-panel').style.display === 'block'
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(gameState));
}

/**
 * Carica in automatico la sessione di gioco precedentemente salvata.
 */
function loadStateFromLocalStorage() {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!savedState) return;

    try {
        const gameState = JSON.parse(savedState);

        if (gameState.isGameStarted) {
            matchID = gameState.matchID;
            teamNameHome = gameState.teamNameHome;
            teamNameAway = gameState.teamNameAway;
            scores = gameState.scores;
            sets = gameState.sets;
            currentSet = gameState.currentSet;
            rallyCounter = gameState.rallyCounter;
            currentService = gameState.currentService;
            formation = gameState.formation;
            matchHistory = gameState.matchHistory;

            // Ripristino Elementi DOM
            document.getElementById('display-match-id').innerText = matchID;
            document.getElementById('display-name-home').innerText = teamNameHome;
            document.getElementById('display-name-away').innerText = teamNameAway;
            document.getElementById('score-home').innerText = scores.home;
            document.getElementById('score-away').innerText = scores.away;
            document.getElementById('sets-home').innerText = sets.home;
            document.getElementById('sets-away').innerText = sets.away;
            document.getElementById('current-set-display').innerText = currentSet;

            // Mostra la schermata di gioco
            document.getElementById('setup-panel').style.display = 'none';
            document.getElementById('scout-game-panel').style.display = 'block';

            updateCourtDisplay();
            updateLog();
            updateRallyDisplay();
            console.log("Sessione ripristinata con successo dall'autosave.");
        }
    } catch (e) {
        console.error("Errore nel caricamento del match salvato:", e);
    }
}

/**
 * Pulisce il LocalStorage e resetta l'applicazione per una nuova partita.
 */
function startNewMatch() {
    if (confirm("Sei sicuro di voler iniziare una nuova partita? Tutti i dati correnti andranno persi.")) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        window.location.reload();
    }
}
// ==========================================================================
// GATEVOLLEY SCOUT - APP.JS (PARTE 2 DI 2)
// GESTIONE CAMPO, ROTAZIONI, AZIONI DI GIOCO LIVE ED ESPORTAZIONE CSV
// ==========================================================================

/**
 * Gestisce la configurazione iniziale e l'avvio del pannello di gioco.
 */
function confirmFormation() {
    const inputMatch = document.getElementById('input-match-id').value.trim();
    const inputHome = document.getElementById('input-team-home').value.trim();
    const inputAway = document.getElementById('input-team-away').value.trim();

    if (inputMatch) matchID = inputMatch;
    if (inputHome) teamNameHome = inputHome;
    if (inputAway) teamNameAway = inputAway;

    // Recupera i numeri di maglia dei giocatori per le 6 posizioni
    for (let p = 1; p <= 6; p++) {
        let val = document.getElementById('input-p' + p).value;
        if (!val) {
            alert("⚠️ Compila tutte le posizioni dei giocatori prima di iniziare!");
            return;
        }
        formation[p] = parseInt(val, 10);
    }

    const serviceRadio = document.querySelector('input[name="first-service"]:checked');
    currentService = serviceRadio ? serviceRadio.value : 'home';

    // Inserisce i nomi e dettagli nel DOM
    document.getElementById('display-match-id').innerText = matchID;
    document.getElementById('display-name-home').innerText = teamNameHome;
    document.getElementById('display-name-away').innerText = teamNameAway;

    // Passa alla schermata di gioco live
    document.getElementById('setup-panel').style.display = 'none';
    document.getElementById('scout-game-panel').style.display = 'block';

    updateCourtDisplay();
    updateRallyDisplay();
    
    // Salva lo stato iniziale del match
    saveStateToLocalStorage();
}

/**
 * Gestisce la selezione di un giocatore/posizione sul campo grafico.
 */
function selectPosition(posNum) {
    document.querySelectorAll('.position-btn').forEach(btn => btn.classList.remove('selected'));
    
    const playerNum = formation[posNum];
    currentData.player = playerNum;
    currentData.position = posNum;

    // Evidenzia visivamente il pulsante selezionato
    const activeBtn = document.querySelector('.pos-' + posNum);
    if (activeBtn) {
        activeBtn.classList.add('selected');
    }
}

/**
 * Memorizza il fondamentale selezionato dall'utente.
 */
function selectSkill(skillCode, skillName) {
    document.querySelectorAll('.btn-skill').forEach(btn => btn.classList.remove('selected'));
    
    currentData.skillCode = skillCode;
    currentData.skillName = skillName;

    // Evidenzia il pulsante del fondamentale attivo
    const event = window.event;
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('selected');
    }
}

/**
 * Registra i punti rapidi definiti dai tasti E (Errore Avversario) e P (Punto Avversario).
 */
function addDirectPoint(team, pointType, codeSymbol) {
    // Cattura lo stato precedente per consentire l'Undo
    capturePreviousState();

    // Incrementa il punteggio
    scores[team]++;

    let rotationHappened = false;
    let setFinished = false;

    // Se guadagniamo il punto noi ed era servizio loro, esegue rotazione automatica
    if (team === 'home' && currentService === 'away' && pointType !== 'PUNTO_MANUALE') {
        rotateTeam();
        rotationHappened = true;
    }

    if (pointType !== 'PUNTO_MANUALE') {
        currentService = team;
    }

    // Gestione della fine del set (25 punti o 15 al tie-break)
    let targetPoints = (currentSet === 5) ? 15 : 25;
    if (scores[team] >= targetPoints && Math.abs(scores.home - scores.away) >= 2) {
        alert("🎉 Fine Set " + currentSet + "! Vinto da: " + (team === 'home' ? teamNameHome : teamNameAway));
        sets[team]++;
        currentSet++;
        scores.home = 0;
        scores.away = 0;
        setFinished = true;
    }

    // Registra l'azione immediata nel log storico
    const actionRecord = {
        ID_Partita: matchID,
        ID_Set: "SET_" + (setFinished ? (currentSet - 1) : currentSet),
        RallyID: "R_" + rallyCounter,
        Orario: new Date().toLocaleTimeString(),
        PunteggioNoi: scores.home,
        PunteggioLoro: scores.away,
        ServizioA: currentService === 'home' ? teamNameHome : teamNameAway,
        RotazioneEseguita: rotationHappened ? 'SI' : 'NO',
        Giocatore: 0,
        Posizione: "N/D",
        Fondamentale: pointType,
        Voto: codeSymbol,
        DettaglioVoto: codeSymbol + " (" + pointType + ")"
    };

    matchHistory.push(actionRecord);
    updateLog();

    rallyCounter++;

    // Aggiorna l'interfaccia utente
    document.getElementById('score-home').innerText = scores.home;
    document.getElementById('score-away').innerText = scores.away;
    document.getElementById('sets-home').innerText = sets.home;
    document.getElementById('sets-away').innerText = sets.away;
    document.getElementById('current-set-display').innerText = currentSet;

    updateCourtDisplay();
    updateRallyDisplay();
    
    // Salva l'avanzamento nel browser
    saveStateToLocalStorage();
}

/**
 * Registra il voto finale completando la tracciatura dell'azione sul giocatore.
 */
function pressVote(voteSymbol) {
    if (!currentData.position || !currentData.skillCode) {
        alert("⚠️ Seleziona prima il Giocatore sul campo e il Fondamentale!");
        return;
    }

    // Cattura lo stato precedente per consentire l'Undo
    capturePreviousState();

    let isTerminalAction = false;
    let pointTo = null;

    // Logica di assegnazione dei punti in base a Fondamentale e Voto
    if (currentData.skillCode === 'R') {
        if (voteSymbol === '=') { isTerminalAction = true; pointTo = 'away'; }
    } else if (currentData.skillCode === 'A') {
        if (voteSymbol === '#') { isTerminalAction = true; pointTo = 'home'; }
        else if (voteSymbol === '=') { isTerminalAction = true; pointTo = 'away'; }
    } else if (currentData.skillCode === 'S') {
        if (voteSymbol === '#') { isTerminalAction = true; pointTo = 'home'; }
        else if (voteSymbol === '=') { isTerminalAction = true; pointTo = 'away'; }
    } else if (currentData.skillCode === 'B') {
        if (voteSymbol === '#') { isTerminalAction = true; pointTo = 'home'; }
        else if (voteSymbol === '=') { isTerminalAction = true; pointTo = 'away'; }
    }

    let rotationHappened = false;
    let setFinished = false;

    if (isTerminalAction && pointTo) {
        scores[pointTo]++;

        if (pointTo === 'home' && currentService === 'away') {
            rotateTeam();
            rotationHappened = true;
        }
        
        currentService = pointTo;

        let targetPoints = (currentSet === 5) ? 15 : 25;
        if (scores[pointTo] >= targetPoints && Math.abs(scores.home - scores.away) >= 2) {
            alert("🎉 Fine Set " + currentSet + "! Vinto da: " + (pointTo === 'home' ? teamNameHome : teamNameAway));
            sets[pointTo]++;
            currentSet++;
            scores.home = 0;
            scores.away = 0;
            setFinished = true;
        }
    }

    let voteText = voteSymbol;
    if (currentData.skillCode === 'R' && voteSymbol === '#') voteText = "## Perfetta";
    if (currentData.skillCode === 'A' && voteSymbol === '#') voteText = "# Vincente";
    if (voteSymbol === '=') voteText = "= Errore";

    // Salvataggio record dettagliato nel match history
    const actionRecord = {
        ID_Partita: matchID,
        ID_Set: "SET_" + (setFinished ? (currentSet - 1) : currentSet),
        RallyID: "R_" + rallyCounter,
        Orario: new Date().toLocaleTimeString(),
        PunteggioNoi: scores.home,
        PunteggioLoro: scores.away,
        ServizioA: currentService === 'home' ? teamNameHome : teamNameAway,
        RotazioneEseguita: rotationHappened ? 'SI' : 'NO',
        Giocatore: currentData.player,
        Posizione: 'P' + currentData.position,
        Fondamentale: currentData.skillName,
        Voto: voteSymbol,
        DettaglioVoto: voteText
    };

    matchHistory.push(actionRecord);
    updateLog();

    if (isTerminalAction) {
        rallyCounter++;
    }

    // Aggiornamento DOM punteggi
    document.getElementById('score-home').innerText = scores.home;
    document.getElementById('score-away').innerText = scores.away;
    document.getElementById('sets-home').innerText = sets.home;
    document.getElementById('sets-away').innerText = sets.away;
    document.getElementById('current-set-display').innerText = currentSet;
    
    updateCourtDisplay();
    updateRallyDisplay();

    // Rimuove la selezione dai pulsanti grafici
    document.querySelectorAll('.position-btn, .btn-skill').forEach(btn => btn.classList.remove('selected'));
    currentData = { player: null, position: null, skillCode: null, skillName: null };
    
    // Salva l'aggiornamento nel browser
    saveStateToLocalStorage();
}

/**
 * Esegue la rotazione standard di pallavolo: P1 -> P6 -> P5 -> P4 -> P3 -> P2 -> P1.
 */
function rotateTeam() {
    let newFormation = { ...formation };
    newFormation[6] = formation[1];
    newFormation[5] = formation[6];
    newFormation[4] = formation[5];
    newFormation[3] = formation[4];
    newFormation[2] = formation[3];
    newFormation[1] = formation[2];
    formation = newFormation;
}

/**
 * Aggiorna i testi e i numeri visibili sul campo grafico.
 */
function updateCourtDisplay() {
    for (let p = 1; p <= 6; p++) {
        document.getElementById('court-p' + p).innerText = formation[p] || '-';
    }
}

/**
 * Visualizza le informazioni del Rally e del Servizio corrente.
 */
function updateRallyDisplay() {
    const serviceName = currentService === 'home' ? teamNameHome : teamNameAway;
    document.getElementById('rally-info-display').innerText = `Rally: R_${rallyCounter} | Servizio: ${serviceName}`;
}

/**
 * Ridisegna l'elenco visivo della cronologia delle ultime azioni.
 */
function updateLog() {
    const logContainer = document.getElementById('log-container');
    if (!logContainer) return;

    if (matchHistory.length === 0) {
        logContainer.innerHTML = '<div style="color: #7f8c8d; font-style: italic;">Nessuna azione registrata.</div>';
        return;
    }

    let html = '';
    // Mostra la lista invertita per visualizzare l'ultima azione registrata in alto
    for (let i = matchHistory.length - 1; i >= 0; i--) {
        const item = matchHistory[i];
        let detail = "";
        if (item.Giocatore === 0) {
            detail = `<strong>${item.Fondamentale}</strong> -> Punto a ${item.ServizioA}`;
        } else {
            detail = `P${item.Posizione.replace('P', '')} (N°${item.Giocatore}) - <strong>${item.Fondamentale}</strong>: ${item.DettaglioVoto}`;
        }
        html += `<div class="log-item">[${item.Orario}] ${detail} (${item.PunteggioNoi}-${item.PunteggioLoro})</div>`;
    }
    logContainer.innerHTML = html;
}

/**
 * Esporta tutti i dati in formato CSV e avvia il download del file.
 */
function exportCSV() {
    if (matchHistory.length === 0) {
        alert("⚠️ Nessun dato presente da esportare!");
        return;
    }

    const headers = ["ID_Partita", "ID_Set", "RallyID", "Orario", "PunteggioNoi", "PunteggioLoro", "ServizioA", "RotazioneEseguita", "Giocatore", "Posizione", "Fondamentale", "Voto", "DettaglioVoto"];
    let csvRows = [headers.join(",")];

    matchHistory.forEach(item => {
        const values = [
            `"${item.ID_Partita}"`,
            `"${item.ID_Set}"`,
            `"${item.RallyID}"`,
            `"${item.Orario}"`,
            item.PunteggioNoi,
            item.PunteggioLoro,
            `"${item.ServizioA}"`,
            `"${item.RotazioneEseguita}"`,
            item.Giocatore,
            `"${item.Posizione}"`,
            `"${item.Fondamentale}"`,
            `"${item.Voto}"`,
            `"${item.DettaglioVoto}"`
        ];
        csvRows.push(values.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `scout_${matchID}_set_${currentSet}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Avvia automaticamente il caricamento dello stato precedente all'avvio della pagina
window.addEventListener('load', loadStateFromLocalStorage);
