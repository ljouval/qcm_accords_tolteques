/**
 * app.js — Moteur général de QCM
 *
 * Écrans : Accroche → Présentation → Quiz → Résultats
 * Toutes les données (textes, titre, accords) viennent de config.md
 * Mélange global des questions, accord non affiché pendant le quiz
 * Chronomètre + export .md des résultats
 */

(function () {

  var CFG, ACCORDS, PDATA;
  var QUESTIONS = [];
  var state = { idx: 0, ans: {} };
  var timer = { start: 0, end: 0 };
  var L = ["A", "B", "C"];

  /* ── DOM ── */
  function app() { return document.getElementById("app"); }

  function setHTML(h) {
    var el = app();
    el.innerHTML = h;
    el.classList.remove("fade-up");
    void el.offsetWidth;
    el.classList.add("fade-up");
    window.scrollTo(0, 0);
  }

  /* ── Mélange global ── */
  function shuffle(arr) {
    var a = arr.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function buildQuestions() {
    var flat = [], i, j, a, q;
    for (i = 0; i < ACCORDS.length; i++) {
      a = ACCORDS[i];
      for (j = 0; j < a.questions.length; j++) {
        q = a.questions[j];
        flat.push({ text: q.text, options: q.options, accordIndex: i });
      }
    }
    return shuffle(flat);
  }

  /* ── Calculs scores ── */
  function scoreFor(ai) {
    var tot = 0, i, oi;
    for (i = 0; i < QUESTIONS.length; i++) {
      if (QUESTIONS[i].accordIndex !== ai) continue;
      oi = state.ans[i];
      if (oi !== undefined) tot += QUESTIONS[i].options[oi].score;
    }
    return tot;
  }

  function questionsFor(ai) {
    var n = 0, i;
    for (i = 0; i < QUESTIONS.length; i++) {
      if (QUESTIONS[i].accordIndex === ai) n++;
    }
    return n;
  }

  function getLevel(s, max) {
    var p = s / max;
    return p <= 0.45 ? 0 : p <= 0.73 ? 1 : 2;
  }

  function computeLevels() {
    var i, levels = [];
    for (i = 0; i < ACCORDS.length; i++) {
      levels.push(getLevel(scoreFor(i), questionsFor(i) * 3));
    }
    return levels;
  }

  /* ── Durée ── */
  function formatDuration(ms) {
    var s = Math.round(ms / 1000);
    var m = Math.floor(s / 60);
    s = s % 60;
    return m > 0 ? m + " min " + (s < 10 ? "0" : "") + s + " s" : s + " s";
  }

  /* ── Export .md ── */
  function exportMd(levels, pr, totalMs) {
    var date   = new Date().toLocaleDateString("fr-FR");
    var avgMs  = Math.round(totalMs / QUESTIONS.length);
    var i, a, lv, lvn, sc, max, ins, md;

    md  = "# Résultats — " + CFG.titre + "\n\n";
    md += "_Évaluation du " + date + "_\n\n---\n\n";
    md += "## Profil\n\n**" + pr.name + "**\n\n" + pr.desc + "\n\n---\n\n";
    md += "## Scores par accord\n\n";

    for (i = 0; i < ACCORDS.length; i++) {
      a   = ACCORDS[i];
      lv  = levels[i];
      lvn = (PDATA.niv[i] && PDATA.niv[i][lv]) ? PDATA.niv[i][lv] : "Niveau " + (lv + 1);
      sc  = scoreFor(i);
      max = questionsFor(i) * 3;
      ins = (PDATA.ins[i] && PDATA.ins[i][lv]) ? PDATA.ins[i][lv] : "";

      md += "### " + (i + 1) + "e — " + a.name + "\n\n";
      md += "- **Niveau** : " + lvn + " (" + (lv + 1) + "/3)\n";
      md += "- **Score** : " + sc + " / " + max + "\n\n";
      if (ins) md += "_" + ins + "_\n\n";
    }

    md += "---\n\n## Durée\n\n";
    md += "- **Totale** : " + formatDuration(totalMs) + "\n";
    md += "- **Moyenne par question** : " + formatDuration(avgMs) + "\n";

    var blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    var url  = URL.createObjectURL(blob);
    var el   = document.createElement("a");
    el.href = url; el.download = CFG.nom_export + ".md";
    document.body.appendChild(el); el.click();
    document.body.removeChild(el);
    URL.revokeObjectURL(url);
  }

  /* ══════════════════════════════════════════════════════════
     ÉCRAN 1 — Accroche
  ══════════════════════════════════════════════════════════ */
  function showAccroche() {
    setHTML(
      "<section class=\"intro\">"
      + "<div class=\"intro-symbol\">◈</div>"
      + "<div class=\"intro-eyebrow\">" + (CFG.sous_titre || "Autoévaluation") + "</div>"
      + "<h1 class=\"intro-title\">" + CFG.titre + "</h1>"
      + "<p class=\"intro-accroche\">" + CFG.accroche + "</p>"
      + "<div class=\"intro-meta\">"
      + "<div class=\"meta-item\"><span class=\"meta-num\">" + QUESTIONS.length + "</span><span class=\"meta-label\">Questions</span></div>"
      + "<div class=\"meta-item\"><span class=\"meta-num\">" + ACCORDS.length + "</span><span class=\"meta-label\">Catégories</span></div>"
      + "<div class=\"meta-item\"><span class=\"meta-num\">" + (CFG.duree_estimee || "~5'") + "</span><span class=\"meta-label\">Durée</span></div>"
      + "</div>"
      + "<button id=\"btn-decouvrir\">Découvrir les accords →</button>"
      + (CFG.auteur ? "<p class=\"intro-auteur\">D'après l'œuvre de " + CFG.auteur + "</p>" : "")
      + "</section>"
    );
    document.getElementById("btn-decouvrir").addEventListener("click", showPresentation);
  }

  /* ══════════════════════════════════════════════════════════
     ÉCRAN 2 — Présentation des accords
  ══════════════════════════════════════════════════════════ */
  function showPresentation() {
    var cartes = "", p, i;
    for (i = 0; i < CFG.presentation.length; i++) {
      p = CFG.presentation[i];
      cartes += "<div class=\"accord-card\">"
        + "<div class=\"accord-card-header\">"
        + "<span class=\"accord-card-icone\">" + (p.icone || "◈") + "</span>"
        + "<span class=\"accord-card-num\">" + (i + 1) + "e accord</span>"
        + "</div>"
        + "<div class=\"accord-card-nom\">" + p.nom + "</div>"
        + "<div class=\"accord-card-texte\">" + p.texte + "</div>"
        + "</div>";
    }

    setHTML(
      "<section class=\"presentation\">"
      + "<div class=\"presentation-header\">"
      + "<h2 class=\"presentation-titre\">Les " + CFG.presentation.length + " accords</h2>"
      + "<p class=\"presentation-sous\">Prenez le temps de les lire avant de commencer.</p>"
      + "</div>"
      + "<div class=\"accords-grille\">" + cartes + "</div>"
      + "<nav class=\"presentation-nav\">"
      + "<button class=\"btn-nav\" id=\"btn-retour-accroche\">← Retour</button>"
      + "<button class=\"btn-nav btn-next\" id=\"btn-commencer\">Commencer le questionnaire →</button>"
      + "</nav>"
      + "</section>"
    );

    document.getElementById("btn-retour-accroche").addEventListener("click", showAccroche);
    document.getElementById("btn-commencer").addEventListener("click", startQuiz);
  }

  /* ══════════════════════════════════════════════════════════
     ÉCRAN 3 — Quiz
  ══════════════════════════════════════════════════════════ */
  function startQuiz() {
    QUESTIONS   = buildQuestions();
    state       = { idx: 0, ans: {} };
    timer.start = Date.now();
    renderQuestion();
  }

  function renderQuestion() {
    var q       = QUESTIONS[state.idx];
    var sel     = state.ans[state.idx];
    var tot     = QUESTIONS.length;
    var isFirst = state.idx === 0;
    var isLast  = state.idx === tot - 1;
    var pct     = Math.round(state.idx / tot * 100);
    var num     = (state.idx < 9 ? "0" : "") + (state.idx + 1);
    var i, opts = "";

    for (i = 0; i < q.options.length; i++) {
      opts += "<button class=\"opt" + (sel === i ? " sel" : "") + "\" data-i=\"" + i + "\">"
        + "<span class=\"opt-letter\">" + L[i] + "</span>"
        + "<span class=\"opt-text\">" + q.options[i].text + "</span>"
        + "</button>";
    }

    setHTML(
      "<section class=\"quiz-main\">"
      + "<div class=\"progress-track\"><div class=\"progress-fill\" style=\"width:" + pct + "%\"></div></div>"
      + "<span class=\"progress-label\">" + (state.idx + 1) + " / " + tot + "</span>"
      + "<div class=\"q-number\">" + num + "</div>"
      + "<div class=\"q-text\">" + q.text + "</div>"
      + "<div class=\"options\">" + opts + "</div>"
      + "<nav class=\"quiz-nav\">"
      + "<button class=\"btn-nav\" id=\"btn-back\"" + (isFirst ? " disabled" : "") + ">← Retour</button>"
      + "<button class=\"btn-nav btn-next\" id=\"btn-next\"" + (sel === undefined ? " disabled" : "") + ">"
      + (isLast ? "Voir mes résultats →" : "Suivant →")
      + "</button></nav>"
      + "</section>"
    );

    document.querySelectorAll(".opt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.ans[state.idx] = parseInt(btn.dataset.i, 10);
        document.querySelectorAll(".opt").forEach(function (b) { b.classList.remove("sel"); });
        btn.classList.add("sel");
        document.getElementById("btn-next").disabled = false;
      });
    });

    document.getElementById("btn-back").addEventListener("click", function () {
      if (state.idx > 0) { state.idx--; renderQuestion(); }
    });

    document.getElementById("btn-next").addEventListener("click", function () {
      if (state.ans[state.idx] === undefined) return;
      if (state.idx < QUESTIONS.length - 1) {
        state.idx++; renderQuestion();
      } else {
        timer.end = Date.now();
        showResults();
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     ÉCRAN 4 — Résultats
  ══════════════════════════════════════════════════════════ */
  function showResults() {
    var levels  = computeLevels();
    var code    = levels.map(function (l) { return l + 1; }).join("-");
    var pr      = PDATA.prof[code] || PDATA.def
               || { name: "En chemin", desc: "Chaque catégorie est un chemin à parcourir à votre rythme." };
    var totalMs = timer.end - timer.start;
    var avgMs   = Math.round(totalMs / QUESTIONS.length);
    var cards   = "", items = "";
    var a, i, lv, lvn, sc, max, pct, ins;

    for (i = 0; i < ACCORDS.length; i++) {
      a   = ACCORDS[i];
      lv  = levels[i];
      lvn = (PDATA.niv[i] && PDATA.niv[i][lv]) ? PDATA.niv[i][lv] : "Niveau " + (lv + 1);
      sc  = scoreFor(i);
      max = questionsFor(i) * 3;
      pct = Math.round(sc / max * 100);

      cards += "<div class=\"score-card\" style=\"--accord-color:" + a.color + "\">"
        + "<div class=\"sc-accord\">" + (i + 1) + "e — " + a.name + "</div>"
        + "<div class=\"sc-level-name\">" + lvn + "</div>"
        + "<div class=\"sc-bar\"><div class=\"sc-bar-fill\" data-pct=\"" + pct + "\"></div></div>"
        + "<div class=\"sc-meta\">"
        + "<span class=\"sc-score-text\">Score : " + sc + " / " + max + "</span>"
        + "<span class=\"sc-level-badge\">Niveau " + (lv + 1) + " / 3</span>"
        + "</div></div>";

      ins = (PDATA.ins[i] && PDATA.ins[i][lv]) ? PDATA.ins[i][lv] : "";
      items += "<div class=\"insight-item\" style=\"--accord-color:" + a.color + "\">"
        + "<div class=\"insight-stripe\"></div>"
        + "<div class=\"insight-body\">"
        + "<div class=\"insight-label\">" + a.name + "</div>"
        + "<div class=\"insight-text\">" + ins + "</div>"
        + "</div></div>";
    }

    var dureeHTML =
      "<div class=\"duree-bloc\">"
      + "<div class=\"duree-item\"><span class=\"duree-val\">" + formatDuration(totalMs) + "</span><span class=\"duree-lbl\">Durée totale</span></div>"
      + "<div class=\"duree-sep\"></div>"
      + "<div class=\"duree-item\"><span class=\"duree-val\">" + formatDuration(avgMs) + "</span><span class=\"duree-lbl\">Moyenne par question</span></div>"
      + "</div>";

    setHTML(
      "<div class=\"results-hero\">"
      + "<div class=\"results-eyebrow\">Votre profil</div>"
      + "<div class=\"results-profile-name\">" + pr.name + "</div>"
      + "<div class=\"results-profile-desc\">" + pr.desc + "</div>"
      + "</div>"
      + "<div class=\"results-body\">"
      + "<div class=\"results-section-title\">Vos scores par accord</div>"
      + "<div class=\"scores-grid\">" + cards + "</div>"
      + "<div class=\"results-section-title\">Vos insights de progression</div>"
      + "<div class=\"insights-list\">" + items + "</div>"
      + "<div class=\"results-section-title\">Durée du questionnaire</div>"
      + dureeHTML
      + "</div>"
      + "<div class=\"results-actions\">"
      + "<button class=\"btn-nav\" id=\"btn-restart\">← Recommencer</button>"
      + "<button class=\"btn-nav\" id=\"btn-export\">Exporter en .md</button>"
      + "<button class=\"btn-nav btn-next\" onclick=\"window.print()\">Imprimer</button>"
      + "</div>"
    );

    document.getElementById("btn-restart").addEventListener("click", showAccroche);
    document.getElementById("btn-export").addEventListener("click", function () {
      exportMd(levels, pr, totalMs);
    });

    setTimeout(function () {
      document.querySelectorAll(".sc-bar-fill").forEach(function (el) {
        el.style.width = el.dataset.pct + "%";
      });
    }, 100);
  }

  /* ── Init ── */
  window.addEventListener("load", function () {
    Parser.load(function (err, data) {
      if (err) {
        app().innerHTML = "<p style=\"padding:2rem;color:#C4614A\">Erreur : " + err + "</p>";
        return;
      }
      CFG       = data.config;
      ACCORDS   = data.accords;
      PDATA     = data.profils;
      QUESTIONS = buildQuestions();
      // Mettre à jour le titre de la page depuis config.md
      document.title = CFG.titre + " — " + (CFG.sous_titre || "Questionnaire");
      showAccroche();
    });
  });

})();
