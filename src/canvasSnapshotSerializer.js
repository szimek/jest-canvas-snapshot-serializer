module.exports = function toMatchCanvasSnapshotFactory(fs, path, hash, prettyFormat, getTestState) {
  function format(element) {
    return prettyFormat(element, {
      plugins: [prettyFormat.plugins.DOMElement],
    });
  }

  function ensureSnapshotDir() {
    const state = getTestState();
    const snapshotDir = path.dirname(state.snapshotState._snapshotPath);
    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir);
    }
  }

  function getImageContent(canvas) {
    const imageBase64 = canvas.toDataURL();
    const imageContent = imageBase64.replace(/^data:image\/png;base64,/, "");
    return imageContent;
  }

  function deleteFile(filepath) {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }

  function getFormattedSnapshot() {
    const state = getTestState();
    const snapshotData = state.snapshotState._snapshotData;

    const persistedSnapshot = snapshotData[state.currentTestName + " 1"];
    if (!persistedSnapshot) {
      return "";
    }
    const persistedSnapshotWithoutLineBreak = persistedSnapshot.replace(/\n/g, "");

    const snapshotRoot = document.createElement("div");
    snapshotRoot.innerHTML = persistedSnapshotWithoutLineBreak;
    return format(snapshotRoot.querySelector("canvas"));
  }

  return {
    test(val) {
      return val && val.tagName === "CANVAS";
    },
    print(val) {
      const state = getTestState();
      const update = state.snapshotState._updateSnapshot;
      const snapshotPath = state.snapshotState._snapshotPath;
      const normalizedTestName = state.currentTestName.replace(/\s+/g, "-");
      const imageFilePath = `${snapshotPath}.${normalizedTestName}.canvas-image.png`;
      const imageDirtyFilePath = `${snapshotPath}.${normalizedTestName}.canvas-image.dirty.png`;

      const write = filepath => fs.writeFileSync(filepath, getImageContent(val), "base64");
      const writeImage = () => write(imageFilePath);
      const writeDirtyImage = () => write(imageDirtyFilePath);
      const deleteDirtyImage = () => deleteFile(imageDirtyFilePath);

      // snapshot directory is not yet written by jest
      ensureSnapshotDir();

      const clone = val.cloneNode();
      clone.setAttribute("data-snapshot-image", hash(getImageContent(val)));
      const formatted = format(clone);

      const snapshotFormatted = getFormattedSnapshot();

      const dirty = formatted !== snapshotFormatted;
      const imageExists = fs.existsSync(imageFilePath);

      if (dirty) {
        if (update === "all") {
          writeImage();
          deleteDirtyImage();
        } else if (update === "new") {
          if (imageExists) {
            writeDirtyImage();
          } else {
            writeImage();
          }
        }
      } else {
        deleteDirtyImage();
      }

      return formatted;
    },
  };
};
