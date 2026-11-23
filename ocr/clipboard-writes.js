// Serialize writes so a late automatic OCR result cannot replace a newer
// explicit copy, including when the earlier browser clipboard request is pending.
export function clipboardWrites({ writeText, writeImage }) {
  let revision = 0;
  let pending = Promise.resolve();
  function enqueue(write) {
    const result = pending.then(write);
    pending = result.catch(() => {});
    return result;
  }
  return {
    get revision() { return revision; },
    copyText(text, { automaticRevision, isCurrent = () => true } = {}) {
      if (automaticRevision == null) revision++;
      return enqueue(async () => {
        if (!isCurrent() || (automaticRevision != null && automaticRevision !== revision)) return false;
        await writeText(text);
        return true;
      });
    },
    copyImage(snapshot) {
      revision++;
      // The snapshot is taken at click time; a queued write may run later.
      void snapshot.catch(() => {});
      return enqueue(() => writeImage(snapshot));
    }
  };
}
