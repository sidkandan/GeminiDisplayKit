const state = {
    tournament: null,
    monsters: [],
    monsterById: new Map(),
    strategies: {},
    gamedata: null,
    moveById: new Map(),
    roundOrder: [],
    selectedRound: null,
    revealedBattles: new Set(),
    activeFrames: new Map(),
    isPlaying: false,
};

const elementColors = {
    pyro: "#ff623d",
    flora: "#4fdb73",
    aqua: "#25c8ff",
    gale: "#b8f4ff",
    volt: "#ffd23f",
    terra: "#d3945a",
    neutral: "#c9d0d7",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`${url} returned ${response.status}`);
    }
    return response.json();
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getMonster(id) {
    return state.monsterById.get(id) || { id, name: id, element: "neutral" };
}

function getStrategy(id) {
    return state.strategies[id] || {};
}

function getMove(moveId) {
    return state.moveById.get(moveId) || { id: moveId, name: moveId, element: "neutral" };
}

function roundBattles(roundName) {
    return state.tournament.battles.filter((battle) => battle.round === roundName);
}

function orderedRounds(tournament) {
    const preferred = ["Round of 16", "Quarterfinal", "Semifinal", "Final"];
    return preferred.filter((roundName) => (tournament.rounds[roundName] || []).length > 0);
}

function winnerId(battle) {
    return battle[battle.winner].id;
}

function loserId(battle) {
    return battle.winner === "a" ? battle.b.id : battle.a.id;
}

function battleLabel(battle) {
    return `${battle.a.name} vs ${battle.b.name}`;
}

async function initArena() {
    try {
        const [tournament, monstersPayload, gamedata] = await Promise.all([
            fetchJson("/api/tournament"),
            fetchJson("/api/monsters"),
            fetchJson("/api/gamedata"),
        ]);
        state.tournament = tournament;
        state.monsters = monstersPayload.monsters || [];
        state.strategies = monstersPayload.strategies || {};
        state.gamedata = gamedata;
        state.monsterById = new Map(state.monsters.map((monster) => [monster.id, monster]));
        state.moveById = new Map(gamedata.moves.map((move) => [move.id, move]));
        state.roundOrder = orderedRounds(tournament);
        state.selectedRound = state.roundOrder[0] || "Final";

        renderShell();
        renderHatcheryList();
        if (state.monsters[0]) {
            selectMonster(state.monsters[0].id);
        }
        setTimeout(() => playBracket(), 700);
    } catch (error) {
        document.getElementById("ticker").textContent = `Arena data unavailable: ${error.message}`;
        document.getElementById("stage").innerHTML = `
            <div class="empty-state">
                <h2>Tournament data is not ready</h2>
                <p>Run .venv/bin/python -m engine.tournament to create data/tournament.json.</p>
            </div>
        `;
    }
}

function renderShell() {
    document.getElementById("championName").textContent = state.tournament.champion.name;
    document.getElementById("createdStamp").textContent = new Date(state.tournament.created).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
    document.getElementById("battleCount").textContent = `${state.tournament.battles.length} battles`;
    renderRoundTabs();
    renderBracket();
    renderStage();
}

function renderRoundTabs() {
    const tabs = document.getElementById("roundTabs");
    tabs.innerHTML = state.roundOrder
        .map((roundName, index) => `
            <button type="button"
                class="${roundName === state.selectedRound ? "active" : ""}"
                data-round="${escapeHtml(roundName)}">
                <span>${index === 0 ? "Round 1" : escapeHtml(roundName)}</span>
                <small>${roundBattles(roundName).length}</small>
            </button>
        `)
        .join("");
    tabs.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => {
            state.selectedRound = button.dataset.round;
            renderRoundTabs();
            renderStage();
        });
    });
}

function renderBracket() {
    const panel = document.getElementById("bracketPanel");
    const columns = [];
    const starterMatches = state.tournament.bracket
        .map((pair, index) => {
            const left = pair[0] ? getMonster(pair[0]) : null;
            const right = pair[1] ? getMonster(pair[1]) : null;
            return `
                <div class="bracket-match">
                    <small>Seed ${index + 1}</small>
                    <span>${left ? escapeHtml(left.name) : "Bye"}</span>
                    <span>${right ? escapeHtml(right.name) : "Bye"}</span>
                </div>
            `;
        })
        .join("");
    columns.push(`<section><h3>Seeds</h3>${starterMatches}</section>`);

    for (const roundName of state.roundOrder) {
        const matches = roundBattles(roundName)
            .map((battle) => {
                const revealed = state.revealedBattles.has(battle.battle_id);
                const winner = getMonster(winnerId(battle));
                return `
                    <div class="bracket-match ${revealed ? "resolved" : ""}">
                        <small>${escapeHtml(battle.battle_id)}</small>
                        <span>${escapeHtml(battle.a.name)}</span>
                        <span>${escapeHtml(battle.b.name)}</span>
                        <strong>${revealed ? escapeHtml(winner.name) : "pending"}</strong>
                    </div>
                `;
            })
            .join("");
        columns.push(`<section><h3>${escapeHtml(roundName)}</h3>${matches}</section>`);
    }

    const finalBattle = state.tournament.battles.find((battle) => battle.round === "Final");
    const finalRevealed = finalBattle && state.revealedBattles.has(finalBattle.battle_id);
    columns.push(`
        <section>
            <h3>Crown</h3>
            <div class="bracket-match crown ${finalRevealed ? "resolved" : ""}">
                <small>Champion</small>
                <strong>${finalRevealed ? escapeHtml(state.tournament.champion.name) : "pending"}</strong>
                <span>${escapeHtml(state.tournament.champion.coach_name || "coach")}</span>
            </div>
        </section>
    `);

    panel.innerHTML = columns.join("");
}

