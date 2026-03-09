/* Diff helper functions for HTTP requests/responses */
function diffStatus(original, replay) {
  return { original, replay };
}

function diffHeaders(original = [], modified = []) {
  const mapO = new Map(original.map(h => [h.name.toLowerCase(), h.value]));
  const mapM = new Map(modified.map(h => [h.name.toLowerCase(), h.value]));
  const added = [];
  const removed = [];
  const changed = [];

  for (const [name, value] of mapM) {
    if (!mapO.has(name)) {
      added.push({ name, value });
    } else if (mapO.get(name) !== value) {
      changed.push({ name, originalValue: mapO.get(name), replayValue: value });
    }
  }
  for (const [name, value] of mapO) {
    if (!mapM.has(name)) {
      removed.push({ name, value });
    }
  }
  return { added, removed, changed };
}

function diffText(original = '', modified = '') {
  const a = original.split('\n');
  const b = modified.split('\n');
  const max = Math.max(a.length, b.length);
  const result = [];
  for (let i = 0; i < max; i++) {
    const lineA = a[i] || '';
    const lineB = b[i] || '';
    if (lineA === lineB) {
      result.push({ type: 'unchanged', text: lineA });
    } else {
      if (lineA) result.push({ type: 'removed', text: lineA });
      if (lineB) result.push({ type: 'added', text: lineB });
    }
  }
  return result;
}

/* Expose diff functions globally for panel.js */
window.diffStatus = diffStatus;
window.diffHeaders = diffHeaders;
window.diffText = diffText;
