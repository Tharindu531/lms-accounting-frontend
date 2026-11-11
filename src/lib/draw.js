/* Random-draw settings, shared by "Add random questions" and creating a quiz from the bank. */

export const emptyDraw = { unitIds: [], count: '10', type: '', marks: '', even: false, days: '' };

/** API fields for a draw form. */
export const drawPayload = (f) => ({
  unitIds: f.unitIds.length ? f.unitIds : null,
  type: f.type || null,
  marks: f.marks ? [Number(f.marks)] : null,
  notUsedForDays: f.days ? Number(f.days) : null,
  evenDistribution: f.even && f.unitIds.length > 1,
});