function renderStage() {
    const stage = document.getElementById("stage");
    const battles = roundBattles(state.selectedRound);
    const isFinal = state.selectedRound === "Final";
    const isOpeningRound = state.selectedRound === state.roundOrder[0] && battles.length > 1;
    stage.className = `stage ${isFinal ? "final-stage" : isOpeningRound ? "opening-grid" : "duel-grid"}`;
    stage.innerHTML = battles.map((battle) => renderBattleCard(battle, isFinal)).join("");
    document.getElementById("ticker").textContent = stageTicker(battles);
}

function stageTicker(battles) {
    if (!battles.length) {
        return "No battles in this round.";
    }
    if (battles.length === 1) {
        const battle = battles[0];
        const winner = state.revealedBattles.has(battle.battle_id) ? getMonster(winnerId(battle)).name : "undecided";
        return `${battleLabel(battle)} | winner: ${winner}`;
    }
    const resolved = battles.filter((battle) => state.revealedBattles.has(battle.battle_id)).length;
    return `${state.selectedRound}: ${resolved}/${battles.length} fights resolved`;
}

function renderBattleCard(battle, isFinal) {
    const frameIndex = state.activeFrames.get(battle.battle_id);
    const currentTurn = frameIndex === undefined || frameIndex < 0
        ? null
        : battle.turns[Math.min(frameIndex, battle.turns.length - 1)];
    const aHp = currentTurn ? currentTurn.a_hp : startOrFinalHp(battle, "a");
    const bHp = currentTurn ? currentTurn.b_hp : startOrFinalHp(battle, "b");
    const actionSide = currentTurn ? currentTurn.actor : "";
    const move = currentTurn ? getMove(currentTurn.move) : null;
    const winner = state.revealedBattles.has(battle.battle_id) ? winnerId(battle) : null;

    return `
        <article class="fight-card ${isFinal ? "final-card" : ""}" data-battle="${escapeHtml(battle.battle_id)}">
            <header>
                <span>${escapeHtml(battle.round)}</span>
                <strong>${escapeHtml(battle.battle_id)}</strong>
            </header>
            <div class="fighters">
                ${renderFighter(battle.a, "a", aHp, actionSide === "a", winner === battle.a.id)}
                <div class="versus">VS</div>
                ${renderFighter(battle.b, "b", bHp, actionSide === "b", winner === battle.b.id)}
            </div>
            <div class="move-strip ${currentTurn ? currentTurn.effectiveness : ""}">
                ${currentTurn ? renderMoveStrip(currentTurn, move) : "<span>Waiting for bell</span>"}
            </div>
            ${currentTurn && currentTurn.taunt ? `<div class="taunt-bubble">${escapeHtml(currentTurn.taunt)}</div>` : ""}
        </article>
    `;
}

function startOrFinalHp(battle, side) {
    if (!state.revealedBattles.has(battle.battle_id) || !battle.turns.length) {
        return 100;
    }
    const last = battle.turns[battle.turns.length - 1];
    return side === "a" ? last.a_hp : last.b_hp;
}

function renderFighter(monster, side, hp, active, winner) {
    const color = elementColors[monster.element] || elementColors.neutral;
    return `
        <section class="fighter ${active ? "active" : ""} ${winner ? "winner" : ""}">
            <div class="sprite-wrap" style="--element-color:${color}">
                <div class="sprite-fallback">${escapeHtml(monster.name.slice(0, 1))}</div>
                <img src="/static/sprites/${escapeHtml(monster.id)}.png"
                     alt="${escapeHtml(monster.name)}"
                     onerror="this.classList.add('missing')">
            </div>
            <div class="fighter-copy">
                <strong>${escapeHtml(monster.name)}</strong>
                <small>${escapeHtml(monster.element)} | ${side.toUpperCase()}</small>
            </div>
            <div class="hp-track" aria-label="${escapeHtml(monster.name)} HP">
                <span style="width:${Math.max(0, Math.min(100, hp))}%"></span>
            </div>
            <b>${Math.max(0, Math.min(100, hp))} HP</b>
        </section>
    `;
}

function renderMoveStrip(turn, move) {
    const actor = turn.actor === "a" ? "A" : "B";
    const banner = {
        super: "SUPER EFFECTIVE!",
        resisted: "resisted",
        heal: "heal",
        buff: "buff",
        normal: "clean hit",
    }[turn.effectiveness] || "action";
    const amount = turn.effectiveness === "heal"
        ? `+${turn.damage} HP`
        : turn.damage
            ? `${turn.damage} damage`
            : turn.note || "setup";
    return `
        <span class="move-name">${actor}: ${escapeHtml(move.name)}</span>
        <strong>${banner}</strong>
        <span>${escapeHtml(amount)}</span>
    `;
}

