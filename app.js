// ==========================================================================
// GATEVOLLEY SCOUT - APP.JS (PARTE 1 DI 2)
// Stato, Setup, Logiche Undo e Autosave
// ==========================================================================

// --- NUOVE VARIABILI PER UNDO E AUTOSAVE ---
const LOCAL_STORAGE_KEY = 'gatevolley_scout_state';
let previousState = null; // Contenitore per lo stato precedente (permette 1 livello di UNDO)

// --- VARIABILI ORIGINALI DEL TUO SCRIPT ---
let formation = { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
let scores = { home: 0, away: 0 };
let sets = { home: 0, away: 0 };
let currentSet = 1;
let matchID = "GARA_01";
let teamNameHome = "GateVolley";
let teamNameAway = "AVVERSARI";
let rallyCounter = 1;
let currentService = 'home';
let currentData = { player: null, position: null, skillCode: null, skillName: null };
let matchHistory = [];

// --- NUOVE FUNZIONI DI GESTIONE STATO (UNDO / AUTOSAVE) ---

/**
 * Cattura lo stato corrente completo del match in una variabile temporanea.
 * Va chiamato PRIMA di modificare qualsiasi dato.
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
    // Abilita il pulsante "Annulla"
    const undoBtn = document.getElementById('undo-btn');
    undoBtn.removeAttribute('disabled');
    undoBtn.style.opacity = '1';
}

/**
 * Ripristina l'intero stato del gioco a quello catturato prima dell'ultima azione.
 */
function undoLastAction() {
    if (!previousState) {
        alert("Nessuna azione da annullare.");
        return;
    }

    // Ripristina tutte le variabili globali
    scores = previousState.scores;
    sets = previousState.sets;
    currentSet = previousState.currentSet;
    rallyCounter = previousState.rallyCounter;
    currentService = previousState.currentService;
    formation = previousState.formation;
    matchHistory = previousState.matchHistory;

    // Aggiorna tutta l'interfaccia grafica
    document.getElementById('score-home').innerText = scores.home;
    document.getElementById('score-away').innerText = scores.away;
    document.getElementById('sets-home').innerText = sets.home;
    document.getElementById('sets-away').innerText = sets.away;
    document.getElementById('current-set-display').innerText = currentSet;
    updateCourtDisplay();
    updateLog();
    updateRallyDisplay();
    
    // Resetta e disabilita il pulsante "Annulla"
    previousState = null;
    const undoBtn = document.getElementById('undo-btn');
    undoBtn.setAttribute('disabled', 'true');
    undoBtn.style.opacity = '0.5';

    // Salva nel browser lo stato appena ripristinato
    saveStateToLocalStorage();
    console.log("Azione annullata con successo.");
}

/**
 * Salva lo stato attuale della partita nel LocalStorage del browser.
 */
function saveStateToLocalStorage() {
    const gameState = {
        matchID, teamNameHome, teamNameAway,
        scores, sets, currentSet,
        rallyCounter, currentService, formation,
        matchHistory,
        isGameStarted: document.getElementById('scout-game-panel').style.display === 'block'
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(gameState));
}

/**
 * Cancella i dati salvati e ricarica la pagina per una nuova partita.
 */
function startNewMatch() {
    if (confirm("Sei sicuro di voler iniziare una nuova partita? I dati attuali verranno cancellati.")) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        window.location.reload();
    }
}

/**
 * Carica lo stato della partita dal LocalStorage all'avvio della pagina.
 */
function loadStateFromLocalStorage() {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!savedState) {
        console.log("Nessuna partita salvata trovata.");
        return;
    }

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

        // Aggiorna l'interfaccia con i dati caricati
        document.getElementById('display-match-id').innerText = matchID;
        document.getElementById('display-name-home').innerText = teamNameHome;
        document.getElementById('display-name-away').innerText = teamNameAway;
        document.getElementById('score-home').innerText = scores.home;
        document.getElementById('score-away').innerText = scores.away;
        document.getElementById('sets-home').innerText = sets.home;
        document.getElementById('sets-away').innerText = sets.away;
        document.getElementById('current-set-display').innerText = currentSet;
        
        document.getElementById('setup-panel').style.display = 'none';
        document.getElementById('scout-game-panel').style.display = 'block';

        updateCourtDisplay();
        updateLog();
        updateRallyDisplay();
        console.log("Partita precedente caricata con successo.");
    }
}

