const mockPage = {
  setContent: async () => {},
  pdf: async () => Buffer.from('mock-pdf'),
  close: async () => {},
  emulateMediaType: async () => {},
};

const mockBrowser = {
  newPage: async () => mockPage,
  close: async () => {},
};

export const launch = async () => mockBrowser;