async function playBracket() {
    if (state.isPlaying || !state.tournament) {
        return;
    }
    state.isPlaying = true;
    document.getElementById("playButton").disabled = true;
    state.revealedBattles.clear();
    state.activeFrames.clear();
    renderBracket();

    for (const roundName of state.roundOrder) {
        state.selectedRound = roundName;
        renderRoundTabs();
        await animateRound(roundName);
        await sleep(350);
    }

    state.isPlaying = false;
    document.getElementById("playButton").disabled = false;
}

async function animateRound(roundName) {
    const battles = roundBattles(roundName);
    const maxTurns = Math.max(...battles.map((battle) => battle.turns.length), 0);
    battles.forEach((battle) => state.activeFrames.set(battle.battle_id, -1));
    renderStage();
    await sleep(300);

    for (let frame = 0; frame < maxTurns; frame += 1) {
        battles.forEach((battle) => {
            if (frame < battle.turns.length) {
                state.activeFrames.set(battle.battle_id, frame);
            }
        });
        renderStage();
        await sleep(roundDelay(roundName));
    }

    battles.forEach((battle) => {
        state.activeFrames.set(battle.battle_id, battle.turns.length - 1);
        state.revealedBattles.add(battle.battle_id);
    });
    renderBracket();
    renderStage();
}

function roundDelay(roundName) {
    const speed = Number(document.getElementById("speedSelect").value || 1);
    const base = roundName === "Final" ? 1100 : roundName === state.roundOrder[0] ? 560 : 760;
    return base / speed;
}

function resetArena() {
    state.revealedBattles.clear();
    state.activeFrames.clear();
    state.selectedRound = state.roundOrder[0];
    renderRoundTabs();
    renderBracket();
    renderStage();
}

function renderHatcheryList() {
    const list = document.getElementById("hatcheryList");
    list.innerHTML = state.monsters
        .map((monster) => `
            <button type="button" data-monster="${escapeHtml(monster.id)}">
                <span style="--element-color:${elementColors[monster.element] || elementColors.neutral}"></span>
                ${escapeHtml(monster.name)}
            </button>
        `)
        .join("");
    list.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => selectMonster(button.dataset.monster));
    });
}

async function selectMonster(monsterId) {
    const monster = getMonster(monsterId);
    const strategy = getStrategy(monsterId);
    document.querySelectorAll(".monster-list button").forEach((button) => {
        button.classList.toggle("active", button.dataset.monster === monsterId);
    });
    document.getElementById("hatcheryName").textContent = monster.name;
    document.getElementById("hatcheryMeta").textContent = `${monster.element} | coached by ${monster.coach_name || "anonymous"} | ${strategy.source || "strategy pending"}`;
    document.getElementById("reasoningText").textContent = strategy.reasoning || monster.coaching || "No reasoning captured yet.";
    const selfTest = strategy.self_test || {};
    document.getElementById("selfTestText").textContent = Number.isFinite(selfTest.trials)
        ? `${selfTest.wins || 0}/${selfTest.trials || 0} wins in sandbox self-test`
        : "No self-test captured.";
    renderTaunts(strategy.taunts || {});
    await renderTrace(monsterId);
}

function renderTaunts(taunts) {
    const grid = document.getElementById("tauntGrid");
    const entries = Object.entries(taunts);
    grid.innerHTML = entries.length
        ? entries.map(([key, value]) => `<span><b>${escapeHtml(key)}</b>${escapeHtml(value)}</span>`).join("")
        : "<span>No taunts captured.</span>";
}

async function renderTrace(monsterId) {
    const list = document.getElementById("traceSteps");
    list.innerHTML = "<li>Checking trace...</li>";
    try {
        const trace = await fetchJson(`/api/hatch_trace/${monsterId}`);
        const steps = Array.isArray(trace) ? trace : trace.steps || [];
        list.innerHTML = steps.length
            ? steps.slice(0, 12).map((step) => `<li>${escapeHtml(traceStepText(step))}</li>`).join("")
            : "<li>No trace steps captured.</li>";
    } catch (_error) {
        list.innerHTML = "<li>No trace file yet.</li>";
    }
}

function traceStepText(step) {
    if (typeof step === "string") {
        return step;
    }
    if (step.type && step.name) {
        return `${step.type}: ${step.name}`;
    }
    if (step.type && step.text) {
        return `${step.type}: ${step.text.slice(0, 120)}`;
    }
    if (step.type) {
        return step.type;
    }
    return JSON.stringify(step).slice(0, 160);
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("playButton").addEventListener("click", playBracket);
    document.getElementById("resetButton").addEventListener("click", resetArena);
    document.getElementById("speedSelect").addEventListener("change", () => {
        if (!state.isPlaying) {
            renderStage();
        }
    });
    initArena();
});
