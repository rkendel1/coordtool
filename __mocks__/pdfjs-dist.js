// Jest mock for pdfjs-dist (ESM module that can't run in Jest's CommonJS environment)
const pdfjsLib = {
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: jest.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: jest.fn().mockResolvedValue({
        getViewport: jest.fn().mockReturnValue({ width: 800, height: 1000, scale: 1.5 }),
        render: jest.fn().mockReturnValue({ promise: Promise.resolve() }),
      }),
    }),
  }),
};

module.exports = pdfjsLib;
