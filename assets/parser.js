/**
 * parser.js — Moteur général de QCM
 * Parse config.md, questionnaire.md et profils.md
 * Priorité 1 : variables RAW_* depuis data.js (local + GitHub)
 * Priorité 2 : fetch() (GitHub Pages sans data.js)
 */

var Parser = (function () {

  function shuffle(arr) {
    var a = arr.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ── Parse config.md ── */
  function parseConfig(raw) {
    var lines = raw.split("\n");
    var cfg = {
      titre: "Questionnaire", sous_titre: "", auteur: "",
      duree_estimee: "", nom_export: "resultats",
      accroche: "", presentation: []
    };
    var section = null, currentAccord = null;
    var i, t, m;

    for (i = 0; i < lines.length; i++) {
      t = lines[i].trim();
      if (!t || t === "---") continue;

      if (t === "# CONFIG")       { section = "CFG"; continue; }
      if (t === "# ACCROCHE")     { section = "ACR"; continue; }
      if (t === "# PRESENTATION") { section = "PRE"; continue; }

      if (section === "CFG") {
        if (t.indexOf("titre:")          === 0) cfg.titre          = t.slice(6).trim();
        if (t.indexOf("sous_titre:")     === 0) cfg.sous_titre     = t.slice(11).trim();
        if (t.indexOf("auteur:")         === 0) cfg.auteur         = t.slice(7).trim();
        if (t.indexOf("duree_estimee:")  === 0) cfg.duree_estimee  = t.slice(15).trim();
        if (t.indexOf("nom_export:")     === 0) cfg.nom_export     = t.slice(11).trim();
        continue;
      }

      if (section === "ACR") {
        cfg.accroche += (cfg.accroche ? " " : "") + t;
        continue;
      }

      if (section === "PRE") {
        if (/^## Accord \d+/.test(t)) {
          if (currentAccord) cfg.presentation.push(currentAccord);
          currentAccord = { nom: "", icone: "", texte: "" };
          continue;
        }
        if (currentAccord && t.indexOf("nom:")   === 0) { currentAccord.nom   = t.slice(4).trim(); continue; }
        if (currentAccord && t.indexOf("icone:") === 0) { currentAccord.icone = t.slice(6).trim(); continue; }
        if (currentAccord && t.indexOf("texte:") === 0) { currentAccord.texte = t.slice(6).trim(); continue; }
      }
    }
    if (currentAccord) cfg.presentation.push(currentAccord);
    return cfg;
  }

  /* ── Parse questionnaire.md ── */
  function parseQuestionnaire(raw) {
    var lines = raw.split("\n");
    var cfg = { mr: false };
    var accords = [], acc = null, q = null, inCfg = false;
    var i, t, m;

    for (i = 0; i < lines.length; i++) {
      t = lines[i].trim();
      if (!t) continue;
      if (t === "---") { inCfg = false; continue; }
      if (t === "# CONFIG") { inCfg = true; continue; }
      if (inCfg) {
        if (t.indexOf("melanger_reponses:") === 0) cfg.mr = t.split(":")[1].trim() === "true";
        continue;
      }
      if (/^# ACCORD \d+/.test(t)) {
        if (q && acc) { acc.questions.push(q); q = null; }
        acc = { name: "", desc: "", color: "", questions: [] };
        accords.push(acc);
        continue;
      }
      if (acc && t.indexOf("name:")  === 0) { acc.name  = t.slice(5).trim(); continue; }
      if (acc && t.indexOf("desc:")  === 0) { acc.desc  = t.slice(5).trim(); continue; }
      if (acc && t.indexOf("color:") === 0) { acc.color = t.slice(6).trim(); continue; }
      if (/^## Q\d+/.test(t)) {
        if (q && acc) acc.questions.push(q);
        q = { text: "", options: [] };
        continue;
      }
      if (q && t.charAt(0) !== "-" && !q.text) { q.text = t; continue; }
      if (q && /^- \[\d+\]/.test(t)) {
        m = t.match(/^- \[(\d+)\] (.+)$/);
        if (m) q.options.push({ score: parseInt(m[1], 10), text: m[2].trim() });
        continue;
      }
    }
    if (q && acc) acc.questions.push(q);
    if (cfg.mr) {
      accords.forEach(function (a) {
        a.questions.forEach(function (qq) { qq.options = shuffle(qq.options); });
      });
    }
    return accords;
  }

  /* ── Parse profils.md ── */
  function parseProfils(raw) {
    var lines = raw.split("\n");
    var niv = [], ins = [], prof = {}, def = null;
    var sec = null, ai = -1, cp = null, ck = null;
    var i, t, m, idx;

    for (i = 0; i < lines.length; i++) {
      t = lines[i].trim();
      if (!t || t === "---") continue;
      if (t === "# NIVEAUX")  { sec = "N"; ai = -1; continue; }
      if (t === "# INSIGHTS") { sec = "I"; ai = -1; continue; }
      if (t === "# PROFILS")  { sec = "P"; continue; }

      if ((sec === "N" || sec === "I") && /^## Accord \d+/.test(t)) {
        ai++;
        if (sec === "N") niv[ai] = [];
        if (sec === "I") ins[ai] = [];
        continue;
      }
      if ((sec === "N" || sec === "I") && /^- \[\d+\]/.test(t)) {
        m = t.match(/^- \[(\d+)\] (.+)$/);
        if (m) {
          idx = parseInt(m[1], 10) - 1;
          if (sec === "N") niv[ai][idx] = m[2].trim();
          if (sec === "I") ins[ai][idx] = m[2].trim();
        }
        continue;
      }
      if (sec === "P") {
        if (/^## [\d]+-[\d]+-[\d]+-[\d]+$/.test(t)) {
          if (ck && cp) prof[ck] = { name: cp.name, desc: cp.desc };
          ck = t.slice(3).trim(); cp = { name: "", desc: "" }; continue;
        }
        if (t === "## DEFAULT") {
          if (ck && cp) prof[ck] = { name: cp.name, desc: cp.desc };
          ck = "DEFAULT"; cp = { name: "", desc: "" }; continue;
        }
        if (cp && t.indexOf("name:") === 0) cp.name = t.slice(5).trim();
        if (cp && t.indexOf("desc:") === 0) cp.desc = t.slice(5).trim();
      }
    }
    if (ck && cp) {
      if (ck === "DEFAULT") def = { name: cp.name, desc: cp.desc };
      else prof[ck] = { name: cp.name, desc: cp.desc };
    }
    return { niv: niv, ins: ins, prof: prof, def: def };
  }

  /* ── Chargement ── */
  function load(callback) {
    if (typeof RAW_CONFIG !== "undefined"
     && typeof RAW_QUESTIONNAIRE !== "undefined"
     && typeof RAW_PROFILS !== "undefined") {
      try {
        callback(null, {
          config:  parseConfig(RAW_CONFIG),
          accords: parseQuestionnaire(RAW_QUESTIONNAIRE),
          profils: parseProfils(RAW_PROFILS)
        });
      } catch (e) { callback("Erreur parsing : " + e.message); }
      return;
    }
    // Fallback fetch (GitHub Pages sans data.js)
    var results = {}, errors = 0;
    var files = [
      { url: "assets/config.md",        key: "c" },
      { url: "assets/questionnaire.md",  key: "q" },
      { url: "assets/profils.md",        key: "p" }
    ];
    files.forEach(function (f) {
      fetch(f.url)
        .then(function (r) {
          if (!r.ok) throw new Error(f.url + " introuvable");
          return r.text();
        })
        .then(function (txt) {
          results[f.key] = txt;
          if (Object.keys(results).length === 3) {
            try {
              callback(null, {
                config:  parseConfig(results.c),
                accords: parseQuestionnaire(results.q),
                profils: parseProfils(results.p)
              });
            } catch (e) { callback("Erreur parsing : " + e.message); }
          }
        })
        .catch(function (e) { callback(e.message); });
    });
  }

  return { load: load };
})();
