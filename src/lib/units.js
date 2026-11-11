/*
 * Units can have sub-units, one level deep. The API sends a flat list with parentId;
 * these helpers turn it into course order: each unit followed by its sub-units.
 */

const byOrder = (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id;

/** [{ ...unit, depth: 0 | 1, children: [...] }] in course order, flat. */
export const unitTree = (units = []) => {
  const active = units.filter((u) => u.isActive !== false);
  const ids = new Set(active.map((u) => u.id));
  const kids = new Map();
  const top = [];
  for (const u of active) {
    if (u.parentId && ids.has(u.parentId)) {
      if (!kids.has(u.parentId)) kids.set(u.parentId, []);
      kids.get(u.parentId).push(u);
    } else top.push(u);
  }
  const out = [];
  for (const u of top.sort(byOrder)) {
    const children = (kids.get(u.id) ?? []).sort(byOrder);
    out.push({ ...u, depth: 0, children });
    for (const c of children) out.push({ ...c, depth: 1, children: [], parentName: u.name });
  }
  return out;
};

/** "Unit › Sub-unit" for a sub-unit, the name for a unit. */
export const unitPath = (u) => (u?.parentName ? `${u.parentName} › ${u.name}` : u?.name ?? '');

/** A unit's id plus its sub-units' ids (a unit stands for its whole branch). */
export const withSubUnits = (tree, id) => {
  const u = tree.find((x) => x.id === id);
  return u ? [u.id, ...u.children.map((c) => c.id)] : [id];
};
