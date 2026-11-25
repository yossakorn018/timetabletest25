// ทดสอบกับชุดข้อมูลซ้อม 25 พ.ย.: node test_practice.js <โฟลเดอร์ data>
const fs = require("fs"), path = require("path"), E = require("./engine.js");
const dir = process.argv[2] || "data";
const data = {};
for (const f of fs.readdirSync(dir).filter(f => /\.csv$/i.test(f))) {
  const { headers, records } = E.parseCSV(fs.readFileSync(path.join(dir, f), "utf8"));
  const m = E.mapImport(f, headers, records);
  console.log(f.padEnd(14), "→", m ? m.table + " (" + m.records.length + " แถว) " + m.renamed.join(", ") + (m.missing.length ? " | ไม่มี: " + m.missing.join(",") : "") : "ไม่รู้จัก");
  if (m) data[m.table] = m.records;
}
const cfg = { teacherDayOff: { T05: ["ศุกร์"] }, runs: 20 };
const issues = E.inputCheck(data, cfg);
console.log("input issues:", issues.map(i => i.level + ": " + i.message));
const base = E.runSchedule(data, cfg, { mode: "baseline" }), vb = E.validate(data, base.rows, cfg);
const best = E.runBest(data, cfg, null, { repair: true });
for (const [n, v, r] of [["baseline", vb, base], ["heur+repair", best.validation, best.best]]) {
  console.log(n.padEnd(12), "rows", r.rows.length, "| ผ่าน", v.summary.rulesPassed + "/" + v.summary.rulesTotal, "| hard", v.summary.hardViolations, "| ขาด", v.summary.missingPeriods, "| soft", v.summary.softScore);
  console.log("   ไม่ผ่าน:", v.rules.filter(x => !x.passed).map(x => x.id + "(" + x.count + ")").join(" "), v.rules.filter(x => !x.passed && x.type !== "soft").slice(0, 3).map(x => x.violations[0].message));
}
console.log("unscheduled:", best.best.unscheduled.map(u => u.message + " → " + u.hint));
console.log("seeds:", best.history.map(h => h.seed + ":" + h.hard + "/" + h.missing).join(" "));
if (process.argv[3]) fs.writeFileSync(process.argv[3], "﻿" + E.toCSV(best.best.rows, E.OUTPUT_COLUMNS));
// ลากย้ายบล็อกด้วยมือ: ทุกการย้ายที่ checkPlacement อนุญาต ต้องผ่านตัวตรวจ 18 ข้อด้วย
{
  const c = E.mergeConfig(cfg), I = E.prepare(data, c), bl = best.best.blocks;
  let ok = 0, valid = 0;
  for (const b of bl) for (const day of I.days) for (const p of I.periods) {
    const r = E.checkPlacement(I, c, bl, [{ id: b.id, day, start: p }]);
    if (!r.ok) continue; ok++;
    const nb = bl.map(x => x.id === b.id ? { ...x, day, slots: r.placements[0].slots, periods: r.placements[0].periods, room: r.placements[0].room } : x);
    const v = E.validate(data, E.rowsFromBlocks(nb), c);
    if (v.rules.filter(x => x.type !== "soft").every(x => x.passed)) valid++; else console.log("MISMATCH", b.subject, day, p, v.rules.filter(x => !x.passed && x.type !== "soft").map(x => x.id));
  }
  console.log("ย้ายด้วยมือ: อนุญาต", ok, "ครั้ง ผ่านตัวตรวจ", valid, "ครั้ง");
}