// Aggiungi questa riga per ESEGUIRE la funzione di caricamento all'avvio
window.addEventListener('load', loadStateFromLocalStorage);


// --- TUE FUNZIONI ORIGINALI (CON INTEGRAZIONE SAVE) ---

// Inizia la partita (Set 1) salvando anagrafica gara, formazione e primo possesso palla
function confirmFormation() {
    const inputMatch = document.getElementById('input-match-id').value.trim();
    const inputHome = document.getElementById('input-team-home').value.trim();
    const inputAway = document.getElementById('input-team-away').value.trim();

    if (inputMatch) matchID = inputMatch;
    if (inputHome) teamNameHome = inputHome;
 
// ==========================================================================
// GATEVOLLEY SCOUT - APP.JS (PARTE 2 DI 2)
// Logiche di Gioco, Interfaccia e Esportazione
// ==========================================================================

function updateCourtDisplay() {
    for (let p = 1; p <= 6; p++) {
        const btn = document.getElementById('court-p' + p);
        document.getElementById('num-p' + p).innerText = formation[p];
        btn.classList.remove('server-highlight');
    }

    if (currentService === 'home') {
        document.getElementById('ball-home').classList.add('has-service');
        document.getElementById('ball-away').classList.remove('has-service');
        document.getElementById('court-p1').classList.add('server-highlight');
    } else {
        document.getElementById('ball-away').classList.add('has-service');
        document.getElementById('ball-home').classList.remove('has-service');
    }
}

function rotateTeam() {
    let t1 = formation[1];
    let t2 = formation[2];
    let t3 = formation[3];
    let t4 = formation[4];
    let t5 = formation[5];
    let t6 = formation[6];

    formation[1] = t2;
    formation[2] = t3;
    formation[3] = t4;
    formation[4] = t5;
    formation[5] = t6;
    formation[6] = t1;
}

function selectCourtPosition(posNumber) {
    document.querySelectorAll('.position-btn').forEach(btn => btn.classList.remove('selected'));
    currentData.position = posNumber;
    currentData.player = formation[posNumber];
    document.getElementById('court-p' + posNumber).classList.add('selected');
}

function selectSkill(code, name) {
    document.querySelectorAll('.btn-skill').forEach(btn => btn.classList.remove('selected'));
    currentData.skillCode = code;
    currentData.skillName = name;
    document.getElementById('skill-' + code).classList.add('selected');

    // La tua logica originale per cambiare le etichette dei voti
    if (code === 'R') {
        document.getElementById('vbtn-1').innerText = "## (Perfetta)";
        document.getElementById('vbtn-2').innerText = "+ (Positiva)";
        document.getElementById('vbtn-3').innerText = "! (Staccata)";
        document.getElementById('vbtn-4').innerText = "- (Negativa)";
        document.getElementById('vbtn-5').innerText = "= (Errore Loro)";
    } else if (code === 'A') {
        document.getElementById('vbtn-1').innerText = "# (Punto Noi)";
        document.getElementById('vbtn-2').innerText = "+ (Positivo)";
        document.getElementById('vbtn-3').innerText = "! (Difeso)";
        document.getElementById('vbtn-4').innerText = "- (Contrattacco)";
        document.getElementById('vbtn-5').innerText = "= (Errore Fuori)";
    } else {
        document.getElementById('vbtn-1').innerText = "#";
        document.getElementById('vbtn-2').innerText = "+";
        document.getElementById('vbtn-3').innerText = "!";
        document.getElementById('vbtn-4').innerText = "-";
        document.getElementById('vbtn-5').innerText = "=";
    }
}

// Funzione MODIFICATA per integrare UNDO e AUTOSAVE
function pressVote(voteSymbol) {
    if (!currentData.position || !currentData.skillCode) {
        alert("⚠️ Seleziona prima il Giocatore sul campo e il Fondamentale!");
        return;
    }

    // NUOVA AGGIUNTA: Cattura lo stato PRIMA di fare qualsiasi modifica
    capturePreviousState();

    let isTerminalAction = false;
    let pointTo = null;

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

    document.getElementById('score-home').innerText = scores.home;
    document.getElementById('score-away').innerText = scores.away;
    document.getElementById('sets-home').innerText = sets.home;
    document.getElementById('sets-away').innerText = sets.away;
    document.getElementById('current-set-display').innerText = currentSet;
    
    if (setFinished) {
        openNextSetPanel();
    } else {
        updateCourtDisplay();
        updateRallyDisplay();
    }

    document.querySelectorAll('.position-btn, .btn-skill').forEach(btn => btn.classList.remove('selected'));
    currentData = { player: null, position: null, skillCode: null, skillName: null };
    
    // NUOVA AGGIUNTA: Salva lo stato dopo l'azione
    saveStateToLocalStorage();
}

// Funzione MODIFICATA per integrare UNDO e AUTOSAVE
function addDirectPoint(team, pointType, codeSymbol) {
    // NUOVA AGGIUNTA: Cattura lo stato PRIMA di fare qualsiasi modifica
    capturePreviousState();

    scores[team]++;
    
    let rotationHappened = false;
    let setFinished = false;

    if (team === 'home' && currentService === 'away' && pointType !== 'PUNTO_MANUALE') {
        rotateTeam();
        rotationHappened = true;
    }
    
    if (pointType !== 'PUNTO_MANUALE') {
        currentService = team;
    }

    let targetPoints = (currentSet === 5) ? 15 : 25;
    if (scores[team] >= targetPoints && Math.abs(scores.home - scores.away) >= 2) {
        alert("🎉 Fine Set " + currentSet + "! Vinto da: " + (team === 'home' ? teamNameHome : teamNameAway));
        sets[team]++;
        currentSet++;
        scores.home = 0;
        scores.away = 0;
        setFinished = true;
    }

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

    document.getElementById('score-home').innerText = scores.home;
    document.getElementById('score-away').innerText = scores.away;
    document.getElementById('sets-home').innerText = sets.home;
    document.getElementById('sets-away').innerText = sets.away;
    document.getElementById('current-set-display').innerText = currentSet;
    
    if (setFinished) {
        openNextSetPanel();
    } else {
        updateCourtDisplay();
        updateRallyDisplay();
    }

    // NUOVA AGGIUNTA: Salva lo stato dopo l'azione
    saveStateToLocalStorage();
}

function updateRallyDisplay() {
    document.getElementById('rally-id-display').innerText = "RALLY: #" + rallyCounter;
}

function updateLog() {
    const logList = document.getElementById('log-list');
    if (matchHistory.length === 0) {
        logList.innerHTML = "Nessuna azione registrata.";
        return;
    }
    logList.innerHTML = matchHistory.map((act) => {
        let rotString = act.RotazioneEseguita === 'SI' ? ' [🔄 Ruotato]' : '';
        return "[" + act.RallyID + " | " + act.PunteggioNoi + ":" + act.PunteggioLoro + "] " + act.Posizione + " (N°" + act.Giocatore + ") " + act.Fondamentale + " -> " + act.DettaglioVoto + rotString;
    }).reverse().join('<br>');
}

function exportCSV() {
    if (matchHistory.length === 0) {
        alert("Nessun dato da esportare!");
        return;
    }
    const headers = ["ID_Partita", "ID_Set", "RallyID", "Orario", "PunteggioNoi", "PunteggioLoro", "ServizioA", "RotazioneEseguita", "Giocatore", "Posizione", "Fondamentale", "Voto"];
    const csvRows = [headers.join(",")];
    
    matchHistory.forEach(row => {
        const values = headers.map(header => row[header]);
        csvRows.push(values.join(","));
    });
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "scout_" + matchID + ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
