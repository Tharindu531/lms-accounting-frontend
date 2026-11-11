import { forwardRef } from 'react';
import { Select } from '../ui/primitives';
import { unitTree } from '../../lib/units';

/**
 * Unit dropdown with sub-units indented under their unit. Both levels can be
 * chosen. `empty` is the label of the no-unit option (omit for none).
 */
const UnitSelect = forwardRef(function UnitSelect({ units, empty, ...props }, ref) {
  const tree = unitTree(units);
  return (
    <Select ref={ref} {...props}>
      {empty != null && <option value="">{empty}</option>}
      {tree.map((u) => (
        <option key={u.id} value={String(u.id)}>
          {u.depth ? `\u00a0\u00a0\u00a0\u00a0${u.name}` : u.name}
        </option>
      ))}
    </Select>
  );
});

export default UnitSelect;
